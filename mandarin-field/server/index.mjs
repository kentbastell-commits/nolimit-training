import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMandarinFeedback, createOpenAiClient, validateFeedbackRequest } from './feedback.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const isDevelopment = process.argv.includes('--dev')
const port = Number(process.env.PORT || 4310)
const model = process.env.OPENAI_MODEL || 'gpt-5.6-terra'
const openai = createOpenAiClient()
const app = express()
const windows = new Map()

app.disable('x-powered-by')
app.use(express.json({ limit: '24kb' }))

app.get('/api/mandarin/status', (_request, response) => {
  response.set('Cache-Control', 'no-store').json({ available: Boolean(openai), model: openai ? model : '' })
})

app.post('/api/mandarin/feedback', async (request, response) => {
  response.set('Cache-Control', 'no-store')
  if (!openai) return response.status(503).json({ error: 'AI feedback is not configured. Add OPENAI_API_KEY on the server.' })

  const now = Date.now()
  const key = request.ip || 'local'
  const recent = (windows.get(key) || []).filter((time) => now - time < 60_000)
  if (recent.length >= 30) return response.status(429).json({ error: 'Too many feedback requests. Wait a moment and try again.' })
  recent.push(now)
  windows.set(key, recent)

  const validation = validateFeedbackRequest(request.body)
  if (!validation.success) return response.status(400).json({ error: 'The feedback request was incomplete or too large.' })

  try {
    const feedback = await createMandarinFeedback({ payload: validation.data, client: openai, model })
    return response.json({ ...feedback, source: 'ai' })
  } catch (error) {
    console.error('Mandarin feedback error:', error instanceof Error ? error.message : 'Unknown error')
    return response.status(502).json({ error: 'The AI tutor could not assess that reply. Local feedback is still available.' })
  }
})

if (isDevelopment) {
  const { createServer } = await import('vite')
  const vite = await createServer({ root: rootDir, server: { middlewareMode: true }, appType: 'spa' })
  app.use(vite.middlewares)
} else {
  const distDir = path.join(rootDir, 'dist')
  app.use(express.static(distDir, { index: false }))
  app.use((request, response, next) => {
    if (request.method !== 'GET' || !request.accepts('html')) return next()
    response.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Mandarin Field listening on http://127.0.0.1:${port} (${openai ? `OpenAI: ${model}` : 'local feedback only'})`)
})
