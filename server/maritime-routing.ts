import seaRoute from 'searoute-js'
import type { Coordinates } from '../src/types.js'

function point(coordinates: Coordinates) {
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: [coordinates.lng, coordinates.lat] as [number, number] } }
}

export function calculateMaritimePath(stops: Coordinates[]): Coordinates[] {
  if (stops.length < 2) return stops
  return stops.slice(1).flatMap((destination, index) => {
    const route = seaRoute(point(stops[index]), point(destination), 'nauticalmiles')
    const segment = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
    return index === 0 ? segment : segment.slice(1)
  })
}

export function calculateMaritimePaths(paths: Coordinates[][]) {
  if (paths.length > 3 || paths.some((path) => path.length > 12)) throw new Error('Route request exceeds limits')
  return paths.map(calculateMaritimePath)
}