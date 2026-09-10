import { describe, expect, it } from 'vitest'
import { details } from '../src/data'
import { assessImpact } from '../src/impact'
import { buildFinancialImpactResult } from './financial-agent'

describe('financial impact agent', () => {
  it('returns the deterministic estimate when Mistral is not configured', async () => {
    const impact = assessImpact(details.FAL, details.FAL.proformaCalls, ['SUEZ'])
    const result = await buildFinancialImpactResult(details.FAL, impact)

    expect(result.source).toBe('local')
    expect(result.divertedVesselCount).toBe(2)
    expect(result.costPerVessel).toBe(2_130_000)
    expect(result.totalCost).toBe(4_260_000)
    expect(result.recommendation).toContain('[PROPOSAL]')
    expect(result.sources).toEqual([])
  })

  it('uses current web benchmarks and exposes their citations', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body))
      expect(body.tools).toEqual([{ type: 'web_search' }])
      return new Response(JSON.stringify({ outputs: [{ type: 'message.output', content: [
        { type: 'text', text: '{"assumptions":{"vesselDailyCost":12000,"fuelDailyCost":35000,"commercialDelayDailyCost":8000,"routeFees":0},"recommendation":"[PROPOSAL] Validate inputs.","explanation":"Current sourced benchmark estimate."}' },
        { type: 'tool_reference', title: 'Industry benchmark', url: 'https://example.com/benchmark' },
      ] }] }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    try {
      const impact = assessImpact(details.FAL, details.FAL.proformaCalls, ['SUEZ'])
      const result = await buildFinancialImpactResult(details.FAL, impact, { apiKey: 'test-key', divertedVesselCount: 2 })
      expect(result.source).toBe('mistral')
      expect(result.assumptions.vesselDailyCost).toBe(12_000)
      expect(result.costPerVessel).toBe(660_000)
      expect(result.totalCost).toBe(1_320_000)
      expect(result.sources).toEqual([{ title: 'Industry benchmark', url: 'https://example.com/benchmark' }])
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})