import { useState, useRef, useEffect } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { useChat } from '../lib/queries.js'
import { useSpeech } from '../lib/useSpeech.js'
import { useT } from '../lib/i18n.js'
import CitationPanel from '../components/CitationPanel.jsx'
import { SectionTitle, Shield } from '../components/ui.jsx'

// Turn [1],[2] markers (if the backend adds them) into small superscripts.
function AnswerText({ text }) {
  return <p className="text-[15px] leading-relaxed text-ink-900 whitespace-pre-wrap">{text}</p>
}

export default function Assistant() {
  const { actor, lang } = useApp()
  const chat = useChat()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [activeRef, setActiveRef] = useState(null)
  const [panel, setPanel] = useState({ citations: [], usedChunks: [] })
  const t = useT()
  const ta = t.assistant
  const scrollRef = useRef(null)

  const { supported, listening, error: micError, start, stop } = useSpeech(lang, (transcript, isFinal) => {
    setInput(transcript)
    if (isFinal) setTimeout(() => submit(transcript), 150)
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, chat.isPending])

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
        text: res.answer ?? '',
        citations,
        usedChunks,
      }
      setMessages((m) => [...m, botMsg])
      setPanel({ citations, usedChunks })
      setActiveRef(citations[0]?.source_ref ?? null)
    } catch (err) {
      setMessages((m) => [
        ...m,
        { id: `e_${Date.now()}`, role: 'assistant', error: true, text: ta.errorReach(err.message), citations: [], usedChunks: [] },
      ])
    }
  }

  return (
    <div>
      <SectionTitle
        eyebrow={ta.eyebrow}
        title={ta.title}
        subtitle={ta.subtitle}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Chat column */}
        <div className="card flex flex-col h-[70vh] min-h-[520px] overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-slim p-4 space-y-4">
            {messages.length === 0 && !chat.isPending && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 animate-fadeUp">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-600 text-white mb-4 shadow-sm">
                  <Shield className="h-7 w-7" />
                </span>
                <h3 className="text-lg font-bold text-ink-950">{ta.emptyTitle}</h3>
                <p className="text-sm text-ink-500 mt-1 max-w-sm">
                  {ta.emptySub}
                </p>
              </div>
            )}

            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end animate-fadeUp">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent-700 text-white px-4 py-2.5 text-[15px]">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start animate-fadeUp">
                  <div
                    className={`max-w-[92%] rounded-2xl rounded-bl-sm px-4 py-3 border ${
                      m.error ? 'bg-breach-bg/50 border-breach/30' : 'bg-white border-ink-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-ink-900 text-white">
                        <Shield className="h-3 w-3" />
                      </span>
                      <span className="text-xs font-bold text-ink-900">{ta.botName}</span>
                      {!m.error && m.citations.length > 0 && (
                        <span className="chip bg-approved-bg text-approved">{ta.sources(m.citations.length)}</span>
                      )}
                    </div>

                    <AnswerText text={m.text} />

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
                            className={`chip transition-colors duration-150 ${
                              activeRef === c.source_ref
                                ? 'bg-accent-700 text-white'
                                : 'bg-accent-50 text-accent-800 hover:bg-accent-100'
                            }`}
                          >
                            {c.source_ref}
                          </button>
                        ))}
                      </div>
                    )}

                    {!m.error && (
                      <div className="mt-2.5 pt-2 border-t border-ink-100 text-[11px] text-ink-500">
                        <span className="font-semibold text-accent-800">{ta.whyLabel}</span> {ta.whyBody(m.citations.length)}
                      </div>
                    )}
                  </div>
                </div>
              ),
            )}

            {chat.isPending && (
              <div className="flex justify-start animate-fadeUp">
                <div className="rounded-2xl rounded-bl-sm bg-white border border-ink-200 px-4 py-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent-600 animate-pulseDot" />
                  <span className="text-sm text-ink-500">{ta.retrieving}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          <div className="border-t border-ink-100 px-3 pt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{ta.tryAsking}</span>
            {ta.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                disabled={chat.isPending}
                className="text-xs px-2.5 py-1 rounded-full border border-ink-300 hover:border-accent-500 hover:bg-accent-50 hover:text-accent-800 text-ink-700 transition-colors disabled:opacity-40"
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
                className={`btn relative h-11 w-11 shrink-0 rounded-xl p-0 overflow-visible ${
                  listening ? 'bg-accent-800 text-white' : 'bg-accent-700 text-white hover:bg-accent-800'
                } disabled:bg-ink-300`}
              >
                {listening && (
                  <span aria-hidden className="absolute inset-0 rounded-xl bg-accent-600 animate-ring" />
                )}
                <span className="relative"><MicIcon /></span>
              </button>
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
                }}
                placeholder={listening ? ta.listening : ta.placeholder}
                className="flex-1 resize-none rounded-xl border border-ink-300 px-3.5 py-2.5 text-[15px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus:border-accent-600 transition-colors max-h-32"
              />
              <button onClick={() => submit()} disabled={chat.isPending} className="btn-primary h-11 rounded-xl">
                {ta.send}
              </button>
            </div>
            {micError ? (
              <p className="text-[11px] text-breach mt-1.5 px-1 flex items-center gap-1.5" role="alert">
                <span>⚠</span> {micError}
              </p>
            ) : listening ? (
              <p className="text-[11px] text-accent-800 mt-1.5 px-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-600 animate-pulseDot" /> {ta.listenNow}
              </p>
            ) : !supported ? (
              <p className="text-[11px] text-ink-500 mt-1.5 px-1">
                {ta.voiceUnsupported}
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
            {ta.citationNote} <span className="font-semibold text-ink-800">{ta.auditTrailLink}</span>.
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
