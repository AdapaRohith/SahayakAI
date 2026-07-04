import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useApp } from '../store/AppContext.jsx'
import { Shield } from '../components/ui.jsx'

export default function Login() {
  const { login, isAuthed } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState(null)

  const redirectTo = location.state?.from || '/assistant'
  if (isAuthed) {
    navigate(redirectTo, { replace: true })
    return null
  }

  function handleSuccess(cred) {
    const profile = login(cred.credential)
    if (profile) navigate(redirectTo, { replace: true })
    else setError('Could not read your Google profile. Please try again.')
  }

  return (
    <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center px-4">
      {/* Wordmark */}
      <div className="flex items-center gap-2.5 mb-8">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600">
          <Shield className="h-6 w-6 text-white" />
        </span>
        <div className="leading-tight text-white">
          <div className="font-extrabold text-xl tracking-tight">SahayakAI</div>
          <div className="text-[11px] uppercase tracking-widest text-teal-300">Government AI Copilot</div>
        </div>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-panel p-8">
        <h1 className="text-2xl font-extrabold text-indigo-900 text-center">Sign in to continue</h1>
        <p className="text-sm text-ink-500 text-center mt-2">
          Use your Google account to access the citizen assistant, officer copilot, workflow board
          and audit trail.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError('Google sign-in failed. Check that this origin is authorised in Google Cloud Console.')}
            useOneTap={false}
            shape="pill"
            size="large"
            text="continue_with"
            width="320"
          />
          {error && (
            <p className="text-xs text-breach text-center max-w-xs" role="alert">⚠ {error}</p>
          )}
        </div>

        <div className="mt-7 pt-5 border-t border-ink-100 flex items-center justify-center gap-2 text-[11px] text-ink-500">
          <span className="chip bg-approved-bg text-approved">Grounded</span>
          <span className="chip bg-pending-bg text-pending">Human-approved</span>
          <span className="chip bg-indigo-800/10 text-indigo-800">Immutable audit</span>
        </div>
      </div>

      <p className="text-[11px] text-indigo-200/70 mt-6 max-w-sm text-center">
        Your role (Citizen / Officer / Supervisor) can be switched after signing in. Identity is
        provided by Google; the copilot never stores a password.
      </p>
    </div>
  )
}
