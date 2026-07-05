import { useEffect, useMemo, useState } from 'react'
import { useDepartments, useDepartmentQueue, useStartQueueItem, useCompleteQueueItem } from '../lib/queries.js'
import { useT } from '../lib/i18n.js'
import { SectionTitle, StatusBadge, Stat, Shield } from '../components/ui.jsx'

// ---------------------------------------------------------------------------
// Multi-department workflow dashboard. Reads the department list + per-department
// queue from the backend and lets an officer Start / Complete queue items —
// completing auto-advances the case to the next department in its route.
//
// The exact backend field names aren't pinned down, so every value is read
// defensively with sensible fallbacks; if the real response differs, only these
// small accessors need adjusting.
// ---------------------------------------------------------------------------

const dName = (d) => d?.name ?? d?.department_name ?? `Department #${d?.id}`
const dType = (d) => d?.type ?? d?.department_type ?? ''
const dSla = (d) => d?.sla_hours ?? d?.sla ?? d?.sla_hrs ?? null
const dEmail = (d) => d?.email ?? d?.contact_email ?? ''

const qCounts = (q) => ({
  pending: q?.pending ?? q?.pending_count ?? 0,
  inProgress: q?.in_progress ?? q?.in_progress_count ?? q?.inProgress ?? 0,
  overdue: q?.overdue ?? q?.overdue_count ?? 0,
})
const qItems = (q) => q?.items ?? q?.queue ?? (Array.isArray(q) ? q : [])

const iId = (it) => it?.queue_id ?? it?.id
const iCase = (it) => it?.case_id ?? it?.case?.id ?? it?.caseId
const iTitle = (it) => it?.title ?? it?.case_title ?? it?.case?.title ?? `Case #${iCase(it) ?? '—'}`
const iCitizen = (it) => it?.citizen_name ?? it?.case?.citizen_name ?? ''
const iStatus = (it) => String(it?.status ?? it?.state ?? 'pending')

// Map a queue item's status onto the shared StatusBadge vocabulary (colours).
function badgeStatus(status) {
  const s = status.toLowerCase()
  if (/complete|done|issued|resolved/.test(s)) return 'Resolved'
  if (/overdue|breach|delay/.test(s)) return 'Breached'
  if (/progress/.test(s)) return 'In Progress'
  return 'Pending'
}

export default function Departments() {
  const t = useT().departments
  const deptsQ = useDepartments()
  const [selectedId, setSelectedId] = useState(null)

  const departments = useMemo(() => deptsQ.data ?? [], [deptsQ.data])

  // Default to the first department once the list loads.
  useEffect(() => {
    if (selectedId == null && departments.length) setSelectedId(departments[0].id)
  }, [departments, selectedId])

  return (
    <div>
      <SectionTitle eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />

      {deptsQ.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="h-64 skeleton !rounded-xl" />
          <div className="h-64 skeleton !rounded-xl" />
        </div>
      ) : deptsQ.isError ? (
        <div className="card p-6 text-sm text-breach">{t.loadError(deptsQ.error.message)}</div>
      ) : departments.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">{t.empty}</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          {/* Department list */}
          <div className="space-y-2.5">
            {departments.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={`w-full text-left rounded-xl border p-3.5 transition-all duration-200 active:scale-[0.99] ${
                  selectedId === d.id
                    ? 'border-accent-600 bg-accent-50 ring-1 ring-accent-600'
                    : 'border-ink-200 bg-white hover:border-ink-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-950 text-white">
                    <Shield className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-ink-950 truncate">{dName(d)}</div>
                    {dType(d) && <div className="text-[11px] text-ink-500 truncate">{dType(d)}</div>}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
                  {dSla(d) != null && <span>{t.slaLabel}: <span className="font-semibold text-ink-700">{dSla(d)}h</span></span>}
                  {dEmail(d) && <span className="truncate">{dEmail(d)}</span>}
                </div>
              </button>
            ))}
          </div>

          {/* Selected department queue */}
          <DepartmentQueue deptId={selectedId} t={t} />
        </div>
      )}
    </div>
  )
}

function DepartmentQueue({ deptId, t }) {
  const queueQ = useDepartmentQueue(deptId)
  const startMut = useStartQueueItem()
  const completeMut = useCompleteQueueItem()
  const [notice, setNotice] = useState(null)

  const queue = queueQ.data
  const counts = qCounts(queue)
  const items = qItems(queue)

  async function start(item) {
    setNotice(null)
    try {
      await startMut.mutateAsync({ deptId, queueId: iId(item) })
    } catch (err) {
      setNotice({ error: true, text: err.message })
    }
  }

  async function complete(item) {
    setNotice(null)
    try {
      await completeMut.mutateAsync({ deptId, queueId: iId(item) })
      setNotice({ error: false, text: t.advanced })
    } catch (err) {
      setNotice({ error: true, text: err.message })
    }
  }

  if (queueQ.isLoading) return <div className="h-64 skeleton !rounded-xl" />
  if (queueQ.isError) return <div className="card p-6 text-sm text-breach">{t.loadError(queueQ.error.message)}</div>

  return (
    <div className="space-y-4">
      {/* Queue counts */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t.pending} value={counts.pending} tone="warn" />
        <Stat label={t.inProgress} value={counts.inProgress} tone="default" />
        <Stat label={t.overdue} value={counts.overdue} tone="bad" />
      </div>

      {notice && (
        <div
          className={`rounded-lg px-3 py-2 text-xs ${
            notice.error ? 'bg-breach-bg/60 border border-breach/30 text-breach' : 'bg-approved-bg text-approved'
          }`}
        >
          {notice.text}
        </div>
      )}

      {/* Queue items */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-ink-200">
          <h3 className="font-bold text-ink-700 text-sm">{t.queueTitle}</h3>
        </div>
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500">{t.noItems}</div>
        ) : (
          <ol className="divide-y divide-ink-100">
            {items.map((item) => {
              const status = iStatus(item)
              const s = status.toLowerCase()
              const isDone = /complete|done|issued|resolved/.test(s)
              const inProgress = /progress/.test(s)
              const busy = startMut.isPending || completeMut.isPending
              return (
                <li key={iId(item)} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink-950 truncate">{iTitle(item)}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-500">
                      {iCase(item) != null && <span className="font-mono">{t.caseLabel} #{iCase(item)}</span>}
                      {iCitizen(item) && <span>{iCitizen(item)}</span>}
                    </div>
                  </div>
                  <StatusBadge status={badgeStatus(status)} />
                  {!isDone && (
                    <div className="flex gap-2">
                      {inProgress ? (
                        <button onClick={() => complete(item)} disabled={busy} className="btn-teal text-sm py-1.5">
                          {completeMut.isPending ? t.completing : t.complete}
                        </button>
                      ) : (
                        <button onClick={() => start(item)} disabled={busy} className="btn-primary text-sm py-1.5">
                          {startMut.isPending ? t.starting : t.start}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
