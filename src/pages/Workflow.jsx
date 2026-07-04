import { useEffect, useState, useMemo } from 'react'
import { useApp } from '../store/AppContext.jsx'
import { api } from '../api.js'
import { useCases, useCreateCase, useAdvanceCase, useEscalateCase } from '../lib/queries.js'
import { useT } from '../lib/i18n.js'
import { SectionTitle, StatusBadge, Stat, Shield } from '../components/ui.jsx'
import { fmtDate } from '../lib/utils.js'

// Kanban columns derived from backend case status + escalation flag.
// `labelKey` -> t.workflow[labelKey] so column headers translate.
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
  const advanceMut = useAdvanceCase()
  const escalateMut = useEscalateCase()

  const [now, setNow] = useState(Date.now())
  const [title, setTitle] = useState('')
  const [citizen, setCitizen] = useState('')
  const [preview, setPreview] = useState(null)
  const [formError, setFormError] = useState(null)

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
    try {
      await createMut.mutateAsync({
        title: title.trim(),
        citizen_name: citizen.trim(),
        details: { note: title.trim() },
      })
      setTitle('')
      setCitizen('')
      setPreview(null)
    } catch (err) {
      setFormError(err.message)
    }
  }

  return (
    <div>
      <SectionTitle
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
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
            <button type="submit" disabled={createMut.isPending} className="btn-primary h-[38px]">
              {createMut.isPending ? t.filing : t.fileCase}
            </button>
          </div>
        </div>
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
                      onAdvance={() => advanceMut.mutate({ id: c.id, actor })}
                      onEscalate={() => escalateMut.mutate({ id: c.id, actor, reason: t.escalateReason })}
                      advancing={advanceMut.isPending}
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

function CaseCard({ c, t, now, fetchedAt, supervisor, onAdvance, onEscalate }) {
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
      <div className="text-[10px] text-ink-500 mt-2">{t.filed(fmtDate(c.created_at), c.sla_hours, c.assigned_role)}</div>
    </div>
  )
}
