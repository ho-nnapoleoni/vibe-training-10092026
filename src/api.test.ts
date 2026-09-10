import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadServiceDetail } from './api'
import type { ServiceSummary } from './types'

const service: ServiceSummary = {
  code: 'FAL', name: 'French Asia Line', line: { code: 'FAL', name: 'Asia - Europe' },
  carriers: [], serviceType: 'Regular', frequency: 7, active: true, criticality: 'CRITICAL',
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

describe('loadServiceDetail', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('combines the three service endpoints', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ rotationDuration: 84, departureDay: 'Monday' }))
      .mockResolvedValueOnce(response({ items: [{ port: { code: 'SHA', name: 'Shanghai', unLocode: 'CNSHA' }, bound: 'Westbound' }] }))
      .mockResolvedValueOnce(response({ items: [{ imo: '1234567', name: 'Vessel', smdgLinerCode: 'CMDU' }] })))
    const result = await loadServiceDetail(service)
    expect(result.detail.proformaCalls).toHaveLength(1)
    expect(result.detail.fleet).toHaveLength(1)
    expect(result.detail.criticality).toBe('CRITICAL')
  })

  it('keeps the detail when a secondary endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(response({ rotationDuration: 84, departureDay: 'Monday' }))
      .mockResolvedValueOnce(response({ error: { message: 'Calls unavailable' } }, 503))
      .mockResolvedValueOnce(response({ items: [] })))
    const result = await loadServiceDetail(service)
    expect(result.detail.proformaCalls).toEqual([])
    expect(result.proformaError).toBe('Calls unavailable')
  })

  it('rejects when the primary detail endpoint fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ error: { message: 'Detail unavailable' } }, 503)))
    await expect(loadServiceDetail(service)).rejects.toThrow('Detail unavailable')
  })
})