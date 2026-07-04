// ---------------------------------------------------------------------------
// Thin fetch layer over the backend (Section A contracts). Base URL comes from
// VITE_API_URL and falls back to the local backend. Every non-2xx response
// throws — including an expected 409 from approve/issue — so TanStack Query
// surfaces it to the caller (R3). We attach `.status` for callers that want to
// branch on it (e.g. show the 409 inline instead of a generic toast).
// ---------------------------------------------------------------------------

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

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
    // Backend not running / CORS / DNS — give a readable message.
    throw new ApiError(0, `Cannot reach backend at ${BASE}. Is it running? (${networkErr.message})`)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new ApiError(res.status, body) // surfaces 409 etc. to Query
  }
  // Some endpoints may 204; guard against empty bodies.
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export const get = (path) => req(path)
export const post = (path, body) => req(path, { method: 'POST', body: JSON.stringify(body) })
export const put = (path, body) => req(path, { method: 'PUT', body: JSON.stringify(body) })

// ---- Typed-ish endpoint helpers (Section A) ------------------------------

export const api = {
  base: BASE,

  chat: (query, actor) => post('/api/chat', { query, actor }),

  getCases: () => get('/api/cases'),
  createCase: (body) => post('/api/cases', body),

  getTemplates: () => get('/api/templates'),

  draftDocument: (case_id, template_id, actor) =>
    post('/api/documents/draft', { case_id, template_id, actor }),
  saveDocument: (id, content) => put(`/api/documents/${id}`, { content }),
  approveDocument: (id, actor) => post(`/api/documents/${id}/approve`, { actor }),
  issueDocument: (id, actor) => post(`/api/documents/${id}/issue`, { actor }),

  getAudit: () => get('/api/audit'),
  getAnalytics: () => get('/api/analytics/summary'),

  translate: (text, target) => post('/api/translate', { text, target }),
}
