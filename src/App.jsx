import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import TopNav, { ROLE_ROUTES } from './components/TopNav.jsx'
import { useApp } from './store/AppContext.jsx'
import { useT } from './lib/i18n.js'

const Login = lazy(() => import('./pages/Login.jsx'))
const Assistant = lazy(() => import('./pages/Assistant.jsx'))
const Officer = lazy(() => import('./pages/Officer.jsx'))
const Workflow = lazy(() => import('./pages/Workflow.jsx'))
const Audit = lazy(() => import('./pages/Audit.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))

function PageFallback() {
  return <div className="py-20 text-center text-sm text-ink-400">…</div>
}

// Auth gate toggle. Kept OFF during testing so we don't sign in on every reload.
// Flip VITE_REQUIRE_AUTH=true (or set the default below to true) to re-enable
// the Google login gate before shipping. All login code stays wired.
const REQUIRE_AUTH = import.meta.env.VITE_REQUIRE_AUTH === 'true'

// Blocks a route the current role is not permitted to see (visible RBAC).
function Guard({ path, children }) {
  const { role } = useApp()
  if (!ROLE_ROUTES[role].includes(path)) {
    return <AccessDenied path={path} />
  }
  return children
}

function AccessDenied({ path }) {
  const { role } = useApp()
  const t = useT()
  return (
    <div className="mx-auto max-w-lg mt-20 card p-8 text-center animate-slideIn">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-950 text-white">
        <LockIcon />
      </div>
      <h2 className="text-xl font-extrabold text-ink-950">{t.shell.accessTitle}</h2>
      <p className="text-sm text-ink-500 mt-2">
        {t.shell.accessBodyPre} <span className="font-semibold text-ink-800">{t.nav.roles[role]}</span> {t.shell.accessBodyMid}{' '}
        <code className="font-mono text-ink-700">{path}</code>. {t.shell.accessBodyPost}
      </p>
    </div>
  )
}

// Authenticated application shell (nav + routed pages + footer). Redirects to
// /login when there is no signed-in Google user.
function AuthedShell() {
  const { isAuthed } = useApp()
  const t = useT()
  const location = useLocation()

  if (REQUIRE_AUTH && !isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main key={location.pathname} className="flex-1 mx-auto w-full max-w-[1400px] px-4 py-6 animate-slideIn">
        <Routes>
          <Route path="/" element={<Navigate to="/assistant" replace />} />
          <Route path="/assistant" element={<Guard path="/assistant"><Assistant /></Guard>} />
          <Route path="/officer" element={<Guard path="/officer"><Officer /></Guard>} />
          <Route path="/workflow" element={<Guard path="/workflow"><Workflow /></Guard>} />
          <Route path="/audit" element={<Guard path="/audit"><Audit /></Guard>} />
          <Route path="/admin" element={<Guard path="/admin"><Admin /></Guard>} />
          <Route path="*" element={<Navigate to="/assistant" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-ink-200 bg-white py-4">
        <div className="mx-auto max-w-[1400px] px-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
          <span>{t.shell.footerTagline}</span>
          <span className="flex items-center gap-2">
            <span className="chip border border-ink-300 text-ink-700">{t.common.grounded}</span>
            <span className="chip border border-ink-300 text-ink-700">{t.common.humanApproved}</span>
            <span className="chip bg-ink-950 text-white">{t.common.immutableAudit}</span>
          </span>
        </div>
      </footer>
    </div>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" strokeLinecap="round" />
    </svg>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={<AuthedShell />} />
      </Routes>
    </Suspense>
  )
}
