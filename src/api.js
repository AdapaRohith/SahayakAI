// ---------------------------------------------------------------------------
// GovAssist AI backend client. BASE already includes `/api`
// (e.g. https://mrdu.avlokai.com/api). Override with VITE_API_URL.
//
// Every non-2xx throws an ApiError carrying `.status`, so callers can branch on
// an expected 409 (draft→approve→issue guard, advance-past-final) and surface it
// inline instead of crashing.
// ---------------------------------------------------------------------------

const BASE = import.meta.env.VITE_API_URL ?? 'https://mrdu.avlokai.com/api'

export class ApiError extends Error {
  constructor(status, body) {
    super(`${status} ${body}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

async function req(path, init) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch (networkErr) {
    throw new ApiError(0, `Cannot reach the backend at ${BASE}. (${networkErr.message})`)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ApiError(res.status, body || res.statusText)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

const get = (path) => req(path)
const post = (path, body) => req(path, { method: 'POST', body: JSON.stringify(body) })
const put = (path, body) => req(path, { method: 'PUT', body: JSON.stringify(body) })

// Multipart upload — do NOT set Content-Type; the browser adds the boundary.
async function upload(path, formData) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, { method: 'POST', body: formData })
  } catch (networkErr) {
    throw new ApiError(0, `Cannot reach the backend at ${BASE}. (${networkErr.message})`)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ApiError(res.status, body || res.statusText)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export const API_BASE = BASE

export const api = {
  // Chat & RAG. `lang` (en|hi|te) asks the backend to answer in the
  // user's selected language so the whole experience — not just the UI
  // chrome — follows the language switcher.
  chat: (query, actor, lang) => post('/chat', { query, actor, lang }),
  classify: (query, actor, lang) => post('/classify', { query, actor, lang }),
  translate: (text, target) => post('/translate', { text, target }),

  // Cases + workflow
  getCases: () => get('/cases'),
  getCase: (id) => get(`/cases/${id}`),
  createCase: (body) => post('/cases', body),
  advanceCase: (id, actor) => post(`/cases/${id}/advance`, { actor }),
  escalateCase: (id, actor, reason) => post(`/cases/${id}/escalate`, { actor, reason }),
  getWorkflows: () => get('/workflows'),

  // Multi-department workflow: departments, their queues, routes and routing.
  // Case responses now also carry route_id / current_department_id /
  // current_department_name / current_stage_order.
  getDepartments: () => get('/departments'),
  getDepartment: (id) => get(`/departments/${id}`),
  getDepartmentQueue: (id) => get(`/departments/${id}/queue`),
  // Queue items advance the underlying case; complete auto-advances to the next dept.
  startQueueItem: (deptId, queueId) => post(`/departments/${deptId}/queue/${queueId}/start`, {}),
  completeQueueItem: (deptId, queueId) => post(`/departments/${deptId}/queue/${queueId}/complete`, {}),

  getRoutes: () => get('/routes'),
  getRoute: (id) => get(`/routes/${id}`),
  createRoute: (body) => post('/routes', body),

  // Case routing across departments.
  assignRoute: (id, route_id, actor) => post(`/cases/${id}/assign-route`, { route_id, actor }),
  routeNextCase: (id) => post(`/cases/${id}/route-next`, {}),
  createRoutedCase: (body) => post('/cases/routed', body),

  // Documents lifecycle: draft → approve → issue
  getTemplates: () => get('/templates'),
  // `language` (hi|te|bn|…) drives language-aware drafting; backend auto-detects
  // when omitted. `lang` kept for backward-compatible servers.
  draftDocument: (case_id, template_id, actor, lang) => post('/documents/draft', { case_id, template_id, actor, lang, language: lang }),
  autofill: (case_id, template_id, fields, actor, lang) => post('/autofill', { case_id, template_id, fields, actor, language: lang }),
  saveDocument: (id, content) => put(`/documents/${id}`, { content }),
  approveDocument: (id, actor) => post(`/documents/${id}/approve`, { actor }),
  issueDocument: (id, actor) => post(`/documents/${id}/issue`, { actor }),

  // Certified PDF render of a document (GET /documents/{id}/pdf).
  // `documentPdfUrl` is the raw endpoint (direct download link). `fetchDocumentPdf`
  // pulls it as a Blob so the UI can build an object URL — that renders inline in an
  // <iframe> even though the endpoint sends `Content-Disposition: attachment`.
  documentPdfUrl: (id) => `${BASE}/documents/${id}/pdf`,
  fetchDocumentPdf: async (id) => {
    let res
    try {
      res = await fetch(`${BASE}/documents/${id}/pdf`)
    } catch (networkErr) {
      throw new ApiError(0, `Cannot reach the backend at ${BASE}. (${networkErr.message})`)
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new ApiError(res.status, body || res.statusText)
    }
    return res.blob()
  },

  // Document upload → OCR field extraction (multipart/form-data)
  extract: (docType, file) => {
    const fd = new FormData()
    fd.append('doc_type', docType)
    fd.append('file', file)
    return upload('/extract', fd)
  },

  // Schemes
  getSchemes: () => get('/schemes'),
  checkEligibility: (scheme_id, fields, actor) => post('/schemes/eligibility', { scheme_id, fields, actor }),

  // Audit + analytics
  getAudit: () => get('/audit'),
  getAnalytics: () => get('/analytics/summary'),
}
