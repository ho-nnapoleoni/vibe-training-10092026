export type ZoneCode = 'WEUR' | 'ASIE' | 'MED' | 'CARAIBES' | 'AFR' | 'ANZPAC' | 'MDLEAST' | 'NA' | 'SA' | 'ALL'
export type Chokepoint = 'SUEZ' | 'PANAMA' | 'MALACCA' | 'BAB_EL_MANDEB' | 'HORMUZ' | 'BOSPHORUS' | 'DANISH_STRAITS' | 'KIEL'
export type ImpactStatus = 'AFFECTED' | 'NOT_AFFECTED' | 'UNKNOWN'

export interface Coordinates {
  lat: number
  lng: number
}

export interface ServiceSummary {
  code: string
  name: string
  line: { code: string; name: string }
  carriers: { shipcomp: string; code: string }[]
  serviceType: string
  frequency: number
  active: boolean
  criticality?: 'STANDARD' | 'CRITICAL'
}

export interface Port {
  code: string
  name: string
  unLocode: string
}

export interface ProformaCall {
  port: Port
  terminal?: { code: string; name: string }
  bound: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'ROUND'
  transitTime?: number
}

export interface Vessel {
  code: string
  name: string
  imo: string
  smdgLinerCode: string
}

export interface ServiceDetail extends ServiceSummary {
  universalServiceReferences: string[]
  rotationDuration: number
  departureDay: string
  proformaCalls: ProformaCall[]
  fleet: Vessel[]
}

export interface ServiceDetailResult {
  detail: ServiceDetail
  proformaError?: string
  fleetError?: string
}

export interface ImpactAssessment {
  status: ImpactStatus
  activeChokepoints: Chokepoint[]
  firstAffectedPort?: Port
  evidencePorts: Port[]
  alternateRoute: string
  additionalDays?: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
  recommendation?: string
  escalation: boolean
  reason: string
}

export interface FinancialAssumptions {
  vesselDailyCost: number
  fuelDailyCost: number
  commercialDelayDailyCost: number
  routeFees: number
  currency: 'EUR'
}

export interface FinancialImpact {
  divertedVesselCount: number
  costPerVessel: number
  directCost: number
  opportunityCost: number
  totalCost: number
  lowEstimate: number
  highEstimate: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  assumptions: FinancialAssumptions
  modelVersion: string
}

export interface FinancialImpactResult extends FinancialImpact {
  source: 'mistral' | 'local'
  recommendation: string
  explanation: string
}

export interface ServiceWithImpact extends ServiceSummary {
  impact: ImpactAssessment
}

export interface ApiEnvelope<T> {
  items: T[]
  partial?: boolean
  contentRange?: string
}
