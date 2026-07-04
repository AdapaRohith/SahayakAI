import { useState, useRef, useEffect, Fragment } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { KB, getSource } from '../data/seed.js'
import { useSpeech } from '../lib/useSpeech.js'
import CitationPanel from '../components/CitationPanel.jsx'
import { SectionTitle, CiteChip, Shield } from '../components/ui.jsx'

const LANGS = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { id: 'te', label: 'Telugu', native: 'తెలుగు' },
]

const UI = {
  en: { placeholder: 'Ask about certificates, ration cards, RTI, land records…', send: 'Send', you: 'You', listening: 'Listening…', tryAsking: 'Try asking', unverified: 'Unverified — not issued as official guidance', why: 'Why you can trust this' },
  hi: { placeholder: 'प्रमाण पत्र, राशन कार्ड, RTI, भूमि रिकॉर्ड के बारे में पूछें…', send: 'भेजें', you: 'आप', listening: 'सुन रहा हूँ…', tryAsking: 'यह पूछकर देखें', unverified: 'असत्यापित — आधिकारिक मार्गदर्शन के रूप में जारी नहीं', why: 'आप इस पर भरोसा क्यों कर सकते हैं' },
  te: { placeholder: 'ధృవీకరణ పత్రాలు, రేషన్ కార్డు, RTI, భూమి రికార్డుల గురించి అడగండి…', send: 'పంపండి', you: 'మీరు', listening: 'వింటున్నాను…', tryAsking: 'ఇలా అడగండి', unverified: 'ధృవీకరించబడలేదు — అధికారిక మార్గదర్శకంగా జారీ చేయలేదు', why: 'దీన్ని ఎందుకు నమ్మవచ్చు' },
}

// Very small "retriever": match query text against KB entries; fall back to
// the ungrounded/unverified entry when nothing matches with confidence.
function retrieve(query) {
  const q = query.toLowerCase()
  let best = null
  let bestScore = 0
  for (const kb of KB) {
    const score = kb.match.reduce((acc, m) => (q.includes(m) ? acc + m.length : acc), 0)
    if (score > bestScore) { bestScore = score; best = kb }
  }
  if (best && bestScore > 0) return best
  // No grounded match -> return the deliberately-unverified template so the
  // refusal behaviour is always reachable.
  return KB.find((k) => !k.grounded)
}

// Render an answer string, turning [1],[2]… markers into interactive CiteChips.
function AnswerText({ text, sources, onCite, activeIndex }) {
  const parts = text.split(/(\[\d+\])/g)
  return (
    <p className="text-[15px] leading-relaxed text-ink-900">
      {parts.map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/)
        if (m) {
          const n = parseInt(m[1], 10)
          return <CiteChip key={i} n={n} active={activeIndex === n - 1} onClick={() => onCite(n - 1)} />
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </p>
  )
}

export default function Assistant() {
  const { log } = useApp()
  const [lang, setLang] = useState('en')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [activeCite, setActiveCite] = useState({ msgId: null, index: null })
  const [panel, setPanel] = useState({ sources: [], unverified: false })
  const t = UI[lang]
  const scrollRef = useRef(null)

  const { supported, listening, start, stop } = useSpeech(lang, (transcript, isFinal) => {
    setInput(transcript)
    if (isFinal) setTimeout(() => submit(transcript), 150)
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function submit(raw) {
    const text = (raw ?? input).trim()
    if (!text) return
    const kb = retrieve(text)
    const answer = kb.answer[lang]
    const userMsg = { id: `u_${Date.now()}`, role: 'user', text }
    const botMsg = {
      id: `a_${Date.now()}`,
      role: 'assistant',
      text: answer,
      sources: kb.citations,
      grounded: kb.grounded,
      kbId: kb.id,
    }
    setMessages((m) => [...m, userMsg, botMsg])
    setInput('')
    setPanel({ sources: kb.citations, unverified: !kb.grounded })
    setActiveCite({ msgId: botMsg.id, index: kb.grounded ? 0 : null })

    // Write to the immutable audit trail — verified answers vs flagged refusals.
    if (kb.grounded) {
      log({
        actor: 'AI · SahayakAI',
        action: 'query_answered',
        summary: `Answered citizen query "${text.slice(0, 60)}"`,
        sources: kb.citations,
        meta: { verified: true, lang },
      })
    } else {
      log({
        actor: 'AI · SahayakAI',
        action: 'query_flagged',
        summary: `Flagged UNVERIFIED citizen query "${text.slice(0, 60)}" — no grounded source`,
        sources: [],
        meta: { verified: false, lang },
      })
    }
  }

  const suggestions = KB.filter((k) => k.grounded).slice(0, 3).concat(KB.find((k) => !k.grounded))

  return (
    <div>
      <SectionTitle
        eyebrow="Citizen Assistant"
        title="Ask a question — get a grounded, cited answer"
        subtitle="Multilingual and voice-enabled. Every claim is backed by a statute or circular. If we can't ground an answer, we say so instead of guessing."
        right={
          <div className="flex items-center gap-1 rounded-lg bg-white border border-ink-300 p-1">
            {LANGS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLang(l.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                  lang === l.id ? 'bg-indigo-800 text-white' : 'text-ink-700 hover:bg-ink-100'
                }`}
              >
                {l.native}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Chat column */}
        <div className="card flex flex-col h-[70vh] min-h-[520px] overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-slim p-4 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-800 text-white mb-4">
                  <Shield className="h-7 w-7" />
                </span>
                <h3 className="text-lg font-bold text-indigo-900">How can I help you today?</h3>
                <p className="text-sm text-ink-500 mt-1 max-w-sm">
                  I answer only from verified government sources. Tap the mic to speak in your language.
                </p>
                <div className="mt-5 w-full max-w-md">
                  <div className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-2">{t.tryAsking}</div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => submit(s.q[lang])}
                        className="text-left text-sm px-3 py-1.5 rounded-lg border border-ink-300 hover:border-teal-500 hover:bg-teal-500/5 transition-colors"
                      >
                        {s.q[lang]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-800 text-white px-4 py-2.5 text-[15px]">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start">
                  <div
                    className={`max-w-[92%] rounded-2xl rounded-bl-sm px-4 py-3 border ${
                      m.grounded ? 'bg-white border-ink-100' : 'bg-breach-bg/50 border-breach/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-teal-600 text-white">
                        <Shield className="h-3 w-3" />
                      </span>
                      <span className="text-xs font-bold text-indigo-900">SahayakAI</span>
                      {m.grounded ? (
                        <span className="chip bg-approved-bg text-approved">✓ Grounded</span>
                      ) : (
                        <span className="chip bg-breach-bg text-breach">⚠ Unverified</span>
                      )}
                    </div>

                    <div
                      onClick={() => {
                        setPanel({ sources: m.sources, unverified: !m.grounded })
                        setActiveCite({ msgId: m.id, index: m.grounded ? 0 : null })
                      }}
                    >
                      <AnswerText
                        text={m.text}
                        sources={m.sources}
                        activeIndex={activeCite.msgId === m.id ? activeCite.index : null}
                        onCite={(idx) => {
                          setPanel({ sources: m.sources, unverified: !m.grounded })
                          setActiveCite({ msgId: m.id, index: idx })
                        }}
                      />
                    </div>

                    {!m.grounded && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-breach">
                        <span>⚠</span> {t.unverified}
                      </div>
                    )}

                    {/* Explainability one-liner */}
                    <div className="mt-2.5 pt-2 border-t border-ink-100 text-[11px] text-ink-500">
                      {m.grounded ? (
                        <span>
                          <span className="font-semibold text-teal-700">Why trustworthy:</span> grounded in{' '}
                          {m.sources.map((s, i) => (
                            <span key={s}>
                              {i > 0 && ', '}
                              <span className="font-semibold text-ink-700">{getSource(s)?.ref}</span>
                            </span>
                          ))}{' '}· logged to the audit trail.
                        </span>
                      ) : (
                        <span>
                          <span className="font-semibold text-breach">Why flagged:</span> no matching source in the
                          verified library · refusal logged to the audit trail.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-ink-100 p-3">
            <div className="flex items-end gap-2">
              <button
                onClick={listening ? stop : start}
                disabled={!supported}
                title={supported ? 'Voice input' : 'Voice input not supported in this browser'}
                className={`btn h-11 w-11 shrink-0 rounded-xl p-0 ${
                  listening ? 'bg-breach text-white animate-pulseDot' : 'bg-teal-600 text-white hover:bg-teal-700'
                } disabled:bg-ink-300`}
              >
                <MicIcon />
              </button>
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
                }}
                placeholder={listening ? t.listening : t.placeholder}
                className="flex-1 resize-none rounded-xl border border-ink-300 px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-indigo-600 max-h-32"
              />
              <button onClick={() => submit()} className="btn-primary h-11 rounded-xl">
                {t.send}
              </button>
            </div>
            {!supported && (
              <p className="text-[11px] text-ink-500 mt-1.5 px-1">
                Voice uses the browser Web Speech API — available in Chrome/Edge. Type your question above.
              </p>
            )}
          </div>
        </div>

        {/* Citation side panel */}
        <div className="lg:sticky lg:top-24 h-fit">
          <CitationPanel
            sourceIds={panel.sources}
            unverified={panel.unverified}
            activeIndex={activeCite.index}
          />
          <p className="text-[11px] text-ink-500 mt-3 px-1 leading-relaxed">
            Every answer above is written to the immutable audit trail as either a verified
            citation or an unverified flag — visit <span className="font-semibold">Audit Trail</span> to see it.
          </p>
        </div>
      </div>
    </div>
  )
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" strokeLinecap="round" />
    </svg>
  )
}
