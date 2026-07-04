import { useMemo } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useApp, useAnalytics } from '../store/AppContext.jsx'
import { ROLE_ROUTES } from '../components/TopNav.jsx'
import { SectionTitle, Stat } from '../components/ui.jsx'

const ROLES = [
  { id: 'Citizen', desc: 'Sees only the citizen Assistant.', icon: '👤' },
  { id: 'Officer', desc: 'Assistant, Copilot, Workflow, Audit.', icon: '🧑‍💼' },
  { id: 'Supervisor', desc: 'Full access including Admin analytics.', icon: '🛡️' },
]

const STATUS_COLORS = {
  'In Progress': '#b45309',
  'Pending Approval': '#d97706',
  Breached: '#b91c1c',
  Resolved: '#15803d',
}

const CHART_INDIGO = '#3b2b96'
const CHART_TEAL = '#0d8b84'

export default function Admin() {
  const { role, setRole, cases, documents } = useApp()
  const a = useAnalytics()

  const statusData = useMemo(
    () => Object.entries(a.byStatus).map(([name, value]) => ({ name, value })),
    [a.byStatus],
  )

  const deptData = useMemo(() => {
    const m = {}
    for (const c of cases) m[c.department] = (m[c.department] || 0) + 1
    return Object.entries(m).map(([name, cases]) => ({ name: name.replace(' Administration', ' Admin'), cases }))
  }, [cases])

  const citationData = [
    { name: 'Verified citations', value: a.answered, color: CHART_TEAL },
    { name: 'Flagged unverified', value: a.flagged, color: '#b91c1c' },
  ]

  // Illustrative resolution-time trend (weeks).
  const trendData = [
    { week: 'W1', days: 8.9 },
    { week: 'W2', days: 7.8 },
    { week: 'W3', days: 7.1 },
    { week: 'W4', days: 6.7 },
    { week: 'W5', days: a.avgResolutionDays },
  ]

  return (
    <div>
      <SectionTitle
        eyebrow="Admin · Role-Based Access & Analytics"
        title="Access control and program health"
        subtitle="Toggle a role to gate which modules are visible across the app. Analytics update live as answers are given, drafts approved, and SLAs breach."
      />

      {/* Role toggle */}
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

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Stat label="Total cases" value={a.total} sub={`${a.resolved} resolved`} />
        <Stat label="SLA breach rate" value={`${a.breachRate}%`} tone={a.breachRate > 20 ? 'bad' : 'warn'} sub={`${a.breached} breached`} />
        <Stat label="Officer hours saved" value={`${a.officerHoursSaved.toFixed(0)}h`} tone="good" sub={`${documents.length} docs drafted`} />
        <Stat label="Verified answers" value={`${a.verifiedPct}%`} tone={a.flaggedPct > 0 ? 'warn' : 'good'} sub={`${a.flagged} flagged unverified`} />
      </div>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Cases by status" hint="Live from the workflow board">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                {statusData.map((d) => (
                  <Cell key={d.name} fill={STATUS_COLORS[d.name] || '#6b7280'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="AI answers: verified vs flagged" hint="Citation grounding rate">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={citationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {citationData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cases by department" hint="Rule-based routing distribution">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={deptData} margin={{ top: 8, right: 8, left: -18, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 11 }} height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="cases" fill={CHART_INDIGO} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Avg resolution time (days)" hint="Trending down with copilot assist">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis domain={[5, 10]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="days" stroke={CHART_TEAL} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
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
