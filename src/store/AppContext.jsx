import { createContext, useContext, useReducer, useCallback, useMemo } from 'react'
import { generateSeed } from '../data/seed.js'
import { shortHash, uid } from '../lib/utils.js'

// ---------------------------------------------------------------------------
// One Context store wires every module together. An approval in /officer
// instantly updates /audit and /admin analytics because they all read this
// single state tree.
// ---------------------------------------------------------------------------

const AppContext = createContext(null)

const seed = generateSeed()

const initialState = {
  role: 'Supervisor', // Citizen | Officer | Supervisor
  currentOfficer: 'K. Ramesh (Tahsildar)',
  cases: seed.cases,
  documents: seed.documents,
  audit: seed.audit,
  auditPrevHash: seed.prevHash,
}

// Append an audit entry, chaining its hash off the last entry's hash so the
// log is tamper-evident. Returns { audit, prevHash }.
function appendAudit(state, { actor, action, summary, sources = [], meta = {} }) {
  const id = `AUD-${String(state.audit.length + 1).padStart(4, '0')}`
  const timestamp = new Date().toISOString()
  const prevHash = state.auditPrevHash
  const payload = `${id}|${timestamp}|${actor}|${action}|${summary}|${sources.join(',')}|${prevHash}`
  const hash = shortHash(payload)
  const entry = { id, timestamp, actor, action, summary, sources, meta, prevHash, hash }
  return { audit: [...state.audit, entry], prevHash: hash }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, role: action.role }

    case 'LOG': {
      const { audit, prevHash } = appendAudit(state, action.entry)
      return { ...state, audit, auditPrevHash: prevHash }
    }

    case 'ADD_DOCUMENT': {
      const { audit, prevHash } = appendAudit(state, {
        actor: action.doc.createdBy,
        action: 'doc_drafted',
        summary: `AI drafted ${action.doc.templateName} for ${action.doc.values.applicantName || 'applicant'} (pending review)`,
        sources: action.doc.sources,
        meta: { doc: action.doc.templateName, docId: action.doc.id },
      })
      return {
        ...state,
        documents: [action.doc, ...state.documents],
        audit,
        auditPrevHash: prevHash,
      }
    }

    case 'APPROVE_DOCUMENT': {
      const doc = state.documents.find((d) => d.id === action.id)
      if (!doc) return state
      const issuedAt = new Date().toISOString()
      const documents = state.documents.map((d) =>
        d.id === action.id ? { ...d, status: 'Issued', issuedAt, approvedBy: action.actor } : d,
      )
      const { audit, prevHash } = appendAudit(state, {
        actor: action.actor,
        action: 'doc_approved',
        summary: `Approved & issued ${doc.templateName} for ${doc.values.applicantName || 'applicant'}`,
        sources: doc.sources,
        meta: { doc: doc.templateName, docId: doc.id },
      })
      return { ...state, documents, audit, auditPrevHash: prevHash }
    }

    case 'REJECT_DOCUMENT': {
      const doc = state.documents.find((d) => d.id === action.id)
      if (!doc) return state
      const documents = state.documents.map((d) =>
        d.id === action.id ? { ...d, status: 'Changes Requested', reviewNote: action.note, reviewedBy: action.actor } : d,
      )
      const { audit, prevHash } = appendAudit(state, {
        actor: action.actor,
        action: 'doc_requested_changes',
        summary: `Requested changes on ${doc.templateName}${action.note ? ` — "${action.note}"` : ''}`,
        sources: doc.sources,
        meta: { doc: doc.templateName, docId: doc.id },
      })
      return { ...state, documents, audit, auditPrevHash: prevHash }
    }

    case 'ESCALATE_CASE': {
      const c = state.cases.find((x) => x.id === action.id)
      if (!c || c.escalated) return state
      const cases = state.cases.map((x) =>
        x.id === action.id ? { ...x, status: 'Breached', escalated: true, escalationTier: 'Supervisor' } : x,
      )
      const { audit, prevHash } = appendAudit(state, {
        actor: 'AI · SahayakAI',
        action: 'sla_escalated',
        summary: `SLA breached on ${c.id} (${c.title}) — auto-escalated to Supervisor`,
        sources: [],
        meta: { case: c.id },
      })
      return { ...state, cases, audit, auditPrevHash: prevHash }
    }

    case 'ADD_CASE': {
      const { audit, prevHash } = appendAudit(state, {
        actor: 'AI · SahayakAI',
        action: 'case_routed',
        summary: `Auto-routed "${action.case.title}" → ${action.case.department}`,
        sources: [],
        meta: { case: action.case.id },
      })
      return { ...state, cases: [action.case, ...state.cases], audit, auditPrevHash: prevHash }
    }

    case 'RESOLVE_CASE': {
      const c = state.cases.find((x) => x.id === action.id)
      if (!c) return state
      const cases = state.cases.map((x) => (x.id === action.id ? { ...x, status: 'Resolved' } : x))
      return { ...state, cases }
    }

    default:
      return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const setRole = useCallback((role) => dispatch({ type: 'SET_ROLE', role }), [])

  const log = useCallback((entry) => dispatch({ type: 'LOG', entry }), [])

  const addDocument = useCallback((doc) => dispatch({ type: 'ADD_DOCUMENT', doc }), [])
  const approveDocument = useCallback((id, actor) => dispatch({ type: 'APPROVE_DOCUMENT', id, actor }), [])
  const rejectDocument = useCallback((id, actor, note) => dispatch({ type: 'REJECT_DOCUMENT', id, actor, note }), [])

  const escalateCase = useCallback((id) => dispatch({ type: 'ESCALATE_CASE', id }), [])
  const addCase = useCallback((c) => dispatch({ type: 'ADD_CASE', case: c }), [])
  const resolveCase = useCallback((id) => dispatch({ type: 'RESOLVE_CASE', id }), [])

  const value = useMemo(
    () => ({
      ...state,
      setRole,
      log,
      addDocument,
      approveDocument,
      rejectDocument,
      escalateCase,
      addCase,
      resolveCase,
      makeUid: uid,
    }),
    [state, setRole, log, addDocument, approveDocument, rejectDocument, escalateCase, addCase, resolveCase],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

// Derived analytics selector — kept here so /admin and any KPI strip agree.
export function useAnalytics() {
  const { cases, documents, audit } = useApp()
  return useMemo(() => {
    const byStatus = {}
    for (const c of cases) byStatus[c.status] = (byStatus[c.status] || 0) + 1

    const total = cases.length
    const breached = cases.filter((c) => c.status === 'Breached').length
    const resolved = cases.filter((c) => c.status === 'Resolved').length

    // Answered vs flagged from audit
    const answered = audit.filter((a) => a.action === 'query_answered').length
    const flagged = audit.filter((a) => a.action === 'query_flagged').length
    const totalAnswers = answered + flagged || 1

    return {
      byStatus,
      total,
      breached,
      resolved,
      breachRate: total ? Math.round((breached / total) * 100) : 0,
      avgResolutionDays: 6.4,
      officerHoursSaved: 3.2 * documents.length + 28,
      verifiedPct: Math.round((answered / totalAnswers) * 100),
      flaggedPct: Math.round((flagged / totalAnswers) * 100),
      answered,
      flagged,
      issued: documents.filter((d) => d.status === 'Issued').length,
      pending: documents.filter((d) => d.status === 'Pending Approval').length,
    }
  }, [cases, documents, audit])
}
