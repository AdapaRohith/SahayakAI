import 'dotenv/config'
import express from 'express'
import OpenAI from 'openai'

const app = express()
const port = Number(process.env.PORT || 5173)
const production = process.argv.includes('--production')

app.use(express.json({ limit: '100kb' }))

const languageNames = { en: 'English', te: 'Telugu', hi: 'Hindi' }
const systemInstruction = `You are "Sahayak Guide", a voice navigation assistant embedded in an Indian government services web portal (SahayakAI).

You are not a general chatbot. Your only job is to help the user navigate this portal by telling them where to tap and highlighting the right on-screen element.

Rules:
- Reply in the user's selected language.
- Keep "reply" to one short, spoken-friendly sentence.
- Only choose a "target" from the supplied navigation items and buttons, using its exact slug.
- If nothing fits, use action "none" and target null.
- Never invent targets, URLs, or features that are absent from the supplied context.`

const instructionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: { type: 'string' },
    action: { type: 'string', enum: ['highlight', 'none'] },
    target: { type: ['string', 'null'] },
  },
  required: ['reply', 'action', 'target'],
}

app.post('/api/guide', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'OPENAI_API_KEY is not configured on the server.' })
  }

  const { context, transcript, language = 'en' } = req.body ?? {}
  if (!context || typeof transcript !== 'string' || !transcript.trim()) {
    return res.status(400).json({ error: 'context and transcript are required.' })
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      instructions: systemInstruction,
      input: [
        `User selected language: ${languageNames[language] || 'English'} (${language})`,
        `User said: ${JSON.stringify(transcript)}`,
        'Current page context:',
        JSON.stringify(context),
      ].join('\n'),
      temperature: 0.2,
      text: {
        format: {
          type: 'json_schema',
          name: 'guide_instruction',
          strict: true,
          schema: instructionSchema,
        },
      },
    })

    return res.json(JSON.parse(response.output_text))
  } catch (error) {
    console.error('[Sahayak Guide] OpenAI request failed:', error)
    const status = Number.isInteger(error?.status) ? error.status : 502
    return res.status(status).json({ error: error?.message || 'OpenAI request failed.' })
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
