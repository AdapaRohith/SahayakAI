import { useEffect, useState, useMemo } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { routeDepartment } from '../data/seed.js'
import { SectionTitle, StatusBadge, PriorityDot, Stat } from '../components/ui.jsx'
import { slaCountdown, fmtDate } from '../lib/utils.js'

const COLUMNS = [
  { key: 'In Progress', tone: 'pending' },
  { key: 'Pending Approval', tone: 'pending' },
  { key: 'Breached', tone: 'breach' },
  { key: 'Resolved', tone: 'approved' },
]

export default function Workflow() {
  const { cases, escalateCase, addCase, resolveCase, makeUid, role } = useApp()
  const [now, setNow] = useState(Date.now())
  const [draftTitle, setDraftTitle] = useState('')
  const [draftCitizen, setDraftCitizen] = useState('')

  // Live clock — drives the countdown timers.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Auto-escalation: any open case whose deadline has passed is escalated once.
  useEffect(() => {
    for (const c of cases) {
      const past = new Date(c.slaDeadline).getTime() <= now
      if (past && !c.escalated && ['In Progress', 'Pending Approval'].includes(c.status)) {
        escalateCase(c.id)
      }
    }
  }, [now, cases, escalateCase])

  const predictedDept = draftTitle.trim() ? routeDepartment(draftTitle) : null

  function fileCase(e) {
    e.preventDefault()
    if (!draftTitle.trim()) return
    const dept = routeDepartment(draftTitle)
    const slaHours = 72
    const created = new Date().toISOString()
    const c = {
      id: makeUid('CASE'),
      title: draftTitle.trim(),
      citizen: draftCitizen.trim() || 'Anonymous Citizen',
      summary: draftTitle.trim(),
      status: 'In Progress',
      priority: 'Normal',
      department: dept,
      createdAt: created,
      slaHours,
      slaDeadline: new Date(Date.now() + slaHours * 3_600_000).toISOString(),
      escalated: false,
      escalationTier: null,
      routeText: draftTitle.trim(),
    }
    addCase(c)
    setDraftTitle('')
    setDraftCitizen('')
  }

  const stats = useMemo(() => {
    const open = cases.filter((c) => ['In Progress', 'Pending Approval'].includes(c.status)).length
    const breached = cases.filter((c) => c.status === 'Breached').length
    const escalated = cases.filter((c) => c.escalated).length
    return { open, breached, escalated }
  }, [cases])

  return (
    <div>
      <SectionTitle
        eyebrow="Workflow & SLA"
        title="Case routing with live SLA countdowns"
        subtitle="Cases are auto-routed to a department by rule. When an SLA timer expires the case turns red, auto-escalates to the supervisor tier, and the escalation is logged to the audit trail."
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-5">
        <Stat label="Open cases" value={stats.open} tone="warn" sub="In progress / pending" />
        <Stat label="SLA breached" value={stats.breached} tone="bad" sub="Past deadline" />
        <Stat label="Escalated" value={stats.escalated} tone="bad" sub="Raised to supervisor" />
      </div>

      {/* File a new case — demonstrates live auto-routing */}
      <form onSubmit={fileCase} className="card p-4 mb-6">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] items-end">
          <div>
            <label className="field-label">New case — describe the request</label>
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="e.g. Delay in water connection / income certificate / ration card issue"
              className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          <div>
            <label className="field-label">Citizen name</label>
            <input
              value={draftCitizen}
              onChange={(e) => setDraftCitizen(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
          <button type="submit" className="btn-primary h-[38px]">Route & file</button>
        </div>
        {predictedDept && (
          <div className="mt-2 text-xs text-ink-500">
            Auto-routes to{' '}
            <span className="chip bg-teal-500/15 text-teal-700">{predictedDept}</span>{' '}
            <span className="text-ink-300">·</span> rule-based routing, logged on file
          </div>
        )}
      </form>

      {/* Board */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = cases.filter((c) => c.status === col.key)
          return (
            <div key={col.key} className="flex flex-col">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="font-bold text-sm text-indigo-900">{col.key}</h3>
                <span className={`chip ${
                  col.tone === 'breach' ? 'bg-breach-bg text-breach'
                  : col.tone === 'approved' ? 'bg-approved-bg text-approved'
                  : 'bg-pending-bg text-pending'
                }`}>{items.length}</span>
              </div>
              <div className="space-y-3">
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-ink-300 p-4 text-center text-xs text-ink-500">
                    No cases
                  </div>
                )}
                {items.map((c) => (
                  <CaseCard key={c.id} c={c} now={now} onResolve={() => resolveCase(c.id)} supervisor={role === 'Supervisor'} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CaseCard({ c, now, onResolve, supervisor }) {
  const sla = slaCountdown(c.slaDeadline, now)
  const isOpen = ['In Progress', 'Pending Approval'].includes(c.status)
  const timerColor = sla.breached ? 'text-breach' : sla.urgent ? 'text-pending' : 'text-approved'
  // Supervisors get a stronger visual on escalated cases (Change 3).
  const supervisorFlag = supervisor && c.escalated
  const cardBorder = c.status === 'Breached'
    ? `border-breach/40 ring-1 ring-breach/20${supervisorFlag ? ' ring-2 ring-breach/50 shadow-panel' : ''}`
    : 'border-ink-100'

  return (
    <div className={`card p-3.5 border ${cardBorder}`}>
      {supervisorFlag && (
        <div className="-mx-3.5 -mt-3.5 mb-2.5 px-3.5 py-1 bg-breach text-white text-[10px] font-bold uppercase tracking-wide rounded-t-xl flex items-center gap-1.5">
          ▲ Supervisor attention — escalated
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-mono text-ink-500">{c.id}</div>
        {c.escalated && (
          <span className="chip bg-breach text-white animate-pulseDot">▲ Escalated · {c.escalationTier}</span>
        )}
      </div>
      <h4 className="font-semibold text-indigo-900 text-sm leading-snug mt-1">{c.title}</h4>
      <div className="text-xs text-ink-500 mt-1">{c.citizen}</div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="chip bg-indigo-800/10 text-indigo-800">{c.department}</span>
        <PriorityDot priority={c.priority} />
      </div>

      <div className="mt-3 pt-3 border-t border-ink-100 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-ink-500">
            {sla.breached ? 'Overdue by' : 'SLA remaining'}
          </div>
          <div className={`font-mono font-bold text-sm ${timerColor}`}>
            {c.status === 'Resolved' ? '—' : sla.text}
          </div>
        </div>
        {c.status === 'Resolved' ? (
          <StatusBadge status="Resolved" />
        ) : isOpen ? (
          <button onClick={onResolve} className="text-xs font-semibold text-teal-700 hover:text-teal-600">
            Mark resolved
          </button>
        ) : (
          <StatusBadge status={c.status} />
        )}
      </div>
      <div className="text-[10px] text-ink-500 mt-2">Filed {fmtDate(c.createdAt)} · SLA {c.slaHours}h</div>
    </div>
  )
}
