import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppContext.jsx'
import { useRequests, CITIZEN } from '../store/RequestsContext.jsx'
import { useCases } from '../lib/queries.js'
import { useT } from '../lib/i18n.js'
import { SectionTitle, StatusBadge, Shield } from '../components/ui.jsx'
import { fmtDate, fmtTime } from '../lib/utils.js'

// The six-step citizen lifecycle, in order. Labels come from i18n.
const STEP_ORDER = ['filed', 'routed', 'drafted', 'pending', 'approved', 'delivered']

// Map a live backend case (same store as the Workflow board) into the citizen
// request shape, so an officer's approval/advance elsewhere reflects here live.
function caseToRequest(c) {
  const status = c.escalated
    ? 'Breached'
    : c.status === 'issued'
      ? 'Issued'
      : c.status === 'drafting'
        ? 'Pending Approval'
        : 'In Progress'
  const filed = c.created_at
  const issued = c.status === 'issued'
  const drafting = c.status === 'drafting'
  const st = (key, done, current, at = null, by = null) => ({
    key,
    state: done ? 'done' : current ? 'current' : 'future',
    at,
    by,
  })
  return {
    id: `case-${c.id}`,
    source: 'live',
    refId: `REQ-LIVE-${String(c.id).padStart(4, '0')}`,
    title: c.title,
    department: c.department,
    status,
    filedAt: filed,
    slaBy: null,
    breached: c.escalated || c.sla_status === 'red',
    officer: issued ? c.assigned_role : null,
    digilockerRef: null,
    docContent: null,
    timeline: [
      st('filed', true, false, filed),
      st('routed', true, false, filed),
      st('drafted', drafting || issued, c.status === 'open', drafting || issued ? filed : null),
      st('pending', issued, drafting, null),
      st('approved', issued, false, issued ? filed : null, issued ? c.assigned_role : null),
      st('delivered', false, false),
    ],
    audit: [],
  }
}

export default function Requests() {
  const { role } = useApp()
  const { requests, sendToDigiLocker } = useRequests()
  const casesQ = useCases()
  const t = useT().requests

  // Seeded (in-memory) requests + the citizen's live cases from the shared store.
  const liveRequests = useMemo(() => {
    try {
      return (casesQ.data ?? []).filter((c) => c?.citizen_name === CITIZEN).map(caseToRequest)
    } catch {
      return []
    }
  }, [casesQ.data])

  const all = useMemo(() => [...requests, ...liveRequests], [requests, liveRequests])

  return (
    <div>
      <SectionTitle
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
        right={
          role !== 'Citizen' ? (
            <span className="chip bg-ink-950 text-white flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> {t.officerPreview}
            </span>
          ) : null
        }
      />

      {all.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">{t.empty}</div>
      ) : (
        <div className="space-y-4">
          {all.map((r, i) => (
            <RequestCard
              key={r.id}
              req={r}
              t={t}
              role={role}
              defaultOpen={i === 0}
              onSendDigiLocker={sendToDigiLocker}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RequestCard({ req, t, role, defaultOpen, onSendDigiLocker }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`card overflow-hidden ${req.breached ? 'ring-1 ring-breach/30' : ''}`}>
      {/* Delayed banner */}
      {req.breached && (
        <div className="flex items-center gap-2 bg-breach px-4 py-2 text-white text-xs font-bold">
          <span>▲</span> {t.delayedBanner}
        </div>
      )}

      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-ink-950 leading-snug">{req.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
              <span className="font-mono">{t.refLabel}: <span className="font-semibold text-ink-700">{req.refId}</span></span>
              <span>·</span>
              <span>{t.deptLabel}: <span className="font-semibold text-ink-700">{req.department}</span></span>
            </div>
          </div>
          <StatusBadge status={req.status} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
          <span>{t.filedLabel}: <span className="font-semibold text-ink-700">{fmtDate(req.filedAt)}</span></span>
          {req.slaBy && (
            <span className={req.breached ? 'text-breach font-semibold' : ''}>
              {t.expectedLabel}: <span className="font-semibold">{fmtDate(req.slaBy)}</span>
            </span>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-800 hover:text-accent-900 transition-colors"
          aria-expanded={open}
        >
          <ChevronIcon open={open} /> {open ? t.hideProgress : t.viewProgress}
        </button>

        {open && (
          <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_320px] animate-fadeUp">
            {/* Progress timeline */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-ink-500 mb-3">{t.progressTitle}</div>
              <Timeline req={req} t={t} />

              {/* Issued document access + DigiLocker handoff (seeded issued only) */}
              {req.status === 'Issued' && req.source === 'seed' && (
                <DocActions req={req} t={t} onSendDigiLocker={onSendDigiLocker} />
              )}
            </div>

            {/* This request's audit records */}
            <AuditRecords req={req} t={t} role={role} />
          </div>
        )}
      </div>
    </div>
  )
}

function Timeline({ req, t }) {
  return (
    <ol className="relative">
      {STEP_ORDER.map((key, idx) => {
        const s = req.timeline.find((x) => x.key === key) || { key, state: 'future' }
        const isLast = idx === STEP_ORDER.length - 1
        const done = s.state === 'done'
        const current = s.state === 'current'
        // A breached request colours its current step red instead of amber.
        const dotTone = done
          ? 'bg-approved text-white'
          : current
            ? req.breached
              ? 'bg-breach text-white animate-pulse'
              : 'bg-pending text-white animate-pulse'
            : 'bg-ink-200 text-ink-400'
        const lineTone = done ? 'bg-approved/50' : 'bg-ink-200'
        return (
          <li key={key} className="relative flex gap-3 pb-5 last:pb-0">
            <div className="flex flex-col items-center">
              <span className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${dotTone}`}>
                {done ? <CheckIcon /> : current ? (req.breached ? '!' : '●') : idx + 1}
              </span>
              {!isLast && <span className={`w-0.5 flex-1 mt-1 rounded ${lineTone}`} />}
            </div>
            <div className="min-w-0 pb-1">
              <div className={`text-sm font-semibold ${done ? 'text-ink-900' : current ? 'text-ink-950' : 'text-ink-400'}`}>
                {t.steps[key]}
                {key === 'routed' && <span className="text-ink-400 font-normal"> → {req.department}</span>}
                {key === 'pending' && <span className="text-ink-400 font-normal"> · {t.humanGate}</span>}
                {key === 'approved' && s.by && <span className="text-ink-400 font-normal"> · {t.by} {s.by}</span>}
                {key === 'delivered' && req.digilockerRef && <span className="text-ink-400 font-mono font-normal"> · {req.digilockerRef}</span>}
              </div>
              {s.at ? (
                <div className="text-[11px] text-ink-500 mt-0.5">{fmtTime(s.at)}</div>
              ) : current ? (
                <div className={`text-[11px] mt-0.5 font-semibold ${req.breached ? 'text-breach' : 'text-pending'}`}>{t.current}</div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function DocActions({ req, t, onSendDigiLocker }) {
  function download() {
    const blob = new Blob([req.docContent || ''], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${req.refId}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="mt-4 rounded-lg border border-ink-200 bg-ink-50 p-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={download} className="btn-ghost text-sm">
          <DownloadIcon /> {t.viewDoc}
        </button>
        {req.digilockerRef ? (
          <span className="inline-flex items-center gap-1.5 chip bg-approved-bg text-approved">
            <Shield className="h-3.5 w-3.5" /> {t.delivered} · {req.digilockerRef}
          </span>
        ) : (
          <button onClick={() => onSendDigiLocker(req.id)} className="btn-teal text-sm">
            <LockerIcon /> {t.sendDigiLocker}
          </button>
        )}
      </div>
    </div>
  )
}

function AuditRecords({ req, t, role }) {
  return (
    <aside className="rounded-lg border border-ink-200 bg-white p-3 h-fit">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-4 w-4 text-ink-700" />
        <span className="text-xs font-bold text-ink-950">{t.auditTitle}</span>
        <span className="chip bg-ink-100 text-ink-700 ml-auto">{t.readonly}</span>
      </div>
      {req.audit.length === 0 ? (
        <p className="text-xs text-ink-500">—</p>
      ) : (
        <ol className="space-y-2.5">
          {req.audit.map((e, i) => (
            <li key={i} className="text-xs">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-600 shrink-0" />
                <span className="font-semibold text-ink-900">{t.auditActions[e.key] || e.key}</span>
                <span className="text-[10px] text-ink-400 ml-auto whitespace-nowrap">{fmtTime(e.ts)}</span>
              </div>
              <p className="text-ink-500 mt-0.5 pl-3.5 break-words">{e.summary}</p>
            </li>
          ))}
        </ol>
      )}
      {/* Citizens track inline; officers/supervisors can jump to the full trail. */}
      {role !== 'Citizen' && (
        <Link to="/audit" className="mt-3 inline-block text-[11px] font-semibold text-accent-800 hover:text-accent-900">
          {t.openAudit} →
        </Link>
      )}
    </aside>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M12 4v16M8 8h.01M8 12h.01" strokeLinecap="round" />
    </svg>
  )
}
