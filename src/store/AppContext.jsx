import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { jwtDecode } from 'jwt-decode'

// ---------------------------------------------------------------------------
// Auth + role/actor store.
//   - Identity comes from Google Sign-In (a JWT credential we decode client
//     side). Persisted to localStorage so a refresh keeps you signed in.
//   - Role drives the visible-RBAC navigation and the `actor` sent on every
//     backend call. Backend roles: citizen | officer | supervisor | admin.
// ---------------------------------------------------------------------------

const AppContext = createContext(null)
const STORAGE_KEY = 'sahayak.auth'
const LANG_KEY = 'sahayak.lang'

// UI role label -> the actor string the backend expects.
const ACTOR_FOR = {
  Citizen: 'citizen',
  Officer: 'officer',
  Supervisor: 'supervisor',
}

function loadUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function loadLang() {
  try {
    return localStorage.getItem(LANG_KEY) || 'en'
  } catch {
    return 'en'
  }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(loadUser) // { name, email, picture, sub } | null
  const [role, setRole] = useState('Supervisor') // Citizen | Officer | Supervisor
  const [lang, setLangState] = useState(loadLang) // en | hi | te — applies app-wide

  // Persist the language choice so it applies across every page and survives a refresh.
  const setLang = useCallback((next) => {
    setLangState(next)
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  // Accept a Google credential (JWT), decode the profile, and persist it.
  const login = useCallback((credential) => {
    try {
      const p = jwtDecode(credential)
      const profile = {
        name: p.name || p.email || 'Signed-in user',
        email: p.email || '',
        picture: p.picture || '',
        sub: p.sub || '',
      }
      setUser(profile)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
      return profile
    } catch {
      return null
    }
  }, [])

  // Demo / fallback sign-in: accept any name/email without a Google JWT.
  // Used by the email+password form and the non-Google social buttons.
  const loginLocal = useCallback((profile = {}) => {
    const p = {
      name: profile.name || (profile.email ? profile.email.split('@')[0] : 'User'),
      email: profile.email || '',
      picture: profile.picture || '',
      sub: profile.sub || 'local',
    }
    setUser(p)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    } catch {
      /* ignore */
    }
    return p
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthed: !!user,
      login,
      loginLocal,
      logout,
      role,
      actor: ACTOR_FOR[role] ?? 'citizen',
      setRole,
      lang,
      setLang,
    }),
    [user, login, loginLocal, logout, role, lang, setLang],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
