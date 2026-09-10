import { describe, expect, it } from 'vitest'
import { assessImpact } from './impact'
import { details, services } from './data'

describe('impact engine', () => {
  it('detects Suez exposure from port evidence', () => {
    const result = assessImpact(services[0], details.FAL.proformaCalls, ['SUEZ'])
    expect(result.status).toBe('AFFECTED')
    expect(result.firstAffectedPort?.unLocode).toBe('EGPSD')
    expect(result.alternateRoute).toBe('Cap de Bonne-Esperance')
  })
  it('returns clear when no active scenario exists', () => {
    expect(assessImpact(services[0], details.FAL.proformaCalls, []).status).toBe('NOT_AFFECTED')
  })
  it('returns unknown when evidence is insufficient', () => {
    expect(assessImpact(services[0], [], ['SUEZ']).status).toBe('UNKNOWN')
  })
  it('detects Panama exposure', () => {
    const result = assessImpact(services[2], details.AMERICAS.proformaCalls, ['PANAMA'])
    expect(result.status).toBe('AFFECTED')
    expect(result.firstAffectedPort?.unLocode).toBe('PABAL')
    expect(result.alternateRoute).toBe('Cape Horn')
  })
  it('supports an additional Malacca chokepoint rule', () => {
    const result = assessImpact(services[0], details.FAL.proformaCalls, ['MALACCA'])
    expect(result.status).toBe('AFFECTED')
    expect(result.firstAffectedPort?.unLocode).toBe('SGSIN')
  })
  it('combines closures without duplicating the service match', () => {
    const result = assessImpact(services[0], details.FAL.proformaCalls, ['SUEZ', 'MALACCA'])
    expect(result.activeChokepoints).toEqual(['SUEZ', 'MALACCA'])
    expect(result.evidencePorts.map((port) => port.unLocode)).toEqual(['EGPSD', 'MAPTM', 'SGSIN'])
  })
})
