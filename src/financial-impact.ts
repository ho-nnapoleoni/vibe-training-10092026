import type { FinancialImpact, ImpactAssessment, ServiceDetail } from './types'

const MODEL_VERSION = 'rerouting-cost-v3-web'

export function calculateFinancialImpact(detail: ServiceDetail, impact: ImpactAssessment, requestedVesselCount = detail.fleet.length, marketAssumptions?: Partial<FinancialImpact['assumptions']>): FinancialImpact {
  const additionalDays = impact.status === 'AFFECTED' ? Math.max(impact.additionalDays ?? 0, 0) : 0
  const divertedVesselCount = Math.max(Math.floor(requestedVesselCount), 1)
  const critical = detail.criticality === 'CRITICAL'
  const assumptions = {
    vesselDailyCost: marketAssumptions?.vesselDailyCost ?? 65_000,
    fuelDailyCost: marketAssumptions?.fuelDailyCost ?? 55_000,
    commercialDelayDailyCost: marketAssumptions?.commercialDelayDailyCost ?? (critical ? 45_000 : 20_000),
    routeFees: additionalDays > 0 ? (marketAssumptions?.routeFees ?? 150_000) : 0,
    currency: 'EUR' as const,
  }
  const breakdown = {
    additionalDays,
    vesselOperatingCostPerVessel: additionalDays * assumptions.vesselDailyCost,
    fuelCostPerVessel: additionalDays * assumptions.fuelDailyCost,
    routeFeesPerVessel: assumptions.routeFees,
    opportunityCostPerVessel: additionalDays * assumptions.commercialDelayDailyCost,
  }
  const directCostPerVessel = breakdown.vesselOperatingCostPerVessel + breakdown.fuelCostPerVessel + breakdown.routeFeesPerVessel
  const opportunityCostPerVessel = breakdown.opportunityCostPerVessel
  const costPerVessel = directCostPerVessel + opportunityCostPerVessel
  const directCost = directCostPerVessel * divertedVesselCount
  const opportunityCost = opportunityCostPerVessel * divertedVesselCount
  const totalCost = directCost + opportunityCost
  const riskLevel = totalCost >= 5_000_000 ? 'CRITICAL' : totalCost >= 2_000_000 ? 'HIGH' : totalCost >= 750_000 ? 'MEDIUM' : 'LOW'

  return {
    divertedVesselCount,
    costPerVessel,
    directCost,
    opportunityCost,
    totalCost,
    lowEstimate: Math.round(totalCost * 0.8),
    highEstimate: Math.round(totalCost * 1.25),
    riskLevel,
    breakdown,
    assumptions,
    modelVersion: MODEL_VERSION,
  }
}