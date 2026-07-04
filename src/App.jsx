import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import TopNav, { ROLE_ROUTES } from './components/TopNav.jsx'
import { useApp } from './store/AppContext.jsx'
import Assistant from './pages/Assistant.jsx'
import Officer from './pages/Officer.jsx'
import Workflow from './pages/Workflow.jsx'
import Audit from './pages/Audit.jsx'
import Admin from './pages/Admin.jsx'

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
  return (
    <div className="mx-auto max-w-lg mt-20 card p-8 text-center">
      <div className="text-5xl mb-3">🔒</div>
      <h2 className="text-xl font-extrabold text-indigo-900">Access restricted</h2>
      <p className="text-sm text-ink-500 mt-2">
        The <span className="font-semibold">{role}</span> role cannot access{' '}
        <code className="font-mono text-ink-700">{path}</code>. Switch roles using the selector in
        the top navigation to view this module.
      </p>
    </div>
  )
}

export default function App() {
  const location = useLocation()
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
      <footer className="border-t border-ink-100 bg-white py-4">
        <div className="mx-auto max-w-[1400px] px-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
          <span>SahayakAI · Trustworthy, auditable, explainable government AI</span>
          <span className="flex items-center gap-2">
            <span className="chip bg-approved-bg text-approved">Grounded</span>
            <span className="chip bg-pending-bg text-pending">Human-approved</span>
            <span className="chip bg-indigo-800 text-white">Immutable audit</span>
          </span>
        </div>
      </footer>
    </div>
  )
}
