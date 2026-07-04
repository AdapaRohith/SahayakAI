import { useMemo, useState } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { getSource } from '../data/seed.js'
import { SectionTitle, Shield } from '../components/ui.jsx'
import { fmtTime } from '../lib/utils.js'

// Metadata per action type: label, color, icon glyph.
const ACTIONS = {
  query_answered: { label: 'Query answered', tone: 'teal', glyph: '💬' },
  query_flagged: { label: 'Query flagged (unverified)', tone: 'breach', glyph: '⚠' },
  doc_drafted: { label: 'Document drafted', tone: 'indigo', glyph: '📝' },
  doc_approved: { label: 'Document approved & issued', tone: 'approved', glyph: '✓' },
  doc_requested_changes: { label: 'Changes requested', tone: 'pending', glyph: '↺' },
  case_routed: { label: 'Case routed', tone: 'indigo', glyph: '➜' },
  sla_escalated: { label: 'SLA escalated', tone: 'breach', glyph: '▲' },
}

const TONE_DOT = {
  teal: 'bg-teal-500', breach: 'bg-breach', approved: 'bg-approved',
  pending: 'bg-pending', indigo: 'bg-indigo-600',
}
const TONE_CHIP = {
  teal: 'bg-teal-500/15 text-teal-700', breach: 'bg-breach-bg text-breach',
  approved: 'bg-approved-bg text-approved', pending: 'bg-pending-bg text-pending',
  indigo: 'bg-indigo-800/10 text-indigo-800',
}

export default function Audit() {
  const { audit } = useApp()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  // Newest first for display; the underlying array stays append-only.
  const rows = useMemo(() => {
    const q = query.toLowerCase()
    return [...audit]
      .reverse()
      .filter((e) => (filter === 'all' ? true : e.action === filter))
      .filter((e) =>
        !q ||
        e.summary.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q),
      )
  }, [audit, filter, query])

  const counts = useMemo(() => {
    const c = {}
    for (const e of audit) c[e.action] = (c[e.action] || 0) + 1
    return c
  }, [audit])

  return (
    <div>
      <SectionTitle
        eyebrow="Immutable Audit Trail"
        title="Every AI action, permanently recorded"
        subtitle="Append-only and read-only. Each entry is hash-chained to the one before it, so any tampering breaks the chain. Nothing here can be edited or deleted."
        right={
          <div className="flex items-center gap-2 text-sm">
            <span className="chip bg-indigo-800 text-white flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> {audit.length} entries · read-only
            </span>
          </div>
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
            <option key={k} value={k}>
              {v.label} ({counts[k] || 0})
            </option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div className="card p-0 overflow-hidden">
        <div className="relative">
          {rows.length === 0 && (
            <div className="p-10 text-center text-sm text-ink-500">No entries match your filter.</div>
          )}
          <ol className="divide-y divide-ink-100">
            {rows.map((e) => {
              const meta = ACTIONS[e.action] || { label: e.action, tone: 'indigo', glyph: '•' }
              return (
                <li key={e.id} className="relative flex gap-4 px-5 py-4 hover:bg-ink-100/40 transition-colors">
                  {/* Timeline rail dot */}
                  <div className="flex flex-col items-center pt-1">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-sm ${TONE_DOT[meta.tone]}`}>
                      {meta.glyph}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`chip ${TONE_CHIP[meta.tone]}`}>{meta.label}</span>
                      <span className="text-[11px] font-mono text-ink-500">{e.id}</span>
                      <span className="text-[11px] text-ink-500 ml-auto">{fmtTime(e.timestamp)}</span>
                    </div>

                    <p className="text-sm text-ink-900 mt-1.5 font-medium">{e.summary}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs">
                      <span className="text-ink-500">
                        Actor:{' '}
                        <span className={`font-semibold ${e.actor.startsWith('AI') ? 'text-teal-700' : 'text-indigo-800'}`}>
                          {e.actor}
                        </span>
                      </span>

                      {e.sources.length > 0 && (
                        <span className="flex items-center gap-1.5 text-ink-500">
                          Sources:
                          {e.sources.map((s) => (
                            <span key={s} className="chip bg-teal-500/10 text-teal-700">{getSource(s)?.ref}</span>
                          ))}
                        </span>
                      )}

                      {'verified' in (e.meta || {}) && (
                        <span className={`chip ${e.meta.verified ? 'bg-approved-bg text-approved' : 'bg-breach-bg text-breach'}`}>
                          {e.meta.verified ? '✓ Verified citation' : '⚠ Unverified'}
                        </span>
                      )}
                    </div>

                    {/* Tamper-evidence hash chain */}
                    <div className="mt-2.5 flex items-center gap-2 text-[10px] font-mono text-ink-500">
                      <span className="text-ink-300">prev</span>
                      <code className="rounded bg-ink-100 px-1.5 py-0.5">{e.prevHash}</code>
                      <span className="text-ink-300">→</span>
                      <span className="flex items-center gap-1 rounded bg-indigo-800/10 px-1.5 py-0.5 text-indigo-800 font-bold">
                        <Shield className="h-3 w-3" /> {e.hash}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      <p className="text-[11px] text-ink-500 mt-3 px-1">
        Hash chain: each entry's hash is computed from its contents plus the previous entry's hash
        (FNV-1a). Editing any past entry would change its hash and break every link after it —
        which is why the log is tamper-evident and displayed read-only.
      </p>
    </div>
  )
}
