import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, AreaChart, Area, LabelList,
} from 'recharts'
import { useApp } from '../store/AppContext.jsx'
import { useAnalytics, useCases, useAudit } from '../lib/queries.js'
import { useT } from '../lib/i18n.js'
import { ROLE_ROUTES } from '../components/TopNav.jsx'
import { SectionTitle, Stat, Icon } from '../components/ui.jsx'

const ROLES = [
  { id: 'Citizen', icon: 'user' },
  { id: 'Officer', icon: 'briefcase' },
  { id: 'Supervisor', icon: 'shield' },
]

// --- Theme tokens for the charts -------------------------------------------
const ACCENT = '#0284c7'      // accent-600 — single-series magnitude
const MUTED = '#94a3b8'       // ink-400 — the "before" / recessive comparator
const GRID = '#e2e8f0'        // ink-200
const AXIS = '#64748b'        // ink-500
// Case-status slices reuse the reserved status palette (shipped with labels).
const STATUS_FILL = { open: '#b45309', drafting: '#0284c7', escalated: '#b91c1c', issued: '#15803d' }

const ACTION_LABEL = {
  chat: 'Chat', classify: 'Classify', draft: 'Draft', approve: 'Approve', issue: 'Issue',
  eligibility: 'Eligibility', translate: 'Translate', extract: 'Extract', autofill: 'Autofill',
  advance: 'Advance', escalate: 'Escalate',
}

// Themed tooltip shared by every chart.
function ChartTip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-ink-200 bg-white px-3 py-2 shadow-lift text-xs">
      {label != null && label !== '' && <div className="font-semibold text-ink-900 mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5 text-ink-700">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color || p.payload?.fill || ACCENT }} />
          <span className="tabular-nums font-bold text-ink-900">{p.value}{unit}</span>
          <span className="text-ink-500">{p.name}</span>
        </div>
      ))}
    </div>
  )
}

export default function Admin() {
  const { role, setRole } = useApp()
  const full = useT()
  const t = full.admin
  const tRole = full.nav.roles
  const analyticsQ = useAnalytics()
  const casesQ = useCases()
  const auditQ = useAudit()
  const a = analyticsQ.data
  const cases = casesQ.data ?? []
  const audit = auditQ.data ?? []

  // Case mix — mirrors the Workflow board's derivation so the numbers agree.
  const caseStatus = useMemo(() => {
    const open = cases.filter((c) => c.status === 'open' && !c.escalated).length
    const drafting = cases.filter((c) => c.status === 'drafting' && !c.escalated).length
    const escalated = cases.filter((c) => c.escalated).length
    const issued = cases.filter((c) => c.status === 'issued').length
    return [
      { name: t.caseOpen, value: open, fill: STATUS_FILL.open },
      { name: t.caseInProgress, value: drafting, fill: STATUS_FILL.drafting },
      { name: t.caseEscalated, value: escalated, fill: STATUS_FILL.escalated },
      { name: t.caseIssued, value: issued, fill: STATUS_FILL.issued },
    ].filter((d) => d.value > 0)
  }, [cases, t])
  const totalCases = caseStatus.reduce((s, d) => s + d.value, 0)

  const byDept = useMemo(() => {
    const m = {}
    for (const c of cases) m[c.department] = (m[c.department] || 0) + 1
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((x, y) => y.value - x.value)
  }, [cases])

  const byAction = useMemo(() => {
    const m = {}
    for (const e of audit) m[e.action] = (m[e.action] || 0) + 1
    return Object.entries(m)
      .map(([k, value]) => ({ name: t.actionLabel[k] || ACTION_LABEL[k] || k, value }))
      .sort((x, y) => y.value - x.value)
      .slice(0, 8)
  }, [audit, t])

  return (
    <div>
      <SectionTitle
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
      />

      {/* Role toggle (visible RBAC) */}
      <div className="card p-4 mb-6">
        <h3 className="font-bold text-ink-950 mb-3">{t.activeRole}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {ROLES.map((r) => {
            const active = role === r.id
            return (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`text-left rounded-xl border p-4 transition-all duration-200 active:scale-[0.99] ${
                  active ? 'border-accent-600 bg-accent-50 ring-1 ring-accent-600' : 'border-ink-300 hover:border-accent-500 hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${active ? 'bg-accent-600 text-white' : 'bg-ink-100 text-ink-600'}`}>
                    <Icon name={r.icon} className="h-5 w-5" />
                  </span>
                  {active && <span className="chip bg-ink-950 text-white">{t.active}</span>}
                </div>
                <div className="font-bold text-ink-950 mt-2">{tRole[r.id]}</div>
                <div className="text-xs text-ink-500 mt-0.5">{t.roles[r.id]}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {ROLE_ROUTES[r.id].map((p) => (
                    <span key={p} className="chip bg-ink-100 text-ink-700 text-[10px]">{p}</span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {analyticsQ.isLoading && <div className="card p-10 text-center text-sm text-ink-500">{t.loadingAnalytics}</div>}
      {analyticsQ.isError && <div className="card p-6 text-sm text-breach">{t.analyticsError(analyticsQ.error.message)}</div>}

      {a && (
        <>
          {/* KPI strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
            <Stat label={t.statTotalChats} value={a.total_chats} sub={t.statTotalChatsSub} />
            <Stat label={t.statDrafts} value={a.total_drafts} sub={t.statDraftsSub(a.total_issued)} />
            <Stat label={t.statAvgCitations} value={a.avg_citations} tone="good" sub={t.statAvgCitationsSub} />
            <Stat label={t.statHumanApproved} value="100%" tone="good" sub={t.statHumanApprovedSub(a.total_issued)} />
            <Stat label={t.statOpenCases} value={a.open_cases} tone="warn" sub={t.statOpenCasesSub(a.sla_breaches, a.escalations)} />
          </div>

          {/* Trend — full width */}
          <ChartCard title={t.chartTrend} hint={t.chartTrendHint} className="mb-5">
            {a.actions_per_day?.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={a.actions_per_day} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
                  <defs>
                    <linearGradient id="actArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENT} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTip unit=" actions" />} cursor={{ stroke: ACCENT, strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area type="monotone" dataKey="count" name="actions" stroke={ACCENT} strokeWidth={2}
                    fill="url(#actArea)" dot={false} activeDot={{ r: 4, fill: ACCENT, stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </ChartCard>

          {/* Donut + department bar */}
          <div className="grid gap-5 lg:grid-cols-2 mb-5">
            <ChartCard title={t.chartCaseMix} hint={t.chartCaseMixHint(totalCases)}>
              {caseStatus.length ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={caseStatus}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={62}
                          outerRadius={92}
                          paddingAngle={2}
                          stroke="#fff"
                          strokeWidth={2}
                          startAngle={90}
                          endAngle={-270}
                        >
                          {caseStatus.map((d) => <Cell key={d.name} fill={d.fill} />)}
                        </Pie>
                        <Tooltip content={<ChartTip unit=" cases" />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-extrabold text-ink-950 tabular-nums">{totalCases}</span>
                      <span className="text-[10px] uppercase tracking-widest text-ink-500">{t.casesUnit}</span>
                    </div>
                  </div>
                  {/* Legend = direct identity labels, never colour alone */}
                  <ul className="flex-1 w-full space-y-1.5">
                    {caseStatus.map((d) => (
                      <li key={d.name} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: d.fill }} />
                        <span className="text-ink-700">{d.name}</span>
                        <span className="ml-auto font-bold text-ink-950 tabular-nums">{d.value}</span>
                        <span className="text-ink-400 text-xs tabular-nums w-9 text-right">
                          {Math.round((d.value / totalCases) * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : <Empty />}
            </ChartCard>

            <ChartCard title={t.chartByDept} hint={t.chartByDeptHint}>
              {byDept.length ? (
                <ResponsiveContainer width="100%" height={Math.max(200, byDept.length * 42)}>
                  <BarChart data={byDept} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#334155' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTip unit=" cases" />} cursor={{ fill: 'rgba(2,132,199,0.06)' }} />
                    <Bar dataKey="value" name="cases" fill={ACCENT} radius={[0, 4, 4, 0]} barSize={18}>
                      <LabelList dataKey="value" position="right" fontSize={11} fill="#0f172a" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </ChartCard>
          </div>

          {/* Audit activity + efficiency */}
          <div className="grid gap-5 lg:grid-cols-2 mb-5">
            <ChartCard title={t.chartByAction} hint={t.chartByActionHint}>
              {byAction.length ? (
                <ResponsiveContainer width="100%" height={Math.max(200, byAction.length * 34)}>
                  <BarChart data={byAction} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: '#334155' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTip unit=" actions" />} cursor={{ fill: 'rgba(2,132,199,0.06)' }} />
                    <Bar dataKey="value" name="actions" fill={ACCENT} radius={[0, 4, 4, 0]} barSize={14}>
                      <LabelList dataKey="value" position="right" fontSize={11} fill="#0f172a" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <Empty />}
            </ChartCard>

            <ChartCard title={t.chartDrafting} hint={t.chartDraftingHint(a.drafting_time_reduction_pct)}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={[
                    { name: t.before, minutes: a.avg_drafting_time_before_min },
                    { name: t.after, minutes: a.avg_drafting_time_after_min },
                  ]}
                  margin={{ top: 8, right: 8, left: -18, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} />
                  <YAxis tick={{ fontSize: 11, fill: AXIS }} unit="m" tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTip unit=" min" />} cursor={{ fill: 'rgba(2,132,199,0.06)' }} />
                  <Bar dataKey="minutes" name="drafting" radius={[4, 4, 0, 0]} barSize={64}>
                    <LabelList dataKey="minutes" position="top" fontSize={12} fill="#0f172a" formatter={(v) => `${v}m`} />
                    <Cell fill={MUTED} />
                    <Cell fill={ACCENT} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Impact tiles */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label={t.statWaitBefore} value={`${a.citizen_wait_before_days}d`} tone="warn" sub={t.statWaitBeforeSub} />
            <Stat label={t.statWaitAfter} value={`${a.citizen_wait_after_days}d`} tone="good" sub={t.statWaitAfterSub} />
            <Stat label={t.statTimeSaved} value={`${a.drafting_time_reduction_pct}%`} tone="good" sub={t.statTimeSavedSub(a.avg_drafting_time_before_min, a.avg_drafting_time_after_min)} />
          </div>
        </>
      )}
    </div>
  )
}

function ChartCard({ title, hint, children, className = '' }) {
  return (
    <div className={`card card-hover p-4 ${className}`}>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-bold text-ink-950">{title}</h3>
        {hint && <span className="text-[11px] text-ink-500">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Empty() {
  const t = useT().admin
  return (
    <div className="h-[200px] flex items-center justify-center text-sm text-ink-400">
      {t.empty}
    </div>
  )
}
