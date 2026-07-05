import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import { useApp } from '../store/AppContext.jsx'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis.js'
import { api } from '../api.js'
import { getPageContext, resolveTarget } from '../utils/pageContext.js'

// Popup languages, in the order requested.
const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'te', label: 'Telugu' },
  { id: 'hi', label: 'Hindi' },
]

const STATUS_TEXT = {
  ready: 'Ready',
  listening: 'Listening…',
  processing: 'Processing…',
  speaking: 'Speaking…',
}

const ERROR_TEXT = {
  'no-speech': "Couldn't hear you. Please try again.",
  error: "Couldn't hear you. Please try again.",
  unsupported: 'Voice input is not supported in this browser. Try Chrome or Edge.',
  permission: 'Microphone access is blocked. Please allow microphone access in your browser settings and try again.',
  openai: 'Unable to reach the AI assistant.',
}

// Smoothly reveal an element: driver.js scrolls it into view, then spotlights it.
function highlightElement(el, description) {
  try {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  } catch {
    /* noop */
  }
  const d = driver({ smoothScroll: true, animate: true, allowClose: true, showProgress: false })
  d.highlight({ element: el, popover: description ? { description } : undefined })
}

export default function VoiceAssistant({ open, onClose }) {
  const reduce = useReducedMotion()
  const { lang: appLang } = useApp()
  const [language, setLanguage] = useState(LANGUAGES.some((l) => l.id === appLang) ? appLang : 'en')
  const [phase, setPhase] = useState('ready') // ready | listening | processing | speaking | error
  const [errorMsg, setErrorMsg] = useState('')

  const { supported: recSupported, listening, start, stop } = useSpeechRecognition()
  const { speak } = useSpeechSynthesis()

  const busy = phase === 'processing' || phase === 'speaking'
  const statusText = phase === 'error' ? errorMsg : STATUS_TEXT[phase]

  async function handleTranscript(transcript) {
    setPhase('processing')
    try {
      const context = getPageContext()
      const raw = await api.guide(context, transcript, language)
      // Normalise the backend payload to the shape the UI expects.
      const instruction = {
        reply: typeof raw?.reply === 'string' ? raw.reply : '',
        action: raw?.action === 'highlight' ? 'highlight' : 'none',
        target: raw?.target == null ? null : String(raw.target),
      }

      if (instruction.reply) {
        setPhase('speaking')
        speak(instruction.reply, language, { onEnd: () => setPhase('ready') })
      } else {
        setPhase('ready')
      }

      if (instruction.action === 'highlight' && instruction.target) {
        const el = resolveTarget(instruction.target)
        if (el) highlightElement(el, instruction.reply)
      }
    } catch (err) {
      // Surface the real cause in the console for debugging (network/CORS,
      // backend error, etc.); users still see the friendly message.
      console.error('[AI Voice Guide] backend /guide request failed:', err)
      setPhase('error')
      setErrorMsg(ERROR_TEXT.openai)
    }
  }

  function handleMic() {
    if (busy) return
    if (listening) {
      stop()
      setPhase('ready')
      return
    }
    setErrorMsg('')
    setPhase('listening')
    start(language, {
      onResult: (transcript) => handleTranscript(transcript),
      onError: (type) => {
        setPhase('error')
        setErrorMsg(ERROR_TEXT[type] || ERROR_TEXT.error)
      },
    })
  }

  const panelMotion = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, y: 12, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
        exit: { opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
      }

  return (
    <AnimatePresence>
      {open && (
    <motion.div
      key="voice-guide"
      role="dialog"
      aria-label="AI Voice Guide"
      style={{ transformOrigin: 'bottom right' }}
      {...panelMotion}
      className="fixed bottom-[88px] right-6 z-[98] w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-ink-200 bg-white shadow-[0_12px_40px_rgba(2,6,23,0.18)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div>
          <h2 className="text-base font-bold text-ink-950">AI Voice Guide</h2>
          <p className="text-xs text-ink-500 mt-0.5">Speak in your preferred language.</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 transition-colors"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Language selector */}
      <div className="px-4 mt-3">
        <div className="flex items-center gap-1 rounded-full bg-ink-100 p-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => setLanguage(l.id)}
              className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold transition-colors ${
                language === l.id ? 'bg-accent-700 text-white shadow-sm' : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mic + status */}
      <div className="flex flex-col items-center px-4 py-5">
        <button
          onClick={handleMic}
          disabled={busy || !recSupported}
          aria-label={listening ? 'Stop listening' : 'Start listening'}
          className={`flex h-[72px] w-[72px] items-center justify-center rounded-full text-white transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-600 disabled:opacity-50 disabled:cursor-not-allowed ${
            listening ? 'bg-accent-800 ring-4 ring-accent-200' : 'bg-accent-700 hover:bg-accent-800'
          }`}
        >
          <MicIcon />
        </button>
        <div
          className={`mt-3 flex items-center gap-1.5 text-sm font-semibold ${
            phase === 'error' ? 'text-breach' : phase === 'ready' ? 'text-ink-600' : 'text-accent-800'
          }`}
          role="status"
          aria-live="polite"
        >
          {(phase === 'listening' || phase === 'processing' || phase === 'speaking') && (
            <span className="h-2 w-2 rounded-full bg-accent-600 animate-pulseDot" />
          )}
          <span className={phase === 'error' ? 'text-center leading-snug' : ''}>{statusText}</span>
        </div>
      </div>
    </motion.div>
      )}
    </AnimatePresence>
  )
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  )
}
