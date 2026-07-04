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

export const API_BASE = BASE

export const api = {
  // Chat & RAG
  chat: (query, actor) => post('/chat', { query, actor }),
  classify: (query, actor) => post('/classify', { query, actor }),
  translate: (text, target) => post('/translate', { text, target }),

  // Cases + workflow
  getCases: () => get('/cases'),
  getCase: (id) => get(`/cases/${id}`),
  createCase: (body) => post('/cases', body),
  advanceCase: (id, actor) => post(`/cases/${id}/advance`, { actor }),
  escalateCase: (id, actor, reason) => post(`/cases/${id}/escalate`, { actor, reason }),
  getWorkflows: () => get('/workflows'),

  // Documents lifecycle: draft → approve → issue
  getTemplates: () => get('/templates'),
  draftDocument: (case_id, template_id, actor) => post('/documents/draft', { case_id, template_id, actor }),
  saveDocument: (id, content) => put(`/documents/${id}`, { content }),
  approveDocument: (id, actor) => post(`/documents/${id}/approve`, { actor }),
  issueDocument: (id, actor) => post(`/documents/${id}/issue`, { actor }),

  // Schemes
  getSchemes: () => get('/schemes'),
  checkEligibility: (scheme_id, fields, actor) => post('/schemes/eligibility', { scheme_id, fields, actor }),

  // Audit + analytics
  getAudit: () => get('/audit'),
  getAnalytics: () => get('/analytics/summary'),
}
