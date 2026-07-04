import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { googleLogout } from '@react-oauth/google'
import { useApp } from '../store/AppContext.jsx'
import { useAudit } from '../lib/queries.js'
import { useT, LANGS } from '../lib/i18n.js'
import { Shield } from './ui.jsx'

// Which modules each role may see. This is the visible half of RBAC —
// the /admin toggle drives which links render.
export const ROLE_ROUTES = {
  Citizen: ['/assistant'],
  Officer: ['/assistant', '/officer', '/workflow', '/audit'],
  Supervisor: ['/assistant', '/officer', '/workflow', '/audit', '/admin'],
}

// Route -> i18n key (t.nav[key]) so tab labels translate with the language.
const NAV = [
  { to: '/assistant', key: 'assistant' },
  { to: '/officer', key: 'officer' },
  { to: '/workflow', key: 'workflow' },
  { to: '/audit', key: 'audit' },
  { to: '/admin', key: 'analytics' },
]

const ROLES = ['Citizen', 'Officer', 'Supervisor']

export default function TopNav() {
  const { role, setRole, user, logout, lang, setLang } = useApp()
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const auditQ = useAudit()
  const auditCount = auditQ.data?.length ?? 0
  const allowed = ROLE_ROUTES[role]
  const links = NAV.filter((n) => allowed.includes(n.to))

  // Sliding active-tab indicator. We measure the active link and move a single
  // underline bar to it — one shared element that glides between tabs.
  const navRef = useRef(null)
  const linkRefs = useRef({})
  const [ind, setInd] = useState({ left: 0, width: 0, ready: false })

  // Glass intensifies once the page scrolls — the bar lifts off the content.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useLayoutEffect(() => {
    const active = links.find((n) => location.pathname.startsWith(n.to))
    const el = active && linkRefs.current[active.to]
    if (el && navRef.current) {
      setInd({ left: el.offsetLeft, width: el.offsetWidth, ready: true })
    } else {
      setInd((s) => ({ ...s, ready: false }))
    }
  }, [location.pathname, links.length, role])

  function handleLogout() {
    googleLogout()
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-500 ease-out ${
        scrolled
          ? 'bg-white/70 backdrop-blur-xl border-ink-200 shadow-[0_6px_28px_rgba(0,0,0,0.07)]'
          : 'bg-white/55 backdrop-blur-md border-transparent'
      }`}
    >
      {/* Frosted top edge highlight — the glass catches light. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ink-300/70 to-transparent" />
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="flex h-16 items-center gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-700 text-white shadow-sm transition-transform duration-200 hover:scale-105">
              <Shield className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="font-extrabold tracking-tight text-ink-950">SahayakAI</div>
              <div className="text-[10px] uppercase tracking-widest text-ink-400">{t.nav.tagline}</div>
            </div>
          </div>

          {/* Nav links with sliding underline + glass hover pill */}
          <nav ref={navRef} className="relative hidden md:flex items-center gap-1 ml-2">
            {links.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                ref={(el) => (linkRefs.current[n.to] = el)}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 backdrop-blur-sm ${
                    isActive
                      ? 'text-accent-800 bg-accent-600/[0.08]'
                      : 'text-ink-500 hover:text-ink-900 hover:bg-ink-900/[0.05]'
                  }`
                }
              >
                {t.nav[n.key]}
              </NavLink>
            ))}
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-[1px] h-0.5 rounded-full bg-accent-600 transition-all duration-300 ease-out"
              style={{
                left: ind.left,
                width: ind.width,
                opacity: ind.ready ? 1 : 0,
              }}
            />
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {/* Live audit counter — reinforces "every action is logged" */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-ink-500">
              <span className="h-2 w-2 rounded-full bg-accent-600 animate-pulseDot" />
              {t.nav.auditedActions(auditCount)}
            </div>

            {/* Trust badge — nothing is issued without a human approval */}
            <span className="hidden xl:inline-flex chip border border-ink-300 text-ink-700 font-bold">
              {t.nav.humanApproved}
            </span>

            {/* Language switcher — applies across every page */}
            <label className="flex items-center gap-2">
              <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-ink-400">{t.nav.language}</span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                aria-label={t.nav.language}
                className="rounded-lg bg-white border border-ink-300 text-ink-900 text-sm font-semibold px-2.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 hover:border-accent-500 transition-colors"
              >
                {LANGS.map((l) => (
                  <option key={l.id} value={l.id}>{l.native}</option>
                ))}
              </select>
            </label>

            {/* Role switcher (RBAC) */}
            <label className="flex items-center gap-2">
              <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-ink-400">{t.nav.role}</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-lg bg-white border border-ink-300 text-ink-900 text-sm font-semibold px-2.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 hover:border-accent-500 transition-colors"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{t.nav.roles[r]}</option>
                ))}
              </select>
            </label>

            {/* Signed-in Google user + logout */}
            {user && (
              <div className="flex items-center gap-2 pl-2 sm:border-l sm:border-ink-200">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 rounded-full border border-ink-300 object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-950 text-white text-sm font-bold">
                    {(user.name || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="hidden sm:block leading-tight max-w-[140px]">
                  <div className="text-xs font-semibold text-ink-900 truncate">{user.name}</div>
                  <div className="text-[10px] text-ink-400 truncate">{user.email}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title={t.nav.signOut}
                  className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-950 transition-colors"
                  aria-label={t.nav.signOut}
                >
                  <LogoutIcon />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto scroll-slim">
          {links.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive ? 'bg-accent-700 text-white' : 'text-ink-500 hover:bg-ink-100'
                }`
              }
            >
              {t.nav[n.key]}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 17l5-5-5-5M20 12H9M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
