import { NavLink } from 'react-router-dom'
import { useApp } from '../store/AppContext.jsx'
import { Shield } from './ui.jsx'

// Which modules each role may see. This is the visible half of RBAC —
// the /admin toggle drives which links render.
export const ROLE_ROUTES = {
  Citizen: ['/assistant'],
  Officer: ['/assistant', '/officer', '/workflow', '/audit'],
  Supervisor: ['/assistant', '/officer', '/workflow', '/audit', '/admin'],
}

const NAV = [
  { to: '/assistant', label: 'Assistant', hint: 'Citizen' },
  { to: '/officer', label: 'Officer Copilot', hint: 'Draft' },
  { to: '/workflow', label: 'Workflow & SLA', hint: 'Cases' },
  { to: '/audit', label: 'Audit Trail', hint: 'Immutable' },
  { to: '/admin', label: 'Admin', hint: 'Analytics' },
]

const ROLES = ['Citizen', 'Officer', 'Supervisor']

export default function TopNav() {
  const { role, setRole, audit } = useApp()
  const allowed = ROLE_ROUTES[role]
  const links = NAV.filter((n) => allowed.includes(n.to))

  return (
    <header className="sticky top-0 z-40 bg-indigo-900 text-white shadow-panel">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="flex h-16 items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600">
              <Shield className="h-5 w-5 text-white" />
            </span>
            <div className="leading-tight">
              <div className="font-extrabold tracking-tight">SahayakAI</div>
              <div className="text-[10px] uppercase tracking-widest text-teal-300">Govt AI Copilot</div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1 ml-2 overflow-x-auto scroll-slim">
            {links.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                    isActive ? 'bg-white/15 text-white' : 'text-indigo-100/80 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {/* Live audit counter — reinforces "every action is logged" */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-teal-200">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulseDot" />
              {audit.length} audited actions
            </div>

            {/* Role switcher (RBAC) */}
            <label className="flex items-center gap-2">
              <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-indigo-200">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-lg bg-indigo-800 border border-indigo-700 text-white text-sm font-semibold px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto scroll-slim">
          {links.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  isActive ? 'bg-white/15 text-white' : 'text-indigo-100/80 hover:bg-white/10'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
