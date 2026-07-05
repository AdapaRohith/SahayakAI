// The browser calls our same-origin server. OPENAI_API_KEY is read only by
// server.mjs and is never included in the Vite bundle.
export async function askGuide(payload) {
  const response = await fetch('/api/guide', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body.error || `Guide request failed (${response.status})`)
  }

  return {
    reply: typeof body.reply === 'string' ? body.reply : '',
    action: body.action === 'highlight' ? 'highlight' : 'none',
    target: body.target == null ? null : String(body.target),
  }
}
