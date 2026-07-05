import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useApp } from '../store/AppContext.jsx'
import { useChat, useExtract, useTemplates, useAutofill } from '../lib/queries.js'
import { useSpeech } from '../lib/useSpeech.js'
import { useT } from '../lib/i18n.js'
import { api } from '../api.js'
import CitationPanel from '../components/CitationPanel.jsx'
import { SectionTitle, Shield } from '../components/ui.jsx'

const DOC_TYPES = ['aadhaar', 'income_certificate', 'land_record']

// Pick the template that best matches the uploaded document type; fall back to
// the first available template so the "generate document" button always works.
function templateForDocType(templates, docType) {
  const match = {
    income_certificate: /income/i,
    land_record: /record|mutation|land/i,
    aadhaar: /income|certificate/i,
  }[docType]
  return (match && templates.find((t) => match.test(t.name))) || templates[0] || null
}

// Only allow http(s) hrefs — blocks javascript:/data:/etc. schemes sneaking in
// through a backend-supplied pdf_url (defends against a tampered chat response).
function isSafeHttpUrl(u) {
  try {
    const p = new URL(u, window.location.origin)
    return p.protocol === 'http:' || p.protocol === 'https:'
  } catch {
    return false
  }
}

// Confirm a base64 blob is actually a PDF (starts with "%PDF-") before we render
// it in an iframe, so a data: URL can't be abused to inject phishing content.
function looksLikePdf(b64) {
  try {
    return atob(String(b64).slice(0, 12)).startsWith('%PDF-')
  } catch {
    return false
  }
}

// Human labels for extracted field keys (backend returns snake_case).
function prettyKey(k) {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// A 422 from /extract means the document validator rejected the upload
// (not a government-issued document). Pull the human guidance out of the
// FastAPI error body, which is `{ detail: "..." }` (or a validation array).
function rejectionDetail(err) {
  try {
    const parsed = JSON.parse(err.body)
    if (typeof parsed?.detail === 'string') return parsed.detail
    if (Array.isArray(parsed?.detail)) return parsed.detail.map((d) => d.msg).filter(Boolean).join('; ')
  } catch {
    /* body wasn't JSON — fall through */
  }
  return err.body || err.message
}

// Persist chat history in localStorage so a refresh keeps the conversation.
const CHAT_STORAGE_KEY = 'sahayak_chat_messages'

function loadMessages() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Tailwind-styled element overrides so markdown from the AI renders cleanly.
// react-markdown escapes raw HTML by default, so this is XSS-safe.
const MD_COMPONENTS = {
  p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
  li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-ink-950" {...props} />,
  em: ({ node, ...props }) => <em className="italic" {...props} />,
  h1: ({ node, ...props }) => <h1 className="text-base font-bold text-ink-950 mb-1.5" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-[15px] font-bold text-ink-950 mb-1.5" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-ink-950 mb-1" {...props} />,
  a: ({ node, ...props }) => (
    <a className="text-accent-700 underline hover:text-accent-800" target="_blank" rel="noreferrer" {...props} />
  ),
  code: ({ node, inline, ...props }) =>
    inline ? (
      <code className="rounded bg-ink-100 px-1 py-0.5 text-[13px] font-mono text-ink-900" {...props} />
    ) : (
      <code className="block rounded-lg bg-ink-900 text-ink-50 p-3 text-[13px] font-mono overflow-x-auto" {...props} />
    ),
  pre: ({ node, ...props }) => <pre className="mb-2 last:mb-0" {...props} />,
  blockquote: ({ node, ...props }) => (
    <blockquote className="border-l-2 border-accent-300 pl-3 italic text-ink-600 mb-2" {...props} />
  ),
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto mb-2">
      <table className="w-full text-sm border-collapse" {...props} />
    </div>
  ),
  th: ({ node, ...props }) => <th className="border border-ink-200 px-2 py-1 bg-ink-50 text-left font-semibold" {...props} />,
  td: ({ node, ...props }) => <td className="border border-ink-200 px-2 py-1" {...props} />,
}

// Render the AI answer as markdown so formatting (lists, bold, tables, code) shows.
function AnswerText({ text }) {
  return (
    <div className="text-[15px] leading-relaxed text-ink-900">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
        {text}
      </ReactMarkdown>
    </div>
  )
}

export default function Assistant() {
  const { actor, lang } = useApp()
  const chat = useChat()
  const extract = useExtract()
  const templatesQ = useTemplates()
  const autofill = useAutofill()
  const [genId, setGenId] = useState(null) // extract-message id currently generating a doc
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState(loadMessages)
  const [activeRef, setActiveRef] = useState(null)
  const [panel, setPanel] = useState({ citations: [], usedChunks: [] })
  const [uploadOpen, setUploadOpen] = useState(false)
  const [docType, setDocType] = useState(DOC_TYPES[0])
  const [file, setFile] = useState(null)
  const fileInputRef = useRef(null)
  const t = useT()
  const ta = t.assistant
  const tu = ta.upload
  const td = ta.doc
  const scrollRef = useRef(null)

  const { supported, listening, error: micError, start, stop } = useSpeech(lang, (transcript, isFinal) => {
    setInput(transcript)
    if (isFinal) setTimeout(() => submit(transcript), 150)
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, chat.isPending])

  // Persist history on every change so a page refresh restores the conversation.
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    } catch {
      /* quota exceeded (e.g. large inline PDFs) — skip persisting this update */
    }
  }, [messages])

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

      // The chat endpoint can attach a generated document (base64 PDF + url).
      // Render it inline right after the bot's text answer.
      const da = res.doc_action
      if (da && (da.pdf_base64 || da.pdf_url)) {
        setMessages((m) => [
          ...m,
          {
            id: `pdf_${Date.now()}`,
            role: 'assistant',
            kind: 'pdf',
            pdfBase64: da.pdf_base64,
            pdfUrl: da.pdf_url,
            docId: da.document_id ?? null,
            caseId: da.case_id ?? null,
          },
        ])
      }
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
      // 422 = validator rejected a non-government document; surface its guidance.
      const text = err.status === 422 ? tu.rejected(rejectionDetail(err)) : tu.error(err.message)
      setMessages((m) => [
        ...m,
        { id: `exe_${Date.now()}`, role: 'assistant', error: true, text, citations: [], usedChunks: [] },
      ])
    }
  }

  // Turn extracted fields into an official document: autofill a template, then
  // render the certified PDF inline. autofill also files it as a case (R3 draft),
  // so the returned case_id is the application number shown to the citizen.
  async function generateDoc(srcMsg) {
    const templates = templatesQ.data ?? []
    const tpl = templateForDocType(templates, srcMsg.docType)
    if (!tpl || autofill.isPending) return
    setGenId(srcMsg.id)
    try {
      const doc = await autofill.mutateAsync({ caseId: null, templateId: tpl.id, fields: srcMsg.fields, actor, lang })
      setMessages((m) => [
        ...m,
        { id: `pdf_${Date.now()}`, role: 'assistant', kind: 'pdf', docId: doc.id, caseId: doc.case_id, templateName: tpl.name },
      ])
    } catch (err) {
      setMessages((m) => [
        ...m,
        { id: `pdfe_${Date.now()}`, role: 'assistant', error: true, text: td.error(err.message), citations: [], usedChunks: [] },
      ])
    } finally {
      setGenId(null)
    }
  }

  // Empty = show a centered, minimal chatbar; once a message exists the view
  // expands to the full-screen conversation. `submit` adds the user message
  // first, so this flips on first send and the enter animation plays.
  const hasStarted = messages.length > 0

  // Quick-prompt chips shown above the composer in the full-screen layout.
  const quickPrompts = (
    <div className="border-t border-white/40 px-3 pt-2.5 flex flex-wrap items-center gap-2">
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
  )

  // Upload tray — pick a document type and file, then extract fields. Shared so
  // it works from both the centered and full-screen composers.
  const uploadTray = uploadOpen && (
    <div className="border-t border-white/40 px-3 py-3 bg-ink-50/60 animate-fadeUp">
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
  )

  // The composer (attach + mic + textarea + send + status line). One instance,
  // rendered in either layout — all API-wired handlers stay in one place.
  const composer = (
    <div className="p-3">
      <div className="flex items-end gap-2">
        <button
          onClick={() => setUploadOpen((v) => !v)}
          title={tu.attach}
          aria-label={tu.attach}
          aria-pressed={uploadOpen}
          className={`btn h-11 w-11 shrink-0 rounded-xl p-0 border ${
            uploadOpen ? 'bg-accent-700 text-white border-accent-700' : 'bg-white/70 text-ink-700 border-ink-300 hover:border-accent-600 hover:text-accent-800'
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
          className="flex-1 resize-none rounded-xl border border-ink-300 bg-white/70 px-3.5 py-2.5 text-[15px] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus:border-accent-600 transition-colors max-h-32"
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
  )

  return (
    <div className="relative">
      {/* Hero background — India-gate skyline fills only the TOP HALF, fading
          into the page around the centered chatbar. Always mounted so it can
          dissolve into a glassy blur when the chat opens (hasStarted). */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-x-0 top-0 h-[58vh] -z-10 bg-cover bg-center transition-all duration-[900ms] ease-out [mask-image:linear-gradient(to_bottom,black,black_62%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black,black_62%,transparent)] ${
          hasStarted ? 'opacity-0 blur-3xl scale-110' : 'opacity-100 blur-0 scale-100'
        }`}
        style={{ backgroundImage: 'url(/hero-bg.jpg)' }}
      />
      {/* Softening scrim so the glass panel + text stay readable over the photo. */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-x-0 top-0 h-[58vh] -z-10 bg-gradient-to-b from-white/40 via-white/30 to-transparent transition-opacity duration-[900ms] ${
          hasStarted ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {!hasStarted ? (
        /* Centered, minimal welcome — chatbar in the middle of the screen. */
        <div className="min-h-[calc(100vh-220px)] flex flex-col items-center justify-center text-center animate-fadeUp">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-ink-950">{ta.emptyTitle}</h1>
          <p className="mt-3 text-ink-600 font-medium max-w-md">{ta.emptySub}</p>

          <div className="glass-strong mt-8 w-full max-w-2xl rounded-2xl overflow-hidden">
            {uploadTray}
            {composer}
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-2xl">
            {ta.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                disabled={chat.isPending}
                className="text-xs px-3 py-1.5 rounded-full glass text-ink-700 hover:text-accent-800 transition-colors disabled:opacity-40"
              >
                {s.length > 42 ? `${s.slice(0, 42)}…` : s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Full-screen conversation — smooth expand on first send. */
        <div className="animate-chatExpand">
          <SectionTitle
            eyebrow={ta.eyebrow}
            title={ta.title}
            subtitle={ta.subtitle}
          />

          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            {/* Chat column */}
            <div className="glass flex flex-col h-[calc(100vh-220px)] min-h-[520px] overflow-hidden rounded-2xl">
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
                    {Object.keys(m.fields).length > 0 && (
                      <button
                        onClick={() => generateDoc(m)}
                        disabled={autofill.isPending || (templatesQ.data ?? []).length === 0}
                        className="btn-teal w-full h-10 mt-3 text-sm"
                      >
                        <Shield className="h-4 w-4" /> {genId === m.id ? td.generating : td.generate}
                      </button>
                    )}
                  </div>
                </div>
              ) : m.kind === 'pdf' ? (
                <div key={m.id} className="flex justify-start animate-fadeUp">
                  <PdfMessage
                    docId={m.docId}
                    caseId={m.caseId}
                    templateName={m.templateName}
                    pdfBase64={m.pdfBase64}
                    pdfUrl={m.pdfUrl}
                    td={td}
                    botName={ta.botName}
                  />
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

            {(chat.isPending || extract.isPending || autofill.isPending) && (
              <div className="flex justify-start animate-fadeUp">
                <div className="rounded-2xl rounded-bl-sm bg-white border border-ink-200 px-4 py-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent-600 animate-pulseDot" />
                  <span className="text-sm text-ink-500">
                    {autofill.isPending ? td.generating : extract.isPending ? tu.extracting : ta.retrieving}
                  </span>
                </div>
              </div>
            )}
          </div>

              {quickPrompts}

              {uploadTray}

              {composer}
            </div>

            {/* Citation side panel */}
            <div data-guide="sources" className="lg:sticky lg:top-28 h-fit">
              {/* Hero illustration — matches the reference design */}
              <div className="glass overflow-hidden mb-4 hidden lg:block rounded-2xl">
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
      )}
    </div>
  )
}

// Inline certified-PDF card rendered in the chat. Fetches the PDF as a Blob so
// it renders inline in the <iframe> despite the endpoint's attachment header.
function PdfMessage({ docId, caseId, templateName, pdfBase64, pdfUrl, td, botName }) {
  const [url, setUrl] = useState(() =>
    pdfBase64 && looksLikePdf(pdfBase64) ? `data:application/pdf;base64,${pdfBase64}` : null,
  )
  const [loading, setLoading] = useState(!pdfBase64)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Base64 came inline with the chat response — render it directly, no fetch,
    // but only after confirming it's really a PDF (not injected data:).
    if (pdfBase64) {
      if (looksLikePdf(pdfBase64)) {
        setUrl(`data:application/pdf;base64,${pdfBase64}`)
      } else {
        setError(td.error('invalid PDF data'))
      }
      setLoading(false)
      return
    }
    // Otherwise fetch the PDF for a document id (autofill/officer path).
    if (docId == null) {
      setError('No document to render.')
      setLoading(false)
      return
    }
    let cancelled = false
    let objUrl = null
    setLoading(true)
    setError(null)
    api
      .fetchDocumentPdf(docId)
      .then((blob) => {
        if (cancelled) return
        objUrl = URL.createObjectURL(blob)
        setUrl(objUrl)
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; if (objUrl) URL.revokeObjectURL(objUrl) }
  }, [docId, pdfBase64])

  // Prefer the hosted url for download/open when the backend supplied one — but
  // only if it's a safe http(s) scheme; otherwise fall back to the local blob/data URL.
  const downloadHref = pdfUrl && isSafeHttpUrl(pdfUrl) ? pdfUrl : url

  return (
    <div className="max-w-[92%] w-full rounded-2xl rounded-bl-sm px-4 py-3 border bg-white border-ink-200">
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-ink-900 text-white">
          <Shield className="h-3 w-3" />
        </span>
        <span className="text-xs font-bold text-ink-900">{botName}</span>
        {templateName && <span className="chip bg-approved-bg text-approved">{templateName}</span>}
      </div>
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-2">{td.pdfTitle}</div>

      {loading ? (
        <div className="h-[420px] skeleton rounded-lg" />
      ) : error ? (
        <div className="rounded-lg bg-breach-bg/60 border border-breach/30 px-3 py-2 text-xs text-breach">{td.error(error)}</div>
      ) : url ? (
        <iframe title={td.pdfTitle} src={url} className="w-full h-[420px] rounded-lg border border-ink-200 bg-white" />
      ) : null}

      <div className="mt-2.5 flex items-center gap-2">
        <a
          href={downloadHref ?? undefined}
          download={`document-${docId ?? 'certificate'}.pdf`}
          aria-disabled={!downloadHref}
          className={`btn-teal h-9 text-sm ${!downloadHref ? 'pointer-events-none opacity-50' : ''}`}
        >
          {td.download}
        </a>
        <a
          href={downloadHref ?? undefined}
          target="_blank"
          rel="noreferrer"
          aria-disabled={!downloadHref}
          className={`btn-ghost h-9 text-sm ${!downloadHref ? 'pointer-events-none opacity-50' : ''}`}
        >
          {td.open}
        </a>
      </div>

      {caseId != null && (
        <div className="mt-2.5 pt-2 border-t border-ink-100 text-[11px] text-ink-600">{td.filedAs(caseId)}</div>
      )}
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
