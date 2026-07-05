import { useMemo, useState } from 'react'
import { useAudit } from '../lib/queries.js'
import { useT } from '../lib/i18n.js'
import { SectionTitle, Shield, Icon } from '../components/ui.jsx'
import { fmtTime, shortHash } from '../lib/utils.js'

// Metadata per backend action type: label, colour tone, line-icon name.
const ACTIONS = {
  chat: { label: 'Chat query', tone: 'teal', icon: 'chat' },
  classify: { label: 'Intent classified', tone: 'indigo', icon: 'tag' },
  draft: { label: 'Document drafted', tone: 'indigo', icon: 'file' },
  approve: { label: 'Document approved', tone: 'approved', icon: 'check' },
  issue: { label: 'Document issued', tone: 'approved', icon: 'send' },
  eligibility: { label: 'Eligibility checked', tone: 'teal', icon: 'clipboard' },
  translate: { label: 'Translated', tone: 'indigo', icon: 'globe' },
  extract: { label: 'Fields extracted', tone: 'indigo', icon: 'search' },
  autofill: { label: 'Autofilled', tone: 'indigo', icon: 'pencil' },
  advance: { label: 'Case advanced', tone: 'pending', icon: 'arrow' },
  escalate: { label: 'Case escalated', tone: 'breach', icon: 'alert' },
}

// Non-status action tones collapse to monochrome; the three compliance
// states keep their semantic colour so they still read at a glance.
const TONE_DOT = { teal: 'bg-ink-600', breach: 'bg-breach', approved: 'bg-approved', pending: 'bg-pending', indigo: 'bg-ink-950' }
const TONE_CHIP = {
  teal: 'bg-ink-100 text-ink-700', breach: 'bg-breach-bg text-breach',
  approved: 'bg-approved-bg text-approved', pending: 'bg-pending-bg text-pending',
  indigo: 'bg-ink-100 text-ink-800',
}

export default function Audit() {
  const auditQ = useAudit()
  const t = useT().audit
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
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
        right={
          <span className="chip bg-ink-950 text-white flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> {t.entriesReadonly(audit.length)}
          </span>
        }
      />

      {/* Controls */}
      <div className="card p-3 mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-lg border border-ink-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus:border-accent-600 transition-colors"
          />
          <svg viewBox="0 0 24 24" className="h-4 w-4 absolute left-3 top-2.5 text-ink-500" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" />
          </svg>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-ink-300 px-3 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 hover:border-accent-500 transition-colors"
        >
          <option value="all">{t.allActions(audit.length)}</option>
          {Object.entries(ACTIONS).map(([k, v]) => (
            <option key={k} value={k}>{t.actions[k] || v.label} ({counts[k] || 0})</option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div className="card p-0 overflow-hidden">
        {auditQ.isLoading && <div className="p-10 text-center text-sm text-ink-500">{t.loading}</div>}
        {auditQ.isError && <div className="p-10 text-center text-sm text-breach">{t.loadError(auditQ.error.message)}</div>}
        {!auditQ.isLoading && !auditQ.isError && rows.length === 0 && (
          <div className="p-10 text-center text-sm text-ink-500">{t.noMatch}</div>
        )}
        <ol>
          {rows.map((e, i) => {
            const meta = ACTIONS[e.action] || { label: e.action, tone: 'indigo', icon: 'tag' }
            const isLast = i === rows.length - 1
            const chain = chained[e.id] || { prevHash: '—', hash: '—' }
            return (
              <li key={e.id} className={`relative flex gap-4 px-5 py-4 hover:bg-ink-50 transition-colors ${isLast ? '' : 'border-b border-ink-100'}`}>
                <div className="flex flex-col items-center pt-1">
                  <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${TONE_DOT[meta.tone]}`}>
                    <Icon name={meta.icon} className="h-4 w-4" />
                  </span>
                  {!isLast && (
                    <span aria-hidden title={t.hashLink} className="w-0.5 flex-1 mt-1 rounded bg-gradient-to-b from-ink-400 to-ink-200" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`chip ${TONE_CHIP[meta.tone]}`}>{t.actions[e.action] || meta.label}</span>
                    <span className="text-[11px] font-mono text-ink-500">#{e.id}</span>
                    <span className="text-[11px] text-ink-500 ml-auto">{fmtTime(e.ts)}</span>
                  </div>

                  <p className="text-sm text-ink-900 mt-1.5 font-medium break-words">{e.summary}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs">
                    <span className="text-ink-500">
                      {t.actor}{' '}
                      <span className="font-semibold text-ink-950">{e.actor}</span>
                    </span>
                  </div>

                  {/* Tamper-evidence hash chain */}
                  <div className="mt-2.5 flex items-center gap-2 text-[10px] font-mono text-ink-500">
                    <span className="text-ink-400">{t.prev}</span>
                    <code className="rounded bg-ink-100 px-1.5 py-0.5">{chain.prevHash}</code>
                    <span className="text-ink-400">→</span>
                    <span className="flex items-center gap-1 rounded bg-ink-950 px-1.5 py-0.5 text-white font-bold">
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
        {t.footerNote}
      </p>
    </div>
  )
}
