import { getPortCoordinates } from './ports'
import { chokepointById } from './chokepoints'
import type { Chokepoint, Coordinates, ImpactAssessment, ProformaCall } from '../types'

export interface RoutePoint extends Coordinates { label: string; unLocode: string; source: 'API' | 'FIXTURE' }
export interface RouteModel { ports: RoutePoint[]; nominal: Coordinates[]; affected: Coordinates[]; alternate: Coordinates[]; missingPorts: string[]; depthValidated: false }
export interface RoutePaths { nominal: Coordinates[]; affected: Coordinates[]; alternate: Coordinates[] }

export function buildRouteModel(calls: ProformaCall[], impact: ImpactAssessment, paths?: RoutePaths): RouteModel {
  const missingPorts: string[] = []
  const ports = calls.flatMap((call) => {
    const point = getPortCoordinates(call.port)
    if (!point) { missingPorts.push(call.port.unLocode); return [] }
    return [{ ...point, label: call.port.name, unLocode: call.port.unLocode, source: 'API' as const }]
  })
  const affectedIndex = impact.status === 'AFFECTED' && impact.firstAffectedPort ? ports.findIndex((port) => port.unLocode === impact.firstAffectedPort?.unLocode) : -1
  return { ports, nominal: paths?.nominal ?? [], affected: paths?.affected ?? [], alternate: paths?.alternate ?? [], missingPorts, depthValidated: false }
}

export function buildRouteStops(calls: ProformaCall[], impact: ImpactAssessment): [Coordinates[], Coordinates[], Coordinates[]] {
  const model = buildRouteModel(calls, impact)
  const affectedIndex = impact.status === 'AFFECTED' && impact.firstAffectedPort ? model.ports.findIndex((port) => port.unLocode === impact.firstAffectedPort?.unLocode) : -1
  const affected = affectedIndex >= 0 ? model.ports.slice(Math.max(0, affectedIndex - 1), Math.min(model.ports.length, affectedIndex + 2)) : []
  const waypoints = impact.activeChokepoints.flatMap((id: Chokepoint) => chokepointById[id]?.alternateWaypoints ?? [])
  const alternate = affectedIndex >= 0 && waypoints.length > 0 && model.ports.length > 1 ? [model.ports[0], ...waypoints, model.ports[model.ports.length - 1]] : []
  return [model.ports, affected, alternate]
}
