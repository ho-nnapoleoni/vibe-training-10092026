import { describe, expect, it } from 'vitest'
import { buildRouteModel, buildRouteStops } from './domain/routing'
import { assessImpact } from './impact'
import { details, services } from './data'

describe('route model', () => {
  it('maps ordered port calls to coordinates', () => {
    const impact = assessImpact(services[0], details.FAL.proformaCalls, [])
    const model = buildRouteModel(details.FAL.proformaCalls, impact)
    expect(model.ports.map((point) => point.unLocode)).toEqual(['SGSIN', 'EGPSD', 'MAPTM', 'FRLEH'])
    expect(buildRouteStops(details.FAL.proformaCalls, impact)[0]).toHaveLength(4)
    expect(model.missingPorts).toEqual([])
  })

  it('adds an alternate route when Suez is affected', () => {
    const impact = assessImpact(services[0], details.FAL.proformaCalls, ['SUEZ'])
    const model = buildRouteModel(details.FAL.proformaCalls, impact)
    const [, affected, alternate] = buildRouteStops(details.FAL.proformaCalls, impact)
    expect(affected).toHaveLength(3)
    expect(alternate).toContainEqual({ lat: -34.35, lng: 18.47 })
    expect(model.depthValidated).toBe(false)
  })

  it('keeps unknown ports out of the map without failing', () => {
    const calls = [{ ...details.FAL.proformaCalls[0], port: { ...details.FAL.proformaCalls[0].port, code: 'ZZXXX', unLocode: 'ZZXXX' } }]
    const model = buildRouteModel(calls, assessImpact(services[0], calls, []))
    expect(model.ports).toHaveLength(0)
    expect(model.nominal).toHaveLength(0)
    expect(model.missingPorts).toEqual(['ZZXXX'])
  })
})