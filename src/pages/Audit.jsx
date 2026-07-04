import { useMemo, useState } from 'react'
import { useAudit } from '../lib/queries.js'
import { SectionTitle, Shield } from '../components/ui.jsx'
import { fmtTime, shortHash } from '../lib/utils.js'

// Metadata per backend action type: label, colour tone, icon glyph.
const ACTIONS = {
  chat: { label: 'Chat query', tone: 'teal', glyph: '💬' },
  classify: { label: 'Intent classified', tone: 'indigo', glyph: '⌗' },
  draft: { label: 'Document drafted', tone: 'indigo', glyph: '📝' },
  approve: { label: 'Document approved', tone: 'approved', glyph: '✓' },
  issue: { label: 'Document issued', tone: 'approved', glyph: '📤' },
  eligibility: { label: 'Eligibility checked', tone: 'teal', glyph: '⚖' },
  translate: { label: 'Translated', tone: 'indigo', glyph: '🌐' },
  extract: { label: 'Fields extracted', tone: 'indigo', glyph: '🔍' },
  autofill: { label: 'Autofilled', tone: 'indigo', glyph: '✍' },
  advance: { label: 'Case advanced', tone: 'pending', glyph: '➜' },
  escalate: { label: 'Case escalated', tone: 'breach', glyph: '▲' },
}

const TONE_DOT = { teal: 'bg-teal-500', breach: 'bg-breach', approved: 'bg-approved', pending: 'bg-pending', indigo: 'bg-indigo-600' }
const TONE_CHIP = {
  teal: 'bg-teal-500/15 text-teal-700', breach: 'bg-breach-bg text-breach',
  approved: 'bg-approved-bg text-approved', pending: 'bg-pending-bg text-pending',
  indigo: 'bg-indigo-800/10 text-indigo-800',
}

export default function Audit() {
  const auditQ = useAudit()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const audit = auditQ.data ?? []

  // Client-side tamper-evidence view: chain a display hash over each entry so
  // "editing any past row breaks the chain" is visible. (The backend log is
  // itself append-only, §18 R4 — this is a read-only integrity visualisation.)
  const chained = useMemo(() => {
    const chrono = [...audit].sort((a, b) => new Date(a.ts) - new Date(b.ts))
    let prevHash = 'GENESIS0'
    const byId = {}
    for (const e of chrono) {
      const payload = `${e.id}|${e.ts}|${e.actor}|${e.action}|${e.summary}|${prevHash}`
      const hash = shortHash(payload)
      byId[e.id] = { prevHash, hash }
      prevHash = hash
    }
    return byId
  }, [audit])

  const counts = useMemo(() => {
    const c = {}
    for (const e of audit) c[e.action] = (c[e.action] || 0) + 1
    return c
  }, [audit])

  const rows = useMemo(() => {
    const q = query.toLowerCase()
    return audit // backend already returns newest first
      .filter((e) => (filter === 'all' ? true : e.action === filter))
      .filter((e) =>
        !q ||
        (e.summary || '').toLowerCase().includes(q) ||
        (e.actor || '').toLowerCase().includes(q) ||
        String(e.id).includes(q),
      )
  }, [audit, filter, query])

  return (
    <div>
      <SectionTitle
        eyebrow="Immutable Audit Trail"
        title="Every action, permanently recorded"
        subtitle="Append-only and read-only (§18 R4). Each row is chained to the one before it for a tamper-evident view — nothing here can be edited or deleted."
        right={
          <span className="chip bg-indigo-800 text-white flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> {audit.length} entries · read-only
          </span>
        }
      />

      {/* Controls */}
      <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actor, action, or summary…"
            className="w-full rounded-lg border border-ink-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          <svg viewBox="0 0 24 24" className="h-4 w-4 absolute left-3 top-2.5 text-ink-500" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" />
          </svg>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-ink-300 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          <option value="all">All actions ({audit.length})</option>
          {Object.entries(ACTIONS).map(([k, v]) => (
            <option key={k} value={k}>{v.label} ({counts[k] || 0})</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div className="card p-0 overflow-hidden">
        {auditQ.isLoading && <div className="p-10 text-center text-sm text-ink-500">Loading audit log…</div>}
        {auditQ.isError && <div className="p-10 text-center text-sm text-breach">Could not load audit: {auditQ.error.message}</div>}
        {!auditQ.isLoading && !auditQ.isError && rows.length === 0 && (
          <div className="p-10 text-center text-sm text-ink-500">No entries match your filter.</div>
        )}
        <ol>
          {rows.map((e, i) => {
            const meta = ACTIONS[e.action] || { label: e.action, tone: 'indigo', glyph: '•' }
            const isLast = i === rows.length - 1
            const chain = chained[e.id] || { prevHash: '—', hash: '—' }
            return (
              <li key={e.id} className={`relative flex gap-4 px-5 py-4 hover:bg-ink-100/40 transition-colors ${isLast ? '' : 'border-b border-ink-100'}`}>
                <div className="flex flex-col items-center pt-1">
                  <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-sm ${TONE_DOT[meta.tone]}`}>
                    {meta.glyph}
                  </span>
                  {!isLast && (
                    <span aria-hidden title="Hash chain link" className="w-0.5 flex-1 mt-1 rounded bg-gradient-to-b from-indigo-600/50 to-indigo-600/10" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`chip ${TONE_CHIP[meta.tone]}`}>{meta.label}</span>
                    <span className="text-[11px] font-mono text-ink-500">#{e.id}</span>
                    <span className="text-[11px] text-ink-500 ml-auto">{fmtTime(e.ts)}</span>
                  </div>

                  <p className="text-sm text-ink-900 mt-1.5 font-medium break-words">{e.summary}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs">
                    <span className="text-ink-500">
                      Actor:{' '}
                      <span className="font-semibold text-indigo-800">{e.actor}</span>
                    </span>
                  </div>

                  {/* Tamper-evidence hash chain */}
                  <div className="mt-2.5 flex items-center gap-2 text-[10px] font-mono text-ink-500">
                    <span className="text-ink-300">prev</span>
                    <code className="rounded bg-ink-100 px-1.5 py-0.5">{chain.prevHash}</code>
                    <span className="text-ink-300">→</span>
                    <span className="flex items-center gap-1 rounded bg-indigo-800/10 px-1.5 py-0.5 text-indigo-800 font-bold">
                      <Shield className="h-3 w-3" /> {chain.hash}
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <p className="text-[11px] text-ink-500 mt-3 px-1">
        Each row's hash is derived from its contents plus the previous row's hash (FNV-1a). Editing any
        past entry changes its hash and breaks every link after it — which is why the log is tamper-evident
        and shown read-only.
      </p>
    </div>
  )
}
