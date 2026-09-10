import type { Chokepoint, Coordinates } from '../types'

export interface ChokepointRule {
  id: Chokepoint
  label: string
  kind: 'CANAL' | 'STRAIT'
  marker: Coordinates
  evidencePortCodes: string[]
  alternateRoute: string
  alternateWaypoints: Coordinates[]
  additionalDays: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  priority: 1 | 2
  source: string
}

export const chokepointRules: ChokepointRule[] = [
  { id: 'SUEZ', label: 'Suez Canal', kind: 'CANAL', marker: { lat: 30.45, lng: 32.35 }, evidencePortCodes: ['EGPSD', 'MAPTM', 'EGSUEZ'], alternateRoute: 'Cap de Bonne-Esperance', alternateWaypoints: [{ lat: -34.35, lng: 18.47 }], additionalDays: 12, confidence: 'MEDIUM', priority: 1, source: 'Reviewed fixture heuristic' },
  { id: 'PANAMA', label: 'Panama Canal', kind: 'CANAL', marker: { lat: 9.08, lng: -79.68 }, evidencePortCodes: ['PABAL', 'PAONX', 'PAPCN'], alternateRoute: 'Cape Horn', alternateWaypoints: [{ lat: -56.0, lng: -67.3 }], additionalDays: 16, confidence: 'MEDIUM', priority: 1, source: 'Reviewed fixture heuristic' },
  { id: 'MALACCA', label: 'Strait of Malacca', kind: 'STRAIT', marker: { lat: 2.5, lng: 101.0 }, evidencePortCodes: ['SGSIN', 'MYPKG', 'MYTPP'], alternateRoute: 'Around Indonesia and Australia', alternateWaypoints: [{ lat: -8.0, lng: 115.0 }, { lat: -33.8, lng: 151.2 }], additionalDays: 8, confidence: 'LOW', priority: 1, source: 'Candidate heuristic - maritime review required' },
  { id: 'BAB_EL_MANDEB', label: 'Bab el-Mandeb', kind: 'STRAIT', marker: { lat: 12.58, lng: 43.33 }, evidencePortCodes: ['EGPSD', 'DJJIB', 'YEADE'], alternateRoute: 'Cape of Good Hope', alternateWaypoints: [{ lat: -34.35, lng: 18.47 }], additionalDays: 12, confidence: 'LOW', priority: 1, source: 'Candidate heuristic - maritime review required' },
  { id: 'HORMUZ', label: 'Strait of Hormuz', kind: 'STRAIT', marker: { lat: 26.57, lng: 56.25 }, evidencePortCodes: ['AEJEA', 'OMSLL', 'QADOH'], alternateRoute: 'Regional alternative route', alternateWaypoints: [{ lat: 25.1, lng: 55.2 }], additionalDays: 5, confidence: 'LOW', priority: 2, source: 'EIA chokepoint reference - maritime review required' },
  { id: 'BOSPHORUS', label: 'Bosphorus / Dardanelles', kind: 'STRAIT', marker: { lat: 41.12, lng: 29.08 }, evidencePortCodes: ['TRIST', 'TRMER', 'UAODS'], alternateRoute: 'No direct equivalent', alternateWaypoints: [], additionalDays: 0, confidence: 'LOW', priority: 2, source: 'Candidate heuristic - maritime review required' },
  { id: 'DANISH_STRAITS', label: 'Danish Straits', kind: 'STRAIT', marker: { lat: 55.7, lng: 12.6 }, evidencePortCodes: ['DKCPH', 'SESTO'], alternateRoute: 'North Sea route', alternateWaypoints: [], additionalDays: 2, confidence: 'LOW', priority: 2, source: 'Candidate heuristic - maritime review required' },
  { id: 'KIEL', label: 'Kiel Canal', kind: 'CANAL', marker: { lat: 53.9, lng: 9.1 }, evidencePortCodes: ['DEKEL', 'DEHAM'], alternateRoute: 'Around Denmark', alternateWaypoints: [{ lat: 57.7, lng: 10.6 }], additionalDays: 1, confidence: 'LOW', priority: 2, source: 'Candidate heuristic - maritime review required' },
]

export const chokepointById = Object.fromEntries(chokepointRules.map((rule) => [rule.id, rule])) as Record<Chokepoint, ChokepointRule>
