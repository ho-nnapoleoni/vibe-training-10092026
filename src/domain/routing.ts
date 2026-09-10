import { getPortCoordinates } from './ports'
import { chokepointById } from './chokepoints'
import type { Chokepoint, Coordinates, ImpactAssessment, ProformaCall } from '../types'

export interface RoutePoint extends Coordinates { label: string; unLocode: string; source: 'API' | 'FIXTURE' }
export interface RouteModel { nominal: RoutePoint[]; affected: RoutePoint[]; alternate: Coordinates[]; missingPorts: string[] }

export function buildRouteModel(calls: ProformaCall[], impact: ImpactAssessment): RouteModel {
  const missingPorts: string[] = []
  const nominal = calls.flatMap((call) => {
    const point = getPortCoordinates(call.port)
    if (!point) { missingPorts.push(call.port.unLocode); return [] }
    return [{ ...point, label: call.port.name, unLocode: call.port.unLocode, source: 'API' as const }]
  })
  const affectedIndex = impact.status === 'AFFECTED' && impact.firstAffectedPort ? nominal.findIndex((point) => point.unLocode === impact.firstAffectedPort?.unLocode) : -1
  const affected = affectedIndex >= 0 ? nominal.slice(Math.max(0, affectedIndex - 1), Math.min(nominal.length, affectedIndex + 2)) : []
  const waypoints = impact.activeChokepoints.flatMap((id: Chokepoint) => chokepointById[id]?.alternateWaypoints ?? [])
  const alternate = affectedIndex >= 0 && waypoints.length > 0 ? [nominal[0], ...waypoints, nominal[nominal.length - 1]] : []
  return { nominal, affected, alternate, missingPorts }
}
