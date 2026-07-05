import { useState, useRef, useEffect } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { useChat, useExtract } from '../lib/queries.js'
import { useSpeech } from '../lib/useSpeech.js'
import { useT } from '../lib/i18n.js'
import CitationPanel from '../components/CitationPanel.jsx'
import { SectionTitle, Shield } from '../components/ui.jsx'

const DOC_TYPES = ['aadhaar', 'income_certificate', 'land_record']

// Human labels for extracted field keys (backend returns snake_case).
function prettyKey(k) {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Turn [1],[2] markers (if the backend adds them) into small superscripts.
function AnswerText({ text }) {
  return <p className="text-[15px] leading-relaxed text-ink-900 whitespace-pre-wrap">{text}</p>
}

export default function Assistant() {
  const { actor, lang } = useApp()
  const chat = useChat()
  const extract = useExtract()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [activeRef, setActiveRef] = useState(null)
  const [panel, setPanel] = useState({ citations: [], usedChunks: [] })
  const [uploadOpen, setUploadOpen] = useState(false)
  const [docType, setDocType] = useState(DOC_TYPES[0])
  const [file, setFile] = useState(null)
  const fileInputRef = useRef(null)
  const t = useT()
  const ta = t.assistant
  const tu = ta.upload
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
      const res = await chat.mutateAsync({ query: text, actor, lang })
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

  async function runExtract() {
    if (!file || extract.isPending) return
    const fileName = file.name
    const chosenType = docType
    setMessages((m) => [...m, { id: `uf_${Date.now()}`, role: 'user', kind: 'file', text: fileName, docType: chosenType }])
    setUploadOpen(false)
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    try {
      const res = await extract.mutateAsync({ docType: chosenType, file })
      setMessages((m) => [
        ...m,
        {
          id: `ex_${Date.now()}`,
          role: 'assistant',
          kind: 'extract',
          docType: res.doc_type ?? chosenType,
          fileName: res.source_file ?? fileName,
          fields: res.fields ?? {},
          engine: res.engine,
        },
      ])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { id: `exe_${Date.now()}`, role: 'assistant', error: true, text: tu.error(err.message), citations: [], usedChunks: [] },
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
              <div className="h-full flex flex-col items-center justify-center text-center px-6 animate-fadeUp rounded-xl bg-gradient-to-br from-indigo-100/70 via-purple-50 to-rose-100/60">
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
                  {m.kind === 'file' ? (
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent-700 text-white px-4 py-2.5 flex items-center gap-2.5">
                      <PaperclipIcon />
                      <span className="min-w-0">
                        <span className="block text-[14px] font-semibold truncate">{m.text}</span>
                        <span className="block text-[11px] text-white/80">{tu.types[m.docType] || m.docType}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent-700 text-white px-4 py-2.5 text-[15px]">
                      {m.text}
                    </div>
                  )}
                </div>
              ) : m.kind === 'extract' ? (
                <div key={m.id} className="flex justify-start animate-fadeUp">
                  <div className="max-w-[92%] rounded-2xl rounded-bl-sm px-4 py-3 border bg-white border-ink-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-ink-900 text-white">
                        <Shield className="h-3 w-3" />
                      </span>
                      <span className="text-xs font-bold text-ink-900">{ta.botName}</span>
                      <span className="chip bg-approved-bg text-approved">{tu.types[m.docType] || m.docType}</span>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-1.5">{tu.resultTitle}</div>
                    {Object.keys(m.fields).length === 0 ? (
                      <p className="text-sm text-ink-500">—</p>
                    ) : (
                      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                        {Object.entries(m.fields).map(([k, v]) => (
                          <div key={k} className="contents">
                            <dt className="text-xs text-ink-500">{prettyKey(k)}</dt>
                            <dd className="text-sm font-semibold text-ink-900 break-words">{String(v)}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {m.engine && (
                      <div className="mt-2.5 pt-2 border-t border-ink-100 text-[11px] text-ink-500">{tu.engine(m.engine)}</div>
                    )}
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

            {(chat.isPending || extract.isPending) && (
              <div className="flex justify-start animate-fadeUp">
                <div className="rounded-2xl rounded-bl-sm bg-white border border-ink-200 px-4 py-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent-600 animate-pulseDot" />
                  <span className="text-sm text-ink-500">{extract.isPending ? tu.extracting : ta.retrieving}</span>
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

          {/* Upload tray — pick a document type and file, then extract fields */}
          {uploadOpen && (
            <div className="border-t border-ink-100 px-3 py-3 bg-ink-50 animate-fadeUp">
              <div className="flex items-center gap-2 mb-2">
                <PaperclipIcon className="h-4 w-4 text-accent-700" />
                <span className="text-sm font-semibold text-ink-900">{tu.title}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto] items-end">
                <div>
                  <label className="field-label">{tu.docTypeLabel}</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                  >
                    {DOC_TYPES.map((d) => (
                      <option key={d} value={d}>{tu.types[d]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">{tu.choose}</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-ink-700 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-900 file:px-3 file:py-2 file:text-white file:text-sm file:font-semibold hover:file:bg-ink-800"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setUploadOpen(false); setFile(null) }} className="btn-ghost h-[38px]">{tu.cancel}</button>
                  <button onClick={runExtract} disabled={!file || extract.isPending} className="btn-teal h-[38px]">
                    {extract.isPending ? tu.extracting : tu.extract}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-ink-500 mt-2">{tu.hint}</p>
            </div>
          )}

          {/* Composer */}
          <div className="p-3">
            <div className="flex items-end gap-2">
              <button
                onClick={() => setUploadOpen((v) => !v)}
                title={tu.attach}
                aria-label={tu.attach}
                aria-pressed={uploadOpen}
                className={`btn h-11 w-11 shrink-0 rounded-xl p-0 border ${
                  uploadOpen ? 'bg-accent-700 text-white border-accent-700' : 'bg-white text-ink-700 border-ink-300 hover:border-accent-600 hover:text-accent-800'
                }`}
              >
                <PaperclipIcon />
              </button>
              <button
                data-guide="mic"
                onClick={listening ? stop : start}
                disabled={!supported}
                title={supported ? ta.voiceInput : ta.voiceNotSupported}
                aria-label={listening ? ta.voiceStop : ta.voiceStart}
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
        <div data-guide="sources" className="lg:sticky lg:top-28 h-fit">
          {/* Hero illustration — matches the reference design */}
          <div className="card overflow-hidden mb-4 hidden lg:block">
            <img
              src="/hero-illustration.png"
              alt=""
              aria-hidden="true"
              className="w-full h-auto object-cover"
            />
          </div>
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

function PaperclipIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.5l-8.5 8.5a5 5 0 01-7-7l9-9a3.5 3.5 0 015 5l-9 9a2 2 0 01-3-3l8.5-8.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
