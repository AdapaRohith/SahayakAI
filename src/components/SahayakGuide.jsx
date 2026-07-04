import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext.jsx'
import { useT } from '../lib/i18n.js'

// ---------------------------------------------------------------------------
// Sahayak Guide — a purely additive, voice-driven walkthrough overlay for
// low-literacy / non-English citizens. It SPEAKS each instruction aloud and
// HIGHLIGHTS the element to tap next; it never taps for the user.
//
//  - Language follows the app's existing selector (en/hi/te -> en-IN/hi-IN/te-IN).
//  - Browser Web Speech API only: SpeechSynthesis to speak, SpeechRecognition
//    to listen for a tiny keyword set. No backend, no storage.
//  - Degrades gracefully: every instruction is always shown as large caption
//    text and every choice is always tappable, so it works with sound off, in a
//    noisy room, or when a voice/mic isn't available.
//
// Elements are located by `data-guide="mic|sources|nav"` markers that the host
// screens expose — invisible hooks that don't change their look or behaviour.
// ---------------------------------------------------------------------------

const LANG_CODES = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN' }

// Only a handful of keywords are recognised (not open conversation), across the
// three languages plus the spoken/typed digits.
const INTENT_KEYWORDS = {
  ask: ['one', '1', 'ask', 'scheme', 'first', 'एक', 'पहला', 'पूछ', 'योजना', 'सवाल', 'ఒకటి', 'మొదటి', 'అడుగు', 'పథకం', 'ప్రశ్న'],
  apply: ['two', '2', 'apply', 'certificate', 'second', 'दो', 'दूसरा', 'आवेदन', 'प्रमाण', 'రెండు', 'రెండవ', 'దరఖాస్తు', 'ధృవీకరణ', 'పత్రం'],
}

function matchIntent(transcript) {
  const s = (transcript || '').toLowerCase()
  const hit = (list) => list.some((k) => s.includes(k.toLowerCase()))
  if (hit(INTENT_KEYWORDS.ask)) return 'ask'
  if (hit(INTENT_KEYWORDS.apply)) return 'apply'
  return null
}

// Which existing element each step points the spotlight at.
const TARGET = {
  askMic: '[data-guide="mic"]',
  applyMic: '[data-guide="mic"]',
  askAnswer: '[data-guide="sources"]',
  applyFiled: '[data-guide="nav"]',
}

// Step advanced by the on-screen "Next" button (always works, mic optional).
const NEXT = { askMic: 'askAnswer', askAnswer: 'close', applyMic: 'applyFiled', applyFiled: 'close' }

// Tracks the on-screen box of the highlighted element, following scroll/layout.
function useSpotlight(selector) {
  const [rect, setRect] = useState(null)
  const scrolledFor = useRef(null)

  useEffect(() => {
    if (!selector) {
      setRect(null)
      return
    }
    let alive = true
    const measure = () => {
      if (!alive) return
      const el = document.querySelector(selector)
      if (!el) {
        setRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      // Bring the target into view once per selector so the glow is visible.
      if (scrolledFor.current !== selector) {
        scrolledFor.current = selector
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    measure()
    const id = setInterval(measure, 250) // catches lazy-mounted pages + reflow
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      alive = false
      clearInterval(id)
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [selector])

  return rect
}

export default function SahayakGuide() {
  const { lang } = useApp()
  const t = useT()
  const g = t.guide
  const navigate = useNavigate()

  const [active, setActive] = useState(false)
  const [step, setStep] = useState('menu') // menu | askMic | askAnswer | applyMic | applyFiled | close
  const [listening, setListening] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [voices, setVoices] = useState([])

  // Refs so async speech/recognition callbacks read the latest state.
  const activeRef = useRef(active)
  const stepRef = useRef(step)
  activeRef.current = active
  stepRef.current = step

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  const recRef = useRef(null)

  // --- Voices (getVoices is async in most browsers) ---
  useEffect(() => {
    if (!synth) return
    const load = () => setVoices(synth.getVoices() || [])
    load()
    synth.addEventListener?.('voiceschanged', load)
    return () => synth.removeEventListener?.('voiceschanged', load)
  }, [synth])

  const voiceAvailable = useMemo(() => {
    const base = (LANG_CODES[lang] || 'en-IN').split('-')[0]
    return voices.some((v) => (v.lang || '').toLowerCase().startsWith(base))
  }, [voices, lang])

  // --- Speak (always paired with an on-screen caption) ---
  const speak = useCallback(
    (text, onEnd) => {
      if (!synth || !text) {
        onEnd?.()
        return
      }
      try {
        synth.cancel()
      } catch {
        /* noop */
      }
      const code = LANG_CODES[lang] || 'en-IN'
      const base = code.split('-')[0]
      const u = new SpeechSynthesisUtterance(text)
      u.lang = code
      const v =
        voices.find((x) => x.lang === code) ||
        voices.find((x) => (x.lang || '').toLowerCase().startsWith(base))
      if (v) u.voice = v // else: speak in whatever the browser has, caption still shows
      u.rate = 0.95
      u.onend = () => onEnd?.()
      u.onerror = () => onEnd?.()
      try {
        synth.speak(u)
      } catch {
        onEnd?.()
      }
    },
    [synth, lang, voices],
  )

  // --- Listen for one keyword answer, then stop ---
  const stopListening = useCallback(() => {
    const rec = recRef.current
    if (rec) {
      rec.onresult = rec.onerror = rec.onend = rec.onstart = null
      try {
        rec.abort()
      } catch {
        /* noop */
      }
    }
    recRef.current = null
    setListening(false)
  }, [])

  const listen = useCallback(
    (onIntent) => {
      const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!Ctor || !window.isSecureContext) {
        onIntent(null) // not supported → caller falls back to on-screen buttons
        return
      }
      stopListening()
      let rec
      try {
        rec = new Ctor()
      } catch {
        onIntent(null)
        return
      }
      recRef.current = rec
      rec.lang = LANG_CODES[lang] || 'en-IN'
      rec.interimResults = false
      rec.maxAlternatives = 1
      rec.continuous = false

      let done = false
      const finish = (intent) => {
        if (done) return
        done = true
        clearTimeout(timer)
        stopListening()
        onIntent(intent)
      }
      rec.onstart = () => setListening(true)
      rec.onresult = (e) => {
        let tr = ''
        for (let i = 0; i < e.results.length; i++) tr += e.results[i][0].transcript
        finish(matchIntent(tr))
      }
      rec.onerror = () => finish(null)
      rec.onend = () => finish(null)
      const timer = setTimeout(() => finish(null), 8000) // don't get stuck
      try {
        rec.start()
      } catch {
        finish(null)
      }
    },
    [lang, stopListening],
  )

  // --- Step transitions ---
  const go = useCallback(
    (next) => {
      setShowHint(false)
      if (next === 'askMic' || next === 'applyMic') navigate('/assistant')
      setStep(next)
    },
    [navigate],
  )

  const start = useCallback(() => {
    setShowHint(false)
    setStep('menu')
    setActive(true)
  }, [])

  const stop = useCallback(() => {
    setActive(false)
    setListening(false)
    setShowHint(false)
    setStep('menu')
    stopListening()
    try {
      synth?.cancel()
    } catch {
      /* noop */
    }
  }, [stopListening, synth])

  // Drive each step: speak the caption, then (for the menu) listen for a choice.
  const captionFor = (s) =>
    ({ menu: g.menu, askMic: g.askMic, askAnswer: g.askAnswer, applyMic: g.applyMic, applyFiled: g.applyFiled, close: g.close }[s] || '')

  useEffect(() => {
    if (!active) return
    setShowHint(false)
    stopListening()
    speak(captionFor(step), () => {
      if (!activeRef.current || stepRef.current !== step) return
      if (step === 'menu') {
        listen((intent) => {
          if (!activeRef.current || stepRef.current !== 'menu') return
          if (intent === 'ask') go('askMic')
          else if (intent === 'apply') go('applyMic')
          else setShowHint(true) // unclear/timeout → invite tapping instead
        })
      }
    })
    // Re-run when the step or language changes (re-speaks in the new language).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, step, lang])

  // Cleanup on unmount.
  useEffect(
    () => () => {
      stopListening()
      try {
        synth?.cancel()
      } catch {
        /* noop */
      }
    },
    [stopListening, synth],
  )

  const spotSel = active ? TARGET[step] || null : null
  const rect = useSpotlight(spotSel)

  return (
    <>
      {/* Spotlight ring around the element to tap (non-interactive so the real
          element underneath stays fully tappable). */}
      {active && rect && (
        <div
          className="fixed z-[95] pointer-events-none transition-all duration-300"
          style={{ top: rect.top - 10, left: rect.left - 10, width: rect.width + 20, height: rect.height + 20 }}
        >
          <span className="absolute inset-0 rounded-2xl ring-4 ring-accent-500/80 animate-pulse" />
          <span className="absolute inset-0 rounded-2xl ring-2 ring-accent-300 shadow-[0_0_0_9999px_rgba(2,6,23,0.04)]" />
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent-700 text-white text-xs font-bold px-3 py-1 shadow-lg">
            👇 {g.here}
          </span>
        </div>
      )}

      {/* Caption bar + choices (always visible & tappable while active). */}
      {active && (
        <div className="fixed inset-x-0 bottom-4 z-[96] flex justify-center px-3 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-xl rounded-2xl border border-ink-200 bg-white/95 backdrop-blur-xl shadow-[0_10px_40px_rgba(2,6,23,0.18)] p-4 animate-fadeUp">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-700 text-white text-lg">
                🎧
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[17px] leading-snug font-semibold text-ink-950">{captionFor(step)}</p>

                {listening && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-accent-800">
                    <span className="h-2 w-2 rounded-full bg-accent-600 animate-pulseDot" /> {g.listening}
                  </div>
                )}
                {!voiceAvailable && (
                  <p className="mt-1.5 text-[11px] text-ink-500">{g.voiceFallback}</p>
                )}
                {showHint && step === 'menu' && (
                  <p className="mt-1.5 text-[11px] font-semibold text-pending">{g.tapHint}</p>
                )}

                {/* Step controls */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {step === 'menu' ? (
                    <>
                      <button onClick={() => go('askMic')} className="btn-primary text-sm py-2">
                        {g.optAsk}
                      </button>
                      <button onClick={() => go('applyMic')} className="btn-teal text-sm py-2">
                        {g.optApply}
                      </button>
                    </>
                  ) : step === 'close' ? (
                    <button onClick={stop} className="btn-primary text-sm py-2">
                      {g.done}
                    </button>
                  ) : (
                    <button onClick={() => go(NEXT[step])} className="btn-primary text-sm py-2">
                      {g.next} →
                    </button>
                  )}
                  <button onClick={stop} className="btn-ghost text-sm py-2 ml-auto">
                    ✕ {g.stop}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating trigger — gently pulsing, label follows the language. */}
      <button
        onClick={active ? stop : start}
        aria-label={active ? g.stop : g.button}
        className={`fixed bottom-6 right-6 z-[97] flex items-center gap-2 rounded-full px-5 py-3.5 font-bold text-white shadow-[0_10px_30px_rgba(2,6,23,0.25)] transition-all duration-200 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-600 ${
          active ? 'bg-ink-900' : 'bg-accent-700 hover:bg-accent-800'
        }`}
      >
        {!active && <span aria-hidden className="absolute inset-0 rounded-full bg-accent-600 animate-ping opacity-30" />}
        <span className="relative text-lg leading-none">{active ? '✕' : '🎧'}</span>
        <span className="relative text-sm">{active ? g.stop : g.button}</span>
      </button>
    </>
  )
}
