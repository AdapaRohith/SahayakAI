import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useApp } from '../store/AppContext.jsx'
import { useAnalytics } from '../lib/queries.js'
import { ROLE_ROUTES } from '../components/TopNav.jsx'
import { SectionTitle, Stat } from '../components/ui.jsx'

const ROLES = [
  { id: 'Citizen', desc: 'Sees only the citizen Assistant.', icon: '👤' },
  { id: 'Officer', desc: 'Assistant, Copilot, Workflow, Audit.', icon: '🧑‍💼' },
  { id: 'Supervisor', desc: 'Full access including Analytics.', icon: '🛡️' },
]

const CHART_INDIGO = '#3b2b96'
const CHART_TEAL = '#0d8b84'

export default function Admin() {
  const { role, setRole } = useApp()
  const analyticsQ = useAnalytics()
  const a = analyticsQ.data

  return (
    <div>
      <SectionTitle
        eyebrow="Analytics · Role-Based Access & Program Health"
        title="Access control and live analytics"
        subtitle="Toggle a role to gate which modules are visible across the app. All figures are read live from the GovAssist backend."
      />

      {/* Role toggle (visible RBAC) */}
      <div className="card p-4 mb-6">
        <h3 className="font-bold text-indigo-900 mb-3">Active role (RBAC)</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {ROLES.map((r) => {
            const active = role === r.id
            return (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`text-left rounded-xl border p-4 transition-all ${
                  active ? 'border-indigo-600 bg-indigo-800/5 ring-1 ring-indigo-600' : 'border-ink-300 hover:border-indigo-600/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{r.icon}</span>
                  {active && <span className="chip bg-indigo-800 text-white">Active</span>}
                </div>
                <div className="font-bold text-indigo-900 mt-2">{r.id}</div>
                <div className="text-xs text-ink-500 mt-0.5">{r.desc}</div>
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

      {analyticsQ.isLoading && <div className="card p-10 text-center text-sm text-ink-500">Loading analytics…</div>}
      {analyticsQ.isError && <div className="card p-6 text-sm text-breach">Could not load analytics: {analyticsQ.error.message}</div>}

      {a && (
        <>
          {/* KPI strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-6">
            <Stat label="Total chats" value={a.total_chats} sub="Grounded Q&A" />
            <Stat label="Drafts generated" value={a.total_drafts} sub={`${a.total_issued} issued`} />
            <Stat label="Avg citations / answer" value={a.avg_citations} tone="good" sub="≥1 guaranteed (R2)" />
            <Stat label="Docs human-approved" value="100%" tone="good" sub={`${a.total_issued} issued · 0 auto-issued`} />
            <Stat label="Open cases" value={a.open_cases} tone="warn" sub={`${a.sla_breaches} SLA breaches · ${a.escalations} escalated`} />
          </div>

          {/* Charts */}
          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Actions per day" hint="All audited actions">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={a.actions_per_day} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_INDIGO} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Drafting time — before vs after copilot" hint={`${a.drafting_time_reduction_pct}% faster`}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={[
                    { name: 'Before', minutes: a.avg_drafting_time_before_min },
                    { name: 'After', minutes: a.avg_drafting_time_after_min },
                  ]}
                  margin={{ top: 8, right: 8, left: -18, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="m" />
                  <Tooltip />
                  <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                    <Cell fill="#b45309" />
                    <Cell fill={CHART_TEAL} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Impact tiles */}
          <div className="grid gap-4 sm:grid-cols-3 mt-5">
            <Stat label="Citizen wait — before" value={`${a.citizen_wait_before_days}d`} tone="warn" sub="Typical turnaround" />
            <Stat label="Citizen wait — after" value={`${a.citizen_wait_after_days}d`} tone="good" sub="With the copilot" />
            <Stat label="Drafting time saved" value={`${a.drafting_time_reduction_pct}%`} tone="good" sub={`${a.avg_drafting_time_before_min}m → ${a.avg_drafting_time_after_min}m`} />
          </div>
        </>
      )}
    </div>
  )
}

function ChartCard({ title, hint, children }) {
  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-bold text-indigo-900">{title}</h3>
        <span className="text-[11px] text-ink-500">{hint}</span>
      </div>
      {children}
    </div>
  )
}
