import 'dotenv/config'
import express from 'express'

const app = express()
const port = Number(process.env.PORT || 5173)
const production = process.argv.includes('--production')

// Backend that actually serves the AI Voice Guide. Override with GUIDE_API_URL.
const GUIDE_BACKEND = process.env.GUIDE_API_URL || 'https://mrdu.avlokai.com/api/guide'

const ALLOWED_ORIGIN_RE = /^(https:\/\/.*\.(avlokai\.com|vercel\.app|pages\.dev)|http:\/\/localhost:\d+)$/

app.use(express.json({ limit: '100kb' }))

// Minimal CORS — this endpoint is normally same-origin (the SPA is served by
// this server), but keep headers correct for any cross-origin caller.
function applyCors(req, res) {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGIN_RE.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

app.options('/api/guide', (req, res) => {
  applyCors(req, res)
  res.status(204).end()
})

// Thin proxy → forward the guide request to the real backend. No OpenAI key
// lives here anymore; the backend owns the model call and prompt.
app.post('/api/guide', async (req, res) => {
  applyCors(req, res)
  try {
    const upstream = await fetch(GUIDE_BACKEND, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    })
    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', 'application/json')
    return res.send(text)
  } catch (error) {
    console.error('[Sahayak Guide] proxy to backend failed:', error)
    return res.status(502).json({ error: error?.message || 'Guide backend request failed.' })
  }
})

if (production) {
  app.use(express.static('dist'))
  app.use((_req, res) => res.sendFile('index.html', { root: 'dist' }))
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' })
  app.use(vite.middlewares)
}

app.listen(port, () => {
  console.log(`SahayakAI running at http://localhost:${port}`)
})
