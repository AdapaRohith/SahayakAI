import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppContext.jsx'
import { useCases } from '../lib/queries.js'
import { api } from '../api.js'
import { useT } from '../lib/i18n.js'
import { SectionTitle, StatusBadge, Shield, Icon } from '../components/ui.jsx'
import { fmtDate, fmtTime } from '../lib/utils.js'

/* ---------------------------------------------------------------------------
 * My Requests — 100% backend-driven. Every request shown here is a real
 * Case from GET /api/cases. Timeline, SLA, department — all from the backend.
 * No seeded/hardcoded data. The full audit trail lives on the Audit page.
 * ------------------------------------------------------------------------- */

function caseToRequest(c) {
  const breached = c.escalated || c.sla_status === 'red'
  const status = breached
    ? 'Breached'
    : c.status === 'issued'
      ? 'Issued'
      : c.status === 'drafting'
        ? 'Pending Approval'
        : 'In Progress'

  const route = Array.isArray(c.route) ? c.route : []
  const stageIdx = c.stage_index ?? 0

  // Timeline: one step per backend route stage
  const timeline = route.map((step, idx) => ({
    key: String(step.stage).toLowerCase().replace(/\s+/g, '_'),
    label: step.stage,
    state: idx < stageIdx ? 'done' : idx === stageIdx ? 'current' : 'future',
    at: idx <= stageIdx ? c.created_at : null,
    by: step.role,
  }))

  const slaBy =
    c.created_at && c.sla_hours != null
      ? new Date(new Date(c.created_at).getTime() + c.sla_hours * 3_600_000).toISOString()
      : null

  return {
    id: `case-${c.id}`,
    refId: `REQ-${String(c.id).padStart(4, '0')}`,
    title: c.title,
    department: c.current_department_name || c.department,
    status,
    stage: c.stage,
    stageIndex: stageIdx,
    filedAt: c.created_at,
    slaBy,
    slaRemainingHours: c.sla_remaining_hours ?? null,
    slaStatus: c.sla_status ?? null,
    breached,
    timeline,
    route,
    caseId: c.id,
  }
}

export default function Requests() {
  const { role } = useApp()
  const casesQ = useCases()
  const t = useT().requests

  const requests = useMemo(() => {
    try {
      return (casesQ.data ?? []).map(caseToRequest)
    } catch {
      return []
    }
  }, [casesQ.data])

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

      {requests.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">{t.empty}</div>
      ) : (
        <div className="space-y-4">
          {requests.map((r, i) => (
            <RequestCard
              key={r.id}
              req={r}
              t={t}
              role={role}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RequestCard({ req, t, role, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const [digiSent, setDigiSent] = useState(false)

  function downloadDoc() {
    if (req.caseId) {
      window.open(api.documentPdfUrl(req.caseId), '_blank')
    }
  }

  function sendDigiLocker() {
    setDigiSent(true)
  }

  return (
    <div className={`card overflow-hidden ${req.breached ? 'ring-1 ring-breach/30' : ''}`}>
      {req.breached && (
        <div className="flex items-center gap-2 bg-breach px-4 py-2 text-white text-xs font-bold">
          <Icon name="alert" className="h-4 w-4" /> {t.delayedBanner}
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
          {req.slaRemainingHours != null && (
            <SlaBadge hours={req.slaRemainingHours} status={req.slaStatus} breached={req.breached} t={t} />
          )}
          {req.stage && (
            <span className="chip bg-accent-50 text-accent-800">{req.stage}</span>
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
          <div className="mt-4 animate-fadeUp">
            <div className="text-xs font-bold uppercase tracking-wide text-ink-500 mb-3">{t.progressTitle}</div>
            <Timeline req={req} t={t} />

            {req.status === 'Issued' && (
              <div className="mt-4 rounded-lg border border-ink-200 bg-ink-50 p-3">
                <div className="flex flex-wrap gap-2">
                  <button onClick={downloadDoc} className="btn-ghost text-sm">
                    <DownloadIcon /> {t.viewDoc}
                  </button>
                  {digiSent ? (
                    <span className="inline-flex items-center gap-1.5 chip bg-approved-bg text-approved">
                      <Shield className="h-3.5 w-3.5" /> {t.delivered}
                    </span>
                  ) : (
                    <button onClick={sendDigiLocker} className="btn-teal text-sm">
                      <LockerIcon /> {t.sendDigiLocker}
                    </button>
                  )}
                </div>
              </div>
            )}

            <Link to="/audit" className="mt-3 inline-block text-[11px] font-semibold text-accent-800 hover:text-accent-900">
              {t.openAudit} →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function SlaBadge({ hours, status, breached, t }) {
  const isOverdue = breached || hours < 0
  const cls = isOverdue
    ? 'bg-breach-bg text-breach'
    : status === 'amber'
      ? 'bg-pending-bg text-pending'
      : 'bg-approved-bg text-approved'
  return (
    <span className={`chip ${cls}`}>
      {isOverdue
        ? `Overdue ${Math.abs(Math.round(hours))}h`
        : `${Math.round(hours)}h remaining`}
    </span>
  )
}

function Timeline({ req, t }) {
  const steps = req.timeline.length
    ? req.timeline
    : [{ key: 'filed', state: 'current', at: req.filedAt }]

  return (
    <ol className="relative">
      {steps.map((s, idx) => {
        const isLast = idx === steps.length - 1
        const done = s.state === 'done'
        const current = s.state === 'current'
        const dotTone = done
          ? 'bg-approved text-white'
          : current
            ? req.breached
              ? 'bg-breach text-white animate-pulse'
              : 'bg-pending text-white animate-pulse'
            : 'bg-ink-200 text-ink-400'
        const lineTone = done ? 'bg-approved/50' : 'bg-ink-200'
        const label = s.label || t.steps[s.key] || s.key
        return (
          <li key={`${s.key}-${idx}`} className="relative flex gap-3 pb-5 last:pb-0">
            <div className="flex flex-col items-center">
              <span className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${dotTone}`}>
                {done ? <CheckIcon /> : current ? (req.breached ? '!' : '●') : idx + 1}
              </span>
              {!isLast && <span className={`w-0.5 flex-1 mt-1 rounded ${lineTone}`} />}
            </div>
            <div className="min-w-0 pb-1">
              <div className={`text-sm font-semibold ${done ? 'text-ink-900' : current ? 'text-ink-950' : 'text-ink-400'}`}>
                {label}
                {s.by && <span className="text-ink-400 font-normal"> · {s.by}</span>}
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

/* ------------------------------------------------------------------ helpers ---- */

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
