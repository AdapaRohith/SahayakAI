import { createContext, useContext, useState, useCallback, useMemo } from 'react'

// ---------------------------------------------------------------------------
// Tiny role/actor store. All domain data now lives in the GovAssist backend and
// is fetched via TanStack Query; this context only tracks the current role,
// which drives the visible-RBAC navigation and the `actor` sent on every call.
//
// Backend roles: citizen | officer | supervisor | admin (§18 R7).
// ---------------------------------------------------------------------------

const AppContext = createContext(null)

// UI role label -> the actor string the backend expects.
const ACTOR_FOR = {
  Citizen: 'citizen',
  Officer: 'officer',
  Supervisor: 'supervisor',
}

export function AppProvider({ children }) {
  const [role, setRole] = useState('Supervisor') // Citizen | Officer | Supervisor

  const changeRole = useCallback((r) => setRole(r), [])

  const value = useMemo(
    () => ({
      role,
      actor: ACTOR_FOR[role] ?? 'citizen',
      setRole: changeRole,
    }),
    [role, changeRole],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
