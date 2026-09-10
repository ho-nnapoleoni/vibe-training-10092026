import type { ProformaCall, ServiceDetail, ServiceSummary, Vessel } from './types'

export const zones = [
  ['ASIE', 'Asia'], ['WEUR', 'Western Europe'], ['MED', 'Mediterranean'], ['NA', 'North America'],
  ['SA', 'South America'], ['AFR', 'Africa'], ['CARAIBES', 'Caribbean'], ['ANZPAC', 'Oceania'],
] as const

const falCalls: ProformaCall[] = [
  { port: { code: 'SGSIN', name: 'Singapore', unLocode: 'SGSIN' }, terminal: { code: 'SGJUR', name: 'Jurong Port' }, bound: 'WEST', transitTime: 0 },
  { port: { code: 'EGPSD', name: 'Port Said', unLocode: 'EGPSD' }, terminal: { code: 'EGPSA', name: 'East Port Said' }, bound: 'WEST', transitTime: 16 },
  { port: { code: 'MA TNG'.replace(' ', ''), name: 'Tangier Med', unLocode: 'MAPTM' }, terminal: { code: 'MAPTM1', name: 'Tangier Med 1' }, bound: 'WEST', transitTime: 20 },
  { port: { code: 'FRLEH', name: 'Le Havre', unLocode: 'FRLEH' }, terminal: { code: 'FRLEHDTDF', name: 'Terminal de France' }, bound: 'WEST', transitTime: 25 },
]

const ae7Calls: ProformaCall[] = [
  { port: { code: 'CNSHA', name: 'Shanghai', unLocode: 'CNSHA' }, bound: 'EAST', transitTime: 0 },
  { port: { code: 'LKCMB', name: 'Colombo', unLocode: 'LKCMB' }, bound: 'EAST', transitTime: 9 },
  { port: { code: 'NLRTM', name: 'Rotterdam', unLocode: 'NLRTM' }, bound: 'EAST', transitTime: 28 },
]

const panamaCalls: ProformaCall[] = [
  { port: { code: 'CNSHA', name: 'Shanghai', unLocode: 'CNSHA' }, bound: 'EAST', transitTime: 0 },
  { port: { code: 'PABAL', name: 'Balboa', unLocode: 'PABAL' }, bound: 'EAST', transitTime: 16 },
  { port: { code: 'USNYC', name: 'New York', unLocode: 'USNYC' }, bound: 'EAST', transitTime: 24 },
]

const fleet: Vessel[] = [
  { code: 'CGJRS', name: 'CMA CGM Jacques Saade', imo: '9839179', smdgLinerCode: 'CMA' },
  { code: 'CGM23', name: 'CMA CGM Antoine de Saint Exupery', imo: '9776418', smdgLinerCode: 'CMA' },
]

export const services: ServiceSummary[] = [
  { code: 'FAL', name: 'French Asia Line', line: { code: 'FAL', name: 'Asia - Europe' }, carriers: [{ shipcomp: '0001', code: 'FAL' }], serviceType: 'Regular', frequency: 7, active: true, criticality: 'CRITICAL' },
  { code: 'AE7', name: 'Asia Europe 7', line: { code: 'AE7', name: 'Asia - Europe' }, carriers: [{ shipcomp: '0001', code: 'AE7' }], serviceType: 'Regular', frequency: 7, active: true, criticality: 'CRITICAL' },
  { code: 'AMERICAS', name: 'Pacific Atlantic Bridge', line: { code: 'PAB', name: 'Pacific - Atlantic' }, carriers: [{ shipcomp: '0001', code: 'PAB' }], serviceType: 'Regular', frequency: 7, active: true, criticality: 'STANDARD' },
]

export const details: Record<string, ServiceDetail> = {
  FAL: { ...services[0], universalServiceReferences: ['SR10179M'], rotationDuration: 35, departureDay: 'Sunday', proformaCalls: falCalls, fleet },
  AE7: { ...services[1], universalServiceReferences: ['SR10221M'], rotationDuration: 42, departureDay: 'Tuesday', proformaCalls: ae7Calls, fleet: [fleet[1]] },
  AMERICAS: { ...services[2], universalServiceReferences: ['SR20991M'], rotationDuration: 31, departureDay: 'Thursday', proformaCalls: panamaCalls, fleet: [fleet[0]] },
}
