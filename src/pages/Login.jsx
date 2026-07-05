import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useApp } from '../store/AppContext.jsx'
import { useT } from '../lib/i18n.js'
import { Icon } from '../components/ui.jsx'

// Role tabs mirror the reference mockup (CITIZEN / GOV OFFICER / SUPERVISOR).
// `role` maps to the AppContext role values used for visible-RBAC + actor.
const TABS = [
  { role: 'Citizen', label: 'Citizen', icon: 'user' },
  { role: 'Officer', label: 'Gov Officer', icon: 'briefcase' },
  { role: 'Supervisor', label: 'Supervisor', icon: 'shield' },
]

// Welcome copy swaps with the selected role, matching the left panel of the ref.
const WELCOME = {
  Citizen: {
    heading: 'WELCOME CITIZENS!',
    body: 'Access resources, report concerns, and join local projects.',
  },
  Officer: {
    heading: 'WELCOME, OFFICER',
    body: 'Review cases, manage requests, and act on grounded, cited guidance.',
  },
  Supervisor: {
    heading: 'WELCOME, SUPERVISOR',
    body: 'Oversee workflows, audit decisions, and approve with confidence.',
  },
}

export default function Login() {
  const { login, loginLocal, isAuthed, role, setRole } = useApp()
  const t = useT()
  const tl = t.login
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState(null)

  const redirectTo = location.state?.from || '/assistant'
  if (isAuthed) {
    navigate(redirectTo, { replace: true })
    return null
  }

  // Real Google credential path (kept as the working fallback).
  function handleGoogle(cred) {
    const profile = login(cred.credential)
    if (profile) navigate(redirectTo, { replace: true })
    else setError(tl.profileFail || 'Could not read Google profile.')
  }

  // Any username/password is accepted — demo auth, no server check.
  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    const name = email ? email.split('@')[0] : role
    loginLocal({ name, email })
    navigate(redirectTo, { replace: true })
  }

  // Apple / GovID are demo providers — sign in locally as the selected role.
  function handleDemoProvider(provider) {
    loginLocal({ name: `${role} (${provider})`, email: '' })
    navigate(redirectTo, { replace: true })
  }

  const welcome = WELCOME[role] || WELCOME.Citizen

  return (
    <div className="min-h-screen bg-ink-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 bg-white rounded-3xl shadow-panel overflow-hidden animate-slideIn">
        {/* ---- Left: illustrative welcome panel ---- */}
        <div className="relative hidden lg:flex flex-col justify-between p-9 text-ink-900 overflow-hidden">
          <ParkScene />
          <div className="relative z-10 flex flex-col items-center gap-3 text-center">
            <img src="/favicon-512.png" alt="" className="h-20 w-20 drop-shadow-sm" />
            <span className="font-extrabold text-2xl tracking-tight">SahayakAI</span>
          </div>
          <div className="relative z-10">
            <h2 className="text-xl font-extrabold tracking-tight">{welcome.heading}</h2>
            <p className="mt-2 text-sm text-ink-700 max-w-xs">{welcome.body}</p>
            <h1 className="mt-8 text-3xl font-black tracking-tight text-ink-950">
              Log in to your account
            </h1>
          </div>
        </div>

        {/* ---- Right: auth form ---- */}
        <div className="p-7 sm:p-10">
          {/* Role tabs */}
          <div className="flex items-center gap-1 border-b border-ink-200" role="tablist" aria-label="Account type">
            {TABS.map((tab) => {
              const active = role === tab.role
              return (
                <button
                  key={tab.role}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setRole(tab.role)}
                  className={`relative flex-1 px-2 py-3 text-xs sm:text-sm font-bold uppercase tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 rounded-t-lg ${
                    active ? 'text-accent-800' : 'text-ink-400 hover:text-ink-700'
                  }`}
                >
                  {tab.label}
                  <span
                    aria-hidden
                    className={`absolute left-0 right-0 -bottom-px h-[3px] rounded-full bg-accent-700 transition-transform duration-300 origin-center ${
                      active ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-ink-800 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-ink-300 bg-white pl-4 pr-11 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/30 transition-shadow"
                />
                <MailIcon className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-400" />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-pw" className="block text-sm font-semibold text-ink-800 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-pw"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-ink-300 bg-white pl-4 pr-11 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/30 transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-700 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <div className="mt-1.5 text-right">
                <button type="button" className="text-sm font-semibold text-accent-700 hover:text-accent-800">
                  Forgot Password?
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2 text-sm text-ink-700 select-none cursor-pointer w-max">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-ink-300 text-accent-700 focus:ring-accent-600"
              />
              Remember Me?
            </label>

            {error && (
              <p className="text-xs text-breach inline-flex items-center gap-1.5" role="alert">
                <Icon name="alert" className="h-3.5 w-3.5 shrink-0" /> {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-accent-700 hover:bg-accent-800 active:scale-[0.99] text-white font-bold py-3 text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
            >
              Log In
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3 text-xs font-medium text-ink-400">
            <span className="h-px flex-1 bg-ink-200" />
            Or Continue With
            <span className="h-px flex-1 bg-ink-200" />
          </div>

          {/* Social / fallback providers */}
          <div className="flex items-center justify-center gap-3">
            {/* Real Google login (working fallback) as a circular icon button */}
            <div className="[&>div]:!shadow-none">
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() => setError(tl.googleFail || 'Google sign-in failed.')}
                useOneTap={false}
                type="icon"
                shape="circle"
                size="large"
              />
            </div>
            <ProviderButton label="Apple" onClick={() => handleDemoProvider('Apple')}>
              <AppleIcon />
            </ProviderButton>
            <ProviderButton label="GovID" onClick={() => handleDemoProvider('GovID')}>
              <span className="text-[11px] font-black tracking-tight text-ink-800">GovID</span>
            </ProviderButton>
          </div>

          <p className="mt-7 text-center text-sm text-ink-500">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={handleSubmit}
              className="font-bold text-accent-700 hover:text-accent-800"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

// Round provider button shell matching the reference social row.
function ProviderButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Continue with ${label}`}
      className="flex h-12 w-16 items-center justify-center rounded-xl border border-ink-200 bg-white hover:bg-ink-50 hover:border-ink-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
    >
      {children}
    </button>
  )
}

// ---- Lightweight CSS/SVG illustration for the welcome panel ----
function ParkScene() {
  return (
    <div className="absolute inset-0" aria-hidden>
      {/* sky */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-50" />
      {/* sun */}
      <div className="absolute top-8 right-10 h-16 w-16 rounded-full bg-amber-200/70 blur-[2px]" />
      {/* city silhouette */}
      <svg className="absolute bottom-[38%] left-0 right-0 w-full text-sky-300/60" viewBox="0 0 400 80" fill="currentColor" preserveAspectRatio="none">
        <rect x="20" y="30" width="34" height="50" />
        <rect x="64" y="14" width="28" height="66" />
        <rect x="104" y="40" width="30" height="40" />
        <rect x="150" y="8" width="24" height="72" />
        <rect x="188" y="34" width="34" height="46" />
        <rect x="236" y="20" width="26" height="60" />
        <rect x="276" y="44" width="30" height="36" />
        <rect x="320" y="16" width="28" height="64" />
        <rect x="360" y="36" width="26" height="44" />
      </svg>
      {/* ground */}
      <div className="absolute bottom-0 left-0 right-0 h-[38%] bg-gradient-to-b from-emerald-200 to-emerald-300" />
      {/* trees */}
      <div className="absolute bottom-[30%] left-10 h-14 w-14 rounded-full bg-emerald-400/70" />
      <div className="absolute bottom-[28%] left-24 h-10 w-10 rounded-full bg-emerald-500/60" />
      <div className="absolute bottom-[31%] right-16 h-16 w-16 rounded-full bg-emerald-400/60" />
      {/* soft white fade so text stays readable */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-white/85 via-white/40 to-transparent" />
    </div>
  )
}

// ---- Inline icons not in the shared set ----
function MailIcon({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" />
      <path d="M6.6 6.6C3.8 8.3 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M3 3l18 18" />
    </svg>
  )
}
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-900" fill="currentColor">
      <path d="M16.4 12.9c0-2.2 1.8-3.3 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.4 1.1 8.5.7 1 1.5 2.1 2.6 2.1 1 0 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.6 1.1 0 1.8-1 2.5-2a8.8 8.8 0 0 0 1.1-2.3c-.1 0-2.1-.8-2.1-3.2zM14.3 6.3c.6-.7 1-1.7.9-2.7-.8 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.5.9.1 1.8-.4 2.5-1.1z" />
    </svg>
  )
}
