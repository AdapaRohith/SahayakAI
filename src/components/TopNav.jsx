import { NavLink, useNavigate } from 'react-router-dom'
import { googleLogout } from '@react-oauth/google'
import { useApp } from '../store/AppContext.jsx'
import { useT, LANGS } from '../lib/i18n.js'
import { Shield } from './ui.jsx'

// Which modules each role may see. This is the visible half of RBAC —
// the /admin toggle drives which links render.
export const ROLE_ROUTES = {
  Citizen: ['/assistant', '/requests'],
  Officer: ['/assistant', '/requests', '/officer', '/workflow', '/departments', '/audit'],
  Supervisor: ['/assistant', '/requests', '/officer', '/workflow', '/departments', '/audit', '/admin'],
}

// Route -> i18n key (t.nav[key]) so tab labels translate with the language.
// Order mirrors the reference design (Reports sits before Audit Trail).
const NAV = [
  { to: '/assistant', key: 'assistant' },
  { to: '/requests', key: 'requests' },
  { to: '/officer', key: 'officer' },
  { to: '/workflow', key: 'workflow' },
  { to: '/departments', key: 'departments' },
  { to: '/admin', key: 'analytics' },
  { to: '/audit', key: 'audit' },
]

const ROLES = ['Citizen', 'Officer', 'Supervisor']

export default function TopNav() {
  const { role, setRole, user, logout, lang, setLang } = useApp()
  const t = useT()
  const navigate = useNavigate()

  const allowed = ROLE_ROUTES[role]
  const links = NAV.filter((n) => allowed.includes(n.to))

  function handleLogout() {
    googleLogout()
    logout()
    navigate('/login', { replace: true })
  }

  const navLinkClass = ({ isActive }) =>
    `px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-150 ${
      isActive ? 'bg-teal-500 text-white shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'
    }`

  return (
    // Floating rounded bar — the page background stays visible around it.
    <div className="sticky top-0 z-40 bg-ink-50 px-3 sm:px-4 pt-3 pb-2">
      <header
        data-guide="nav"
        className="mx-auto max-w-[1640px] rounded-2xl bg-indigo-950 text-white shadow-[0_10px_30px_rgba(2,6,23,0.25)]"
      >
        <div className="px-4 sm:px-5">
          <div className="flex h-[68px] items-center gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500 text-white shadow-sm">
                <Shield className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <div className="font-extrabold tracking-tight text-white">
                  Sahayak<span className="text-teal-400">AI</span>
                </div>
                <div className="text-[9px] uppercase tracking-widest text-white/50">{t.nav.tagline}</div>
              </div>
            </div>

            {/* Nav links — directly on the bar, teal pill marks the active tab */}
            <nav className="hidden lg:flex items-center gap-1 ml-2 overflow-x-auto no-scrollbar">
              {links.map((n) => (
                <NavLink key={n.to} to={n.to} className={navLinkClass}>
                  {t.nav[n.key]}
                </NavLink>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2.5 shrink-0">
              {/* Language selector */}
              <label className="relative">
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  aria-label={t.nav.language}
                  className="appearance-none rounded-xl bg-white/10 ring-1 ring-white/15 text-white text-sm font-semibold pl-3.5 pr-8 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 cursor-pointer hover:bg-white/15 transition-colors"
                >
                  {LANGS.map((l) => (
                    <option key={l.id} value={l.id} className="text-ink-900">{l.native}</option>
                  ))}
                </select>
                <Caret />
              </label>

              {/* Role selector (RBAC) */}
              <label className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  aria-label={t.nav.role}
                  className="appearance-none rounded-xl bg-white/10 ring-1 ring-white/15 text-white text-sm font-semibold pl-3.5 pr-8 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 cursor-pointer hover:bg-white/15 transition-colors"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r} className="text-ink-900">{t.nav.roles[r]}</option>
                  ))}
                </select>
                <Caret />
              </label>

              {/* Signed-in Google user + logout */}
              {user && (
                <div className="flex items-center gap-2.5 pl-1">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-full border border-white/25 object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-white text-sm font-bold">
                      {(user.name || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="hidden sm:block leading-tight max-w-[150px]">
                    <div className="text-sm font-bold text-white truncate">{user.name}</div>
                    <div className="text-[10px] text-white/50 truncate">{user.email}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    title={t.nav.signOut}
                    aria-label={t.nav.signOut}
                    className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
                  >
                    <LogoutIcon />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Compact nav — scrolls horizontally below the brand row */}
          <nav className="lg:hidden flex items-center gap-1 pb-2.5 overflow-x-auto no-scrollbar">
            {links.map((n) => (
              <NavLink key={n.to} to={n.to} className={navLinkClass}>
                {t.nav[n.key]}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
    </div>
  )
}

function Caret() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/70"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 17l5-5-5-5M20 12H9M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
