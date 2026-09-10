import express from 'express'
import cors from 'cors'
import { createServer } from 'node:http'
import { details, services } from '../src/data.js'
import { calculateMaritimePaths } from './maritime-routing.js'
import type { Coordinates } from '../src/types.js'

const app = express()
const port = Number(process.env.PORT ?? 8787)
const fixtureMode = process.env.FIXTURE_MODE !== 'false'
const upstream = process.env.CMA_API_BASE_URL ?? 'https://apis.cma-cgm.net/vesseloperation/proforma/v2'
const timeoutMs = Number(process.env.CMA_API_TIMEOUT_MS ?? 8000)
const apiKey = process.env.CMA_API_KEY
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((origin) => origin.trim())
if (!Number.isFinite(timeoutMs) || timeoutMs < 100) throw new Error('CMA_API_TIMEOUT_MS must be a number greater than 100')
if (!fixtureMode && !apiKey) throw new Error('CMA_API_KEY is required when FIXTURE_MODE=false')

const requestCounts = new Map<string, { count: number; resetAt: number }>()
app.disable('x-powered-by')
app.use(cors({ origin(origin, callback) { callback(null, !origin || allowedOrigins.includes(origin)) } }))
app.use(express.json())
app.use((req, res, next) => {
  const requestId = crypto.randomUUID()
  const startedAt = performance.now()
  res.setHeader('x-request-id', requestId)
  res.setHeader('content-security-policy', "default-src 'none'; frame-ancestors 'none'")
  res.setHeader('x-content-type-options', 'nosniff')
  res.setHeader('referrer-policy', 'no-referrer')
  const key = req.ip ?? 'unknown'
  const now = Date.now()
  const current = requestCounts.get(key)
  const rate = !current || current.resetAt <= now ? { count: 1, resetAt: now + 60_000 } : { ...current, count: current.count + 1 }
  requestCounts.set(key, rate)
  if (rate.count > 120) return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests.', retryable: true }, requestId })
  res.on('finish', () => console.info(JSON.stringify({ requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Math.round(performance.now() - startedAt) })))
  next()
})

app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: fixtureMode ? 'fixture' : 'live', upstreamConfigured: Boolean(process.env.CMA_API_KEY), requestId: crypto.randomUUID() }))
async function fetchUpstream(path: string, range = '0-49'): Promise<{ payload: unknown; contentRange?: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${upstream}${path}`, { headers: { KeyId: apiKey ?? '', range }, signal: controller.signal })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.description ?? `Upstream responded ${response.status}`)
    return { payload, contentRange: response.headers.get('content-range') ?? undefined }
  } finally { clearTimeout(timer) }
}

function normalizeItems(payload: unknown, contentRange?: string) {
  const items = Array.isArray(payload) ? payload : (payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown[] }).items) ? (payload as { items: unknown[] }).items : [])
  const total = Number(contentRange?.split('/')[1])
  return { items, partial: Number.isFinite(total) ? items.length < total : false, contentRange }
}

app.get('/api/zones/:from/zones/:to/services', async (req, res) => {
  if (!fixtureMode) {
    try { const result = await fetchUpstream(`/zones/${encodeURIComponent(req.params.from)}/zones/${encodeURIComponent(req.params.to)}/services`); return res.json(normalizeItems(result.payload, result.contentRange)) }
    catch { return res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message: 'Upstream service unavailable.', retryable: true } }) }
  }
  const items = req.params.from === 'ASIE' && req.params.to === 'WEUR' ? services : req.params.from === 'ASIE' && req.params.to === 'AMNO' ? services.filter((service) => service.code === 'AMERICAS') : []
  res.json({ items, partial: false, contentRange: `0-${Math.max(items.length - 1, 0)}/${items.length}`, requestId: crypto.randomUUID() })
})
app.get('/api/services/:code', async (req, res) => {
  if (!fixtureMode) {
    try { const result = await fetchUpstream(`/services/${encodeURIComponent(req.params.code)}`); return res.json(result.payload) }
    catch { return res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message: 'Upstream service unavailable.', retryable: true } }) }
  }
  const detail = details[req.params.code]
  if (!detail) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service introuvable.' } })
  res.json(detail)
})
app.get('/api/services/:code/proformacalls', async (req, res) => {
  if (!fixtureMode) {
    try { const result = await fetchUpstream(`/services/${encodeURIComponent(req.params.code)}/proformacalls`); return res.json(normalizeItems(result.payload, result.contentRange)) }
    catch { return res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message: 'Upstream service unavailable.', retryable: true } }) }
  }
  const detail = details[req.params.code]
  if (!detail) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service introuvable.' } })
  res.json({ items: detail.proformaCalls, partial: false })
})
app.get('/api/services/:code/fleet', async (req, res) => {
  if (!fixtureMode) {
    try { const result = await fetchUpstream(`/services/${encodeURIComponent(req.params.code)}/fleet`); return res.json(normalizeItems(result.payload, result.contentRange)) }
    catch { return res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message: 'Upstream service unavailable.', retryable: true } }) }
  }
  const detail = details[req.params.code]
  if (!detail) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service introuvable.' } })
  res.json({ items: detail.fleet, partial: false })
})
app.post('/api/routes/maritime', (req, res) => {
  const paths = req.body?.paths as Coordinates[][] | undefined
  const valid = Array.isArray(paths) && paths.every((path) => Array.isArray(path) && path.every((point) => Number.isFinite(point?.lat) && Number.isFinite(point?.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180))
  if (!valid) return res.status(400).json({ error: { code: 'INVALID_ROUTE', message: 'Invalid maritime route coordinates.', retryable: false } })
  try { return res.json({ paths: calculateMaritimePaths(paths) }) }
  catch { return res.status(422).json({ error: { code: 'ROUTE_UNAVAILABLE', message: 'Maritime route could not be calculated.', retryable: false } }) }
})

createServer(app).listen(port, () => console.log(`Disruption Navigator API listening on http://localhost:${port}`))
