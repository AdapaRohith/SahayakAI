import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { shortHash } from '../lib/utils.js'

// ---------------------------------------------------------------------------
// Citizen-facing request tracker store — additive, in-memory only (no backend,
// no localStorage). This is the same conceptual "case store" the Workflow board
// works on, seen from the citizen's side. It seeds a few sample requests so the
// "My Requests" screen is alive on load, and exposes a DigiLocker handoff action
// that updates state live (Context-driven reactivity).
//
// The My Requests page ALSO folds in the citizen's real cases from the shared
// react-query case store (useCases), so when an officer approves/advances a case
// on the Workflow/Officer side it reflects here — without touching those screens.
// ---------------------------------------------------------------------------

// The demo citizen this tracker belongs to. Requests (seeded + live) are filtered
// to this name, matching "the logged-in citizen's" view.
export const CITIZEN = 'Anitha Reddy'

// A lifecycle step. state: 'done' | 'current' | 'future'.
const step = (key, state, at = null, by = null) => ({ key, state, at, by })

// An immutable audit record attached to a request.
const rec = (key, summary, ts) => ({ key, summary, ts })

// Seed requests across every status so all states are visible immediately.
function seedRequests() {
  return [
    // 1 — ISSUED: full lifecycle complete, document downloadable, DigiLocker
    //     handoff still available (completes the final step live when tapped).
    {
      id: 'req-0142',
      source: 'seed',
      refId: 'REQ-2026-0142',
      title: 'Income Certificate for college scholarship',
      department: 'Revenue Department',
      status: 'Issued',
      filedAt: '2026-06-20T09:12:00+05:30',
      slaBy: '2026-06-27T18:00:00+05:30',
      breached: false,
      officer: 'K. Rajesh (Tahsildar)',
      digilockerRef: null,
      docContent:
        'GOVERNMENT OF ANDHRA PRADESH\nREVENUE DEPARTMENT\n\nINCOME CERTIFICATE\n\nReference: REQ-2026-0142\nThis is to certify that Anitha Reddy, D/o Ramachandra Reddy, is a resident of\nKadapa district, and the annual family income is assessed as per records.\n\nIssued by: K. Rajesh, Tahsildar\nDate of issue: 25 Jun 2026\n\n— This is a system-generated, human-approved document. —',
      timeline: [
        step('filed', 'done', '2026-06-20T09:12:00+05:30'),
        step('routed', 'done', '2026-06-20T09:12:20+05:30'),
        step('drafted', 'done', '2026-06-22T11:40:00+05:30'),
        step('pending', 'done', '2026-06-23T10:05:00+05:30'),
        step('approved', 'done', '2026-06-25T15:20:00+05:30', 'K. Rajesh (Tahsildar)'),
        step('delivered', 'future'),
      ],
      audit: [
        rec('filed', 'Request filed by citizen', '2026-06-20T09:12:00+05:30'),
        rec('routed', 'Auto-routed to Revenue Department (confidence 96%)', '2026-06-20T09:12:20+05:30'),
        rec('drafted', 'Income certificate drafted from template', '2026-06-22T11:40:00+05:30'),
        rec('approved', 'Approved & issued by K. Rajesh (Tahsildar)', '2026-06-25T15:20:00+05:30'),
      ],
    },

    // 2 — PENDING OFFICER APPROVAL: mid-timeline, amber current step.
    {
      id: 'req-0138',
      source: 'seed',
      refId: 'REQ-2026-0138',
      title: 'Land Mutation — agricultural plot #231',
      department: 'Revenue Department',
      status: 'Pending Approval',
      filedAt: '2026-06-28T14:03:00+05:30',
      slaBy: '2026-07-06T18:00:00+05:30',
      breached: false,
      officer: null,
      digilockerRef: null,
      docContent: null,
      timeline: [
        step('filed', 'done', '2026-06-28T14:03:00+05:30'),
        step('routed', 'done', '2026-06-28T14:03:18+05:30'),
        step('drafted', 'done', '2026-07-01T12:15:00+05:30'),
        step('pending', 'current'),
        step('approved', 'future'),
        step('delivered', 'future'),
      ],
      audit: [
        rec('filed', 'Request filed by citizen', '2026-06-28T14:03:00+05:30'),
        rec('routed', 'Auto-routed to Revenue Department (confidence 92%)', '2026-06-28T14:03:18+05:30'),
        rec('drafted', 'Mutation order drafted; awaiting officer review', '2026-07-01T12:15:00+05:30'),
      ],
    },

    // 3 — IN PROGRESS / ROUTED: early in the lifecycle, drafting is current.
    {
      id: 'req-0151',
      source: 'seed',
      refId: 'REQ-2026-0151',
      title: 'Caste Certificate for job application',
      department: 'Social Welfare Department',
      status: 'In Progress',
      filedAt: '2026-07-03T10:48:00+05:30',
      slaBy: '2026-07-08T18:00:00+05:30',
      breached: false,
      officer: null,
      digilockerRef: null,
      docContent: null,
      timeline: [
        step('filed', 'done', '2026-07-03T10:48:00+05:30'),
        step('routed', 'done', '2026-07-03T10:48:12+05:30'),
        step('drafted', 'current'),
        step('pending', 'future'),
        step('approved', 'future'),
        step('delivered', 'future'),
      ],
      audit: [
        rec('filed', 'Request filed by citizen', '2026-07-03T10:48:00+05:30'),
        rec('routed', 'Auto-routed to Social Welfare Department (confidence 89%)', '2026-07-03T10:48:12+05:30'),
      ],
    },

    // 4 — DELAYED / ESCALATED: SLA breached, red banner, escalated to supervisor.
    {
      id: 'req-0129',
      source: 'seed',
      refId: 'REQ-2026-0129',
      title: 'Old-age Pension enrolment',
      department: 'Pensions Department',
      status: 'Breached',
      filedAt: '2026-06-10T08:30:00+05:30',
      slaBy: '2026-06-18T18:00:00+05:30',
      breached: true,
      officer: null,
      digilockerRef: null,
      docContent: null,
      timeline: [
        step('filed', 'done', '2026-06-10T08:30:00+05:30'),
        step('routed', 'done', '2026-06-10T08:30:25+05:30'),
        step('drafted', 'done', '2026-06-12T16:00:00+05:30'),
        step('pending', 'current'),
        step('approved', 'future'),
        step('delivered', 'future'),
      ],
      audit: [
        rec('filed', 'Request filed by citizen', '2026-06-10T08:30:00+05:30'),
        rec('routed', 'Auto-routed to Pensions Department (confidence 90%)', '2026-06-10T08:30:25+05:30'),
        rec('drafted', 'Enrolment form drafted; awaiting officer review', '2026-06-12T16:00:00+05:30'),
        rec('escalated', 'SLA breached — escalated to supervisor for attention', '2026-06-18T18:00:01+05:30'),
      ],
    },
  ]
}

const RequestsContext = createContext(null)

export function RequestsProvider({ children }) {
  const [requests, setRequests] = useState(seedRequests)

  // Mock DigiLocker handoff: stamps a reference, completes the "Delivered" step,
  // and appends an immutable audit record — all in memory, updates the UI live.
  const sendToDigiLocker = useCallback((id) => {
    const nowIso = new Date().toISOString()
    const ref = `DL-${shortHash(id + nowIso).toUpperCase().slice(0, 6)}`
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id || r.digilockerRef) return r
        return {
          ...r,
          digilockerRef: ref,
          timeline: r.timeline.map((s) =>
            s.key === 'delivered' ? { ...s, state: 'done', at: nowIso } : s,
          ),
          audit: [...r.audit, rec('delivered', `Delivered to DigiLocker · ${ref}`, nowIso)],
        }
      }),
    )
    return ref
  }, [])

  const value = useMemo(() => ({ requests, sendToDigiLocker }), [requests, sendToDigiLocker])
  return <RequestsContext.Provider value={value}>{children}</RequestsContext.Provider>
}

export function useRequests() {
  const ctx = useContext(RequestsContext)
  if (!ctx) throw new Error('useRequests must be used within RequestsProvider')
  return ctx
}
