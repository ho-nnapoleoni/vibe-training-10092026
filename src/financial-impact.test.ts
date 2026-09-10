import { describe, expect, it } from 'vitest'
import { details } from './data'
import { calculateFinancialImpact } from './financial-impact'
import { assessImpact } from './impact'

describe('financial impact engine', () => {
  it('calculates an auditable Suez rerouting estimate', () => {
    const impact = assessImpact(details.FAL, details.FAL.proformaCalls, ['SUEZ'])
    const result = calculateFinancialImpact(details.FAL, impact)

    expect(result.divertedVesselCount).toBe(2)
    expect(result.costPerVessel).toBe(2_130_000)
    expect(result.directCost).toBe(3_180_000)
    expect(result.opportunityCost).toBe(1_080_000)
    expect(result.totalCost).toBe(4_260_000)
    expect(result.riskLevel).toBe('HIGH')
    expect(result.lowEstimate).toBeLessThan(result.totalCost)
    expect(result.highEstimate).toBeGreaterThan(result.totalCost)
  })

  it('returns zero when the service is not affected', () => {
    const impact = assessImpact(details.FAL, details.FAL.proformaCalls, [])
    expect(calculateFinancialImpact(details.FAL, impact).totalCost).toBe(0)
  })

  it('scales the total with the number of diverted vessels', () => {
    const impact = assessImpact(details.FAL, details.FAL.proformaCalls, ['SUEZ'])
    const oneVessel = calculateFinancialImpact(details.FAL, impact, 1)
    const twoVessels = calculateFinancialImpact(details.FAL, impact, 2)

    expect(twoVessels.costPerVessel).toBe(oneVessel.costPerVessel)
    expect(twoVessels.totalCost).toBe(oneVessel.totalCost * 2)
  })
})