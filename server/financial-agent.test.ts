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
  })
})