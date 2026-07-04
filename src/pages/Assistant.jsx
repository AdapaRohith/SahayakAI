import { useState, useRef, useEffect } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { useChat } from '../lib/queries.js'
import { api } from '../api.js'
import { useSpeech } from '../lib/useSpeech.js'
import CitationPanel from '../components/CitationPanel.jsx'
import { SectionTitle, Shield } from '../components/ui.jsx'

const LANGS = [
  { id: 'en', native: 'English' },
  { id: 'hi', native: 'हिन्दी' },
  { id: 'te', native: 'తెలుగు' },
]

const UI = {
  en: { placeholder: 'Ask about mutation, certificates, RTI, land records…', send: 'Send', listening: 'Listening…', tryAsking: 'Try asking' },
  hi: { placeholder: 'म्यूटेशन, प्रमाण पत्र, RTI, भूमि रिकॉर्ड के बारे में पूछें…', send: 'भेजें', listening: 'सुन रहा हूँ…', tryAsking: 'यह पूछकर देखें' },
  te: { placeholder: 'మ్యుటేషన్, ధృవీకరణ పత్రాలు, RTI, భూమి రికార్డుల గురించి అడగండి…', send: 'పంపండి', listening: 'వింటున్నాను…', tryAsking: 'ఇలా అడగండి' },
}

const SUGGESTIONS = [
  'What is the process for land mutation in Kadapa?',
  'How do I apply for an income certificate?',
  'How long does an RTI reply take?',
  'How do I correct a wrong entry in my land record?',
]

// Turn [1],[2] markers (if the backend adds them) into small superscripts.
function AnswerText({ text }) {
  return <p className="text-[15px] leading-relaxed text-ink-900 whitespace-pre-wrap">{text}</p>
}

export default function Assistant() {
  const { actor } = useApp()
  const chat = useChat()
  const [lang, setLang] = useState('en')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [activeRef, setActiveRef] = useState(null)
  const [panel, setPanel] = useState({ citations: [], usedChunks: [] })
  const t = UI[lang]
  const scrollRef = useRef(null)

  const { supported, listening, error: micError, start, stop } = useSpeech(lang, (transcript, isFinal) => {
    setInput(transcript)
    if (isFinal) setTimeout(() => submit(transcript), 150)
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, chat.isPending])

  // On-demand translation: whenever a non-English language is active, make sure
  // every assistant answer has a cached translation (mock backend prefixes
  // "[hi] "/"[te] " so the toggle visibly works offline).
  useEffect(() => {
    if (lang === 'en') return
    let cancelled = false
    const missing = messages.filter((m) => m.role === 'assistant' && !m.tText[lang])
    if (!missing.length) return
    ;(async () => {
      for (const m of missing) {
        try {
          const { translated } = await api.translate(m.tText.en, lang)
          if (cancelled) return
          setMessages((prev) =>
            prev.map((x) => (x.id === m.id ? { ...x, tText: { ...x.tText, [lang]: translated } } : x)),
          )
        } catch {
          /* leave English fallback */
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [lang, messages])

  async function submit(raw) {
    const text = (raw ?? input).trim()
    if (!text || chat.isPending) return
    const userMsg = { id: `u_${Date.now()}`, role: 'user', text }
    setMessages((m) => [...m, userMsg])
    setInput('')
    try {
      const res = await chat.mutateAsync({ query: text, actor })
      const citations = res.citations ?? []
      const usedChunks = res.used_chunks ?? []
      const botMsg = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        tText: { en: res.answer ?? '' },
        citations,
        usedChunks,
      }
      setMessages((m) => [...m, botMsg])
      setPanel({ citations, usedChunks })
      setActiveRef(citations[0]?.source_ref ?? null)
    } catch (err) {
      setMessages((m) => [
        ...m,
        { id: `e_${Date.now()}`, role: 'assistant', error: true, tText: { en: `Could not reach the assistant. ${err.message}` }, citations: [], usedChunks: [] },
      ])
    }
  }

  return (
    <div>
      <SectionTitle
        eyebrow="Citizen Assistant"
        title="Ask a question — get a grounded, cited answer"
        subtitle="Answers are retrieved from government policy sources (RAG) and every reply carries at least one citation. Multilingual and voice-enabled."
        right={
          <div className="flex items-center gap-1 rounded-lg bg-white border border-ink-300 p-1">
            {LANGS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLang(l.id)}
                aria-pressed={lang === l.id}
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
            {messages.length === 0 && !chat.isPending && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-800 text-white mb-4">
                  <Shield className="h-7 w-7" />
                </span>
                <h3 className="text-lg font-bold text-indigo-900">How can I help you today?</h3>
                <p className="text-sm text-ink-500 mt-1 max-w-sm">
                  I answer from verified government policy sources. Tap the mic to speak in your language.
                </p>
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
                      m.error ? 'bg-breach-bg/50 border-breach/30' : 'bg-white border-ink-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-teal-600 text-white">
                        <Shield className="h-3 w-3" />
                      </span>
                      <span className="text-xs font-bold text-indigo-900">GovAssist AI</span>
                      {!m.error && m.citations.length > 0 && (
                        <span className="chip bg-approved-bg text-approved">✓ {m.citations.length} source{m.citations.length > 1 ? 's' : ''}</span>
                      )}
                    </div>

                    <AnswerText text={m.tText[lang] ?? m.tText.en} />

                    {/* Inline citation chips (source_ref, title on hover) */}
                    {!m.error && m.citations.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {m.citations.map((c) => (
                          <button
                            key={c.source_ref}
                            title={c.source_title}
                            onClick={() => {
                              setPanel({ citations: m.citations, usedChunks: m.usedChunks })
                              setActiveRef(c.source_ref)
                            }}
                            className={`chip transition-colors ${
                              activeRef === c.source_ref
                                ? 'bg-teal-600 text-white'
                                : 'bg-teal-500/15 text-teal-700 hover:bg-teal-500/30'
                            }`}
                          >
                            {c.source_ref}
                          </button>
                        ))}
                      </div>
                    )}

                    {!m.error && (
                      <div className="mt-2.5 pt-2 border-t border-ink-100 text-[11px] text-ink-500">
                        <span className="font-semibold text-teal-700">Why trustworthy:</span> grounded in{' '}
                        {m.citations.length} retrieved policy source{m.citations.length > 1 ? 's' : ''} · logged to the audit trail.
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}

            {chat.isPending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-white border border-ink-100 px-4 py-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulseDot" />
                  <span className="text-sm text-ink-500">Retrieving grounded sources…</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          <div className="border-t border-ink-100 px-3 pt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{t.tryAsking}</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                disabled={chat.isPending}
                className="text-xs px-2.5 py-1 rounded-full border border-ink-300 hover:border-teal-500 hover:bg-teal-500/5 text-ink-700 transition-colors disabled:opacity-50"
              >
                {s.length > 42 ? `${s.slice(0, 42)}…` : s}
              </button>
            ))}
          </div>

          {/* Composer */}
          <div className="p-3">
            <div className="flex items-end gap-2">
              <button
                onClick={listening ? stop : start}
                disabled={!supported}
                title={supported ? 'Voice input' : 'Voice input not supported in this browser'}
                aria-label={listening ? 'Stop voice input' : 'Start voice input'}
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
              <button onClick={() => submit()} disabled={chat.isPending} className="btn-primary h-11 rounded-xl">
                {t.send}
              </button>
            </div>
            {micError ? (
              <p className="text-[11px] text-breach mt-1.5 px-1 flex items-center gap-1.5" role="alert">
                <span>⚠</span> {micError}
              </p>
            ) : listening ? (
              <p className="text-[11px] text-teal-700 mt-1.5 px-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600 animate-pulseDot" /> Listening — speak now.
              </p>
            ) : !supported ? (
              <p className="text-[11px] text-ink-500 mt-1.5 px-1">
                Voice uses the browser Web Speech API — available in Chrome/Edge. Type your question above.
              </p>
            ) : null}
          </div>
        </div>

        {/* Citation side panel */}
        <div className="lg:sticky lg:top-24 h-fit">
          <CitationPanel
            citations={panel.citations}
            usedChunks={panel.usedChunks}
            activeRef={activeRef}
            onSelect={setActiveRef}
          />
          <p className="text-[11px] text-ink-500 mt-3 px-1 leading-relaxed">
            Click any citation to read the retrieved source text. Every question is written to the
            audit trail — see <span className="font-semibold">Audit Trail</span>.
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
