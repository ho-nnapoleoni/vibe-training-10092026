import { describe, expect, it } from 'vitest'
import { buildRouteModel } from './domain/routing'
import { assessImpact } from './impact'
import { details, services } from './data'

describe('route model', () => {
  it('maps ordered port calls to coordinates', () => {
    const model = buildRouteModel(details.FAL.proformaCalls, assessImpact(services[0], details.FAL.proformaCalls, []))
    expect(model.nominal.map((point) => point.unLocode)).toEqual(['SGSIN', 'EGPSD', 'MAPTM', 'FRLEH'])
    expect(model.missingPorts).toEqual([])
  })

  it('adds an alternate route when Suez is affected', () => {
    const impact = assessImpact(services[0], details.FAL.proformaCalls, ['SUEZ'])
    const model = buildRouteModel(details.FAL.proformaCalls, impact)
    expect(model.affected.map((point) => point.unLocode)).toEqual(['SGSIN', 'EGPSD', 'MAPTM'])
    expect(model.alternate.length).toBe(3)
    expect(model.alternate[1]).toEqual({ lat: -34.35, lng: 18.47 })
  })

  it('keeps unknown ports out of the map without failing', () => {
    const calls = [{ ...details.FAL.proformaCalls[0], port: { ...details.FAL.proformaCalls[0].port, code: 'ZZXXX', unLocode: 'ZZXXX' } }]
    const model = buildRouteModel(calls, assessImpact(services[0], calls, []))
    expect(model.nominal).toHaveLength(0)
    expect(model.missingPorts).toEqual(['ZZXXX'])
  })
})