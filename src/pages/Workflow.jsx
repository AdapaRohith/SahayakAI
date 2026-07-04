import { useEffect, useState, useMemo } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { api } from '../api.js'
import {
  useCases, useCreateCase, useAdvanceCase, useEscalateCase,
  useDepartments, useRoutes, useDeptQueue,
  useStartQueueItem, useCompleteQueueItem,
  useAssignRoute, useRouteNext, useCreateRoutedCase,
} from '../lib/queries.js'
import { useT } from '../lib/i18n.js'
import { SectionTitle, StatusBadge, Stat } from '../components/ui.jsx'
import { fmtDate } from '../lib/utils.js'

// Kanban columns derived from backend case status + escalation flag.
const COLUMNS = [
  { key: 'open', labelKey: 'colOpen', tone: 'pending', match: (c) => c.status === 'open' && !c.escalated },
  { key: 'drafting', labelKey: 'colDrafting', tone: 'pending', match: (c) => c.status === 'drafting' && !c.escalated },
  { key: 'escalated', labelKey: 'colEscalated', tone: 'breach', match: (c) => c.escalated },
  { key: 'issued', labelKey: 'colIssued', tone: 'approved', match: (c) => c.status === 'issued' },
]

const SLA_COLOR = { green: 'text-approved', amber: 'text-pending', red: 'text-breach', done: 'text-ink-500' }

function fmtDuration(ms) {
  const abs = Math.abs(ms)
  const h = Math.floor(abs / 3_600_000)
  const m = Math.floor((abs % 3_600_000) / 60_000)
  const s = Math.floor((abs % 60_000) / 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export default function Workflow() {
  const { actor, role } = useApp()
  const t = useT().workflow
  const casesQ = useCases()
  const createMut = useCreateCase()
  const createRoutedMut = useCreateRoutedCase()
  const advanceMut = useAdvanceCase()
  const escalateMut = useEscalateCase()
  const routesQ = useRoutes()
  const assignRouteMut = useAssignRoute()
  const routeNextMut = useRouteNext()

  const [now, setNow] = useState(Date.now())
  const [title, setTitle] = useState('')
  const [citizen, setCitizen] = useState('')
  const [preview, setPreview] = useState(null)
  const [formError, setFormError] = useState(null)
  const [autoRoute, setAutoRoute] = useState(false)

  const routes = routesQ.data ?? []

  // Live clock for the SLA countdowns.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const cases = casesQ.data ?? []
  const fetchedAt = casesQ.dataUpdatedAt || Date.now()

  const stats = useMemo(() => {
    const open = cases.filter((c) => c.status === 'open' || c.status === 'drafting').length
    const breached = cases.filter((c) => c.sla_status === 'red').length
    const escalated = cases.filter((c) => c.escalated).length
    return { open, breached, escalated }
  }, [cases])

  async function classify() {
    if (!title.trim()) return
    try {
      const res = await api.classify(title.trim(), actor)
      setPreview(res)
    } catch {
      setPreview(null)
    }
  }

  async function fileCase(e) {
    e.preventDefault()
    setFormError(null)
    if (!title.trim() || !citizen.trim()) {
      setFormError(t.requiredErr)
      return
    }
    const body = {
      title: title.trim(),
      citizen_name: citizen.trim(),
      details: { note: title.trim() },
    }
    try {
      // Auto-route posts to /cases/routed so the backend picks the best route;
      // otherwise the normal /cases create runs.
      if (autoRoute) await createRoutedMut.mutateAsync(body)
      else await createMut.mutateAsync(body)
      setTitle('')
      setCitizen('')
      setPreview(null)
    } catch (err) {
      setFormError(err.message)
    }
  }

  const filing = createMut.isPending || createRoutedMut.isPending

  return (
    <div>
      <SectionTitle
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
        right={
          <div className="text-right">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">{t.registerMeta}</div>
            <div className="text-2xl font-extrabold text-ink-950 tabular-nums">{cases.length}</div>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-5">
        <Stat label={t.statOpen} value={stats.open} tone="warn" sub={t.statOpenSub} />
        <Stat label={t.statBreached} value={stats.breached} tone="bad" sub={t.statBreachedSub} />
        <Stat label={t.statEscalated} value={stats.escalated} tone="bad" sub={t.statEscalatedSub} />
      </div>

      {/* File a new case — backend auto-classifies the workflow */}
      <form onSubmit={fileCase} className="card p-4 mb-6">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] items-end">
          <div>
            <label className="field-label">{t.newCaseLabel}</label>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setPreview(null) }}
              placeholder={t.describePlaceholder}
              className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus:border-accent-600 transition-colors"
            />
          </div>
          <div>
            <label className="field-label">{t.citizenName}</label>
            <input
              value={citizen}
              onChange={(e) => setCitizen(e.target.value)}
              placeholder={t.requiredPlaceholder}
              className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus:border-accent-600 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={classify} className="btn-ghost h-[38px]">{t.previewRoute}</button>
            <button type="submit" disabled={filing} className="btn-primary h-[38px]">
              {filing ? t.filing : t.fileCase}
            </button>
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-ink-600 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={autoRoute}
            onChange={(e) => setAutoRoute(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-ink-300 text-accent-600 focus:ring-accent-600"
          />
          {t.autoRoute}
        </label>
        {preview && (
          <div className="mt-3 rounded-lg bg-ink-50 border border-ink-200 p-3 text-xs animate-fadeUp">
            <span className="font-semibold text-ink-950">{t.classifiedAs(preview.case_type)}</span>
            <span className="text-ink-500">{t.deptConf(preview.department, (preview.confidence * 100).toFixed(0))}</span>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {preview.route?.map((r, i) => (
                <span key={i} className="chip bg-ink-100 text-ink-700 border border-ink-200">
                  {r.stage} · {r.sla_hours}h
                </span>
              ))}
            </div>
          </div>
        )}
        {formError && <div className="mt-2 text-xs text-breach">{formError}</div>}
      </form>

      {/* Department queues — live load across the multi-department route */}
      <DepartmentRegister t={t} />

      {/* Board */}
      {casesQ.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((c) => <div key={c.key} className="h-40 skeleton !rounded-xl" />)}
        </div>
      ) : casesQ.isError ? (
        <div className="card p-6 text-sm text-breach">{t.loadError(casesQ.error.message)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = cases.filter(col.match)
            return (
              <div key={col.key} className="flex flex-col">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="font-bold text-sm text-ink-950">{t[col.labelKey]}</h3>
                  <span className={`chip ${
                    col.tone === 'breach' ? 'bg-breach-bg text-breach'
                    : col.tone === 'approved' ? 'bg-approved-bg text-approved'
                    : 'bg-pending-bg text-pending'
                  }`}>{items.length}</span>
                </div>
                <div className="space-y-3">
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-ink-300 p-4 text-center text-xs text-ink-500">
                      {t.noCases}
                    </div>
                  )}
                  {items.map((c) => (
                    <CaseCard
                      key={c.id}
                      c={c}
                      t={t}
                      now={now}
                      fetchedAt={fetchedAt}
                      supervisor={role === 'Supervisor'}
                      routes={routes}
                      onAdvance={() => advanceMut.mutate({ id: c.id, actor })}
                      onEscalate={() => escalateMut.mutate({ id: c.id, actor, reason: t.escalateReason })}
                      onRouteNext={() => routeNextMut.mutate({ id: c.id })}
                      onAssignRoute={(routeId) => assignRouteMut.mutate({ id: c.id, routeId, actor })}
                      routingBusy={routeNextMut.isPending || assignRouteMut.isPending}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CaseCard({ c, t, now, fetchedAt, supervisor, routes = [], onAdvance, onEscalate, onRouteNext, onAssignRoute, routingBusy }) {
  // sla_remaining_hours was accurate at fetch time; project it forward so the
  // timer ticks live between refetches.
  const deadlineMs = fetchedAt + c.sla_remaining_hours * 3_600_000
  const remaining = deadlineMs - now
  const done = c.sla_status === 'done' || c.status === 'issued'
  const overdue = !done && remaining <= 0
  const timerColor = done ? 'text-ink-500' : SLA_COLOR[c.sla_status] || 'text-approved'

  const supervisorFlag = supervisor && c.escalated
  const cardBorder = c.escalated
    ? `border-breach/40 ring-1 ring-breach/20${supervisorFlag ? ' ring-2 ring-breach/50 shadow-panel' : ''}`
    : 'border-ink-100'

  const routeLen = c.route?.length ?? 0
  const isFinal = c.status === 'issued' || c.stage === 'Completed'

  return (
    <div className={`card card-hover p-3.5 border ${cardBorder}`}>
      {supervisorFlag && (
        <div className="-mx-3.5 -mt-3.5 mb-2.5 px-3.5 py-1 bg-breach text-white text-[10px] font-bold uppercase tracking-wide rounded-t-xl flex items-center gap-1.5">
          {t.supervisorAttention}
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-mono text-ink-500">#{c.id} · {c.case_type}</div>
        {c.escalated && (
          <span className="chip bg-breach text-white animate-pulseDot">{t.escalated}</span>
        )}
      </div>
      <h4 className="font-semibold text-ink-950 text-sm leading-snug mt-1">{c.title}</h4>
      <div className="text-xs text-ink-500 mt-1">{c.citizen_name}</div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="chip bg-ink-100 text-ink-700 border border-ink-200">{c.department}</span>
        {/* Multi-department route position — current handling department */}
        {c.current_department_name && (
          <span className="chip bg-accent-50 text-accent-800 border border-accent-100" title={t.currentDept}>
            → {c.current_department_name}
          </span>
        )}
      </div>

      {/* Stage / route progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-ink-500">
          <span>{t.stage}: <span className="font-semibold text-ink-700">{c.stage}</span></span>
          <span>{Math.min(c.stage_index + 1, routeLen)}/{routeLen}</span>
        </div>
        <div className="mt-1 flex gap-1">
          {c.route?.map((r, i) => (
            <span
              key={i}
              title={`${r.stage} (${r.role})`}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= c.stage_index ? 'bg-accent-600' : 'bg-ink-200'}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-ink-100 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-ink-500">
            {done ? t.slaLabel : overdue ? t.overdueBy : t.slaRemaining}
          </div>
          <div className={`font-mono font-bold text-sm ${timerColor}`}>
            {done ? '—' : `${overdue ? '+' : ''}${fmtDuration(remaining)}`}
          </div>
        </div>
        <StatusBadge status={c.status === 'issued' ? 'Issued' : c.escalated ? 'Breached' : 'In Progress'} />
      </div>

      {!isFinal && (
        <div className="mt-3 flex items-center gap-2">
          <button onClick={onAdvance} className="btn-primary flex-1 py-1.5 text-xs">{t.advance}</button>
          {!c.escalated && (
            <button onClick={onEscalate} className="btn-ghost py-1.5 text-xs">{t.escalate}</button>
          )}
        </div>
      )}

      {/* Cross-department routing: advance to the next dept, or assign a route */}
      {!isFinal && (
        c.route_id ? (
          <button
            onClick={onRouteNext}
            disabled={routingBusy}
            className="mt-2 w-full btn-ghost py-1.5 text-xs disabled:opacity-50"
          >
            {routingBusy ? t.routing : t.routeNext}
          </button>
        ) : routes.length > 0 ? (
          <select
            defaultValue=""
            disabled={routingBusy}
            onChange={(e) => { if (e.target.value) onAssignRoute(Number(e.target.value)) }}
            className="mt-2 w-full rounded-lg border border-ink-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 disabled:opacity-50"
            aria-label={t.assignRoute}
          >
            <option value="">{routingBusy ? t.assigning : t.selectRoute}</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}{r.is_default ? ' ★' : ''}</option>
            ))}
          </select>
        ) : (
          <div className="mt-2 text-[10px] text-ink-400">{t.noRoute}</div>
        )
      )}

      <div className="text-[10px] text-ink-500 mt-2">{t.filed(fmtDate(c.created_at), c.sla_hours, c.assigned_role)}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Department register — a ledger of departments with a dotted leader running to
// the live pending figure, plus in-progress / overdue chips. Rows expand to act
// on individual queue items (start / complete). Uses the app's slate/blue tokens.
// ---------------------------------------------------------------------------
function DepartmentRegister({ t }) {
  const deptsQ = useDepartments()
  const depts = deptsQ.data ?? []

  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between mb-2 px-1">
        <h3 className="font-bold text-sm text-ink-950">{t.deptPanelTitle}</h3>
        <span className="text-[11px] text-ink-500">{t.deptPanelHint}</span>
      </div>

      {deptsQ.isLoading ? (
        <div className="card p-2 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-9 skeleton" />)}
        </div>
      ) : deptsQ.isError ? (
        <div className="card p-4 text-xs text-breach">{t.deptLoadError(deptsQ.error.message)}</div>
      ) : depts.length === 0 ? null : (
        <div className="card divide-y divide-ink-100 overflow-hidden">
          {depts.map((d, i) => <LedgerRow key={d.id} dept={d} index={i + 1} t={t} />)}
        </div>
      )}
    </section>
  )
}

function LedgerRow({ dept, index, t }) {
  const [open, setOpen] = useState(false)
  const queueQ = useDeptQueue(dept.id)
  const startMut = useStartQueueItem()
  const completeMut = useCompleteQueueItem()

  const q = queueQ.data ?? {}
  const items = q.items ?? []
  const pending = q.pending ?? items.filter((it) => statusOf(it) === 'pending').length
  const inProgress = q.in_progress ?? q.inProgress ?? items.filter((it) => statusOf(it) === 'in_progress').length
  const overdue = q.overdue ?? 0
  const busy = startMut.isPending || completeMut.isPending
  const expandable = items.length > 0

  return (
    <div>
      <button
        onClick={() => expandable && setOpen((o) => !o)}
        className={`w-full text-left px-3.5 py-2.5 flex items-center gap-3 transition-colors ${expandable ? 'hover:bg-ink-50' : 'cursor-default'}`}
      >
        <span className="w-6 shrink-0 font-mono text-[11px] text-ink-400 tabular-nums">{String(index).padStart(2, '0')}</span>
        <span className="font-semibold text-sm text-ink-900 truncate">{dept.name}</span>
        <span className="flex-1 border-b border-dashed border-ink-300 mx-1 -translate-y-0.5 min-w-[1.5rem]" />
        {inProgress > 0 && (
          <span className="chip bg-pending-bg text-pending">▸ {inProgress}</span>
        )}
        {overdue > 0 && (
          <span className="chip bg-breach-bg text-breach">⚠ {overdue}</span>
        )}
        <span className="font-mono font-bold text-sm text-ink-950 tabular-nums w-7 text-right">{String(pending).padStart(2, '0')}</span>
        {queueQ.isFetching && <span className="h-1.5 w-1.5 rounded-full bg-accent-600 animate-pulseDot" />}
      </button>

      {open && (
        <div className="px-3.5 pb-3 pl-12 space-y-2 bg-ink-50/60">
          {items.length === 0 ? (
            <div className="text-[11px] text-ink-400 py-1">{t.queueEmpty}</div>
          ) : items.map((item) => {
            const qid = item.id ?? item.queue_id
            const st = statusOf(item)
            const label = item.title ?? item.case_title ?? (item.case_id != null ? `#${item.case_id}` : `#${qid}`)
            return (
              <div key={qid} className="flex items-center gap-2 pt-2 border-t border-dashed border-ink-200 first:border-t-0 first:pt-0">
                <span className="text-xs text-ink-800 truncate flex-1">{label}</span>
                <StatusBadge status={st === 'in_progress' ? 'In Progress' : st === 'completed' ? 'Resolved' : 'Pending'} />
                {st !== 'in_progress' && st !== 'completed' && (
                  <button onClick={() => startMut.mutate({ deptId: dept.id, queueId: qid })} disabled={busy} className="btn-ghost py-1 px-2 text-[11px] disabled:opacity-50">
                    {startMut.isPending ? t.starting : t.start}
                  </button>
                )}
                {st !== 'completed' && (
                  <button onClick={() => completeMut.mutate({ deptId: dept.id, queueId: qid })} disabled={busy} className="btn-primary py-1 px-2 text-[11px] disabled:opacity-50">
                    {completeMut.isPending ? t.completing : t.complete}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Normalises the many status spellings a queue item might carry.
function statusOf(item) {
  const s = String(item?.status ?? item?.state ?? '').toLowerCase()
  if (s.includes('progress') || s === 'started' || s === 'active') return 'in_progress'
  if (s.includes('complete') || s === 'done' || s === 'resolved') return 'completed'
  return 'pending'
}
