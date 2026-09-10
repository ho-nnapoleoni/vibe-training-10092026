import express from 'express'
import cors from 'cors'
import { createServer } from 'node:http'
import { details, services } from '../src/data.js'

const app = express()
const port = Number(process.env.PORT ?? 8787)
const fixtureMode = process.env.FIXTURE_MODE !== 'false'
const upstream = process.env.CMA_API_BASE_URL ?? 'https://apis.cma-cgm.net/vesseloperation/proforma/v2'
const timeoutMs = Number(process.env.CMA_API_TIMEOUT_MS ?? 8000)
app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ status: 'ok', mode: fixtureMode ? 'fixture' : 'live', upstreamConfigured: Boolean(process.env.CMA_API_KEY), requestId: crypto.randomUUID() }))
async function fetchUpstream(path: string, range = '0-49') {
  if (!process.env.CMA_API_KEY) throw new Error('CMA_API_KEY is not configured')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${upstream}${path}`, { headers: { KeyId: process.env.CMA_API_KEY, range }, signal: controller.signal })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.description ?? `Upstream responded ${response.status}`)
    return payload
  } finally { clearTimeout(timer) }
}

app.get('/api/zones/:from/zones/:to/services', async (req, res) => {
  if (!fixtureMode) {
    try { return res.json(await fetchUpstream(`/zones/${encodeURIComponent(req.params.from)}/zones/${encodeURIComponent(req.params.to)}/services`)) }
    catch (error) { return res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message: error instanceof Error ? error.message : 'Upstream unavailable', retryable: true } }) }
  }
  const items = req.params.from === 'ASIE' && req.params.to === 'WEUR' ? services : services.filter((service) => service.code === 'AMERICAS')
  res.json({ items, partial: false, contentRange: `0-${Math.max(items.length - 1, 0)}/${items.length}`, requestId: crypto.randomUUID() })
})
app.get('/api/services/:code', async (req, res) => {
  if (!fixtureMode) {
    try { return res.json(await fetchUpstream(`/services/${encodeURIComponent(req.params.code)}`)) }
    catch (error) { return res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message: error instanceof Error ? error.message : 'Upstream unavailable', retryable: true } }) }
  }
  const detail = details[req.params.code]
  if (!detail) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service introuvable.' } })
  res.json(detail)
})
app.get('/api/services/:code/proformacalls', async (req, res) => {
  if (!fixtureMode) {
    try { return res.json(await fetchUpstream(`/services/${encodeURIComponent(req.params.code)}/proformacalls`)) }
    catch (error) { return res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message: error instanceof Error ? error.message : 'Upstream unavailable', retryable: true } }) }
  }
  const detail = details[req.params.code]
  if (!detail) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service introuvable.' } })
  res.json({ items: detail.proformaCalls, partial: false })
})
app.get('/api/services/:code/fleet', async (req, res) => {
  if (!fixtureMode) {
    try { return res.json(await fetchUpstream(`/services/${encodeURIComponent(req.params.code)}/fleet`)) }
    catch (error) { return res.status(502).json({ error: { code: 'UPSTREAM_ERROR', message: error instanceof Error ? error.message : 'Upstream unavailable', retryable: true } }) }
  }
  const detail = details[req.params.code]
  if (!detail) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Service introuvable.' } })
  res.json({ items: detail.fleet, partial: false })
})

createServer(app).listen(port, () => console.log(`Disruption Navigator API listening on http://localhost:${port}`))
