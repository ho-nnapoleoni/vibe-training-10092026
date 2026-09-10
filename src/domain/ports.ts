import type { Coordinates, Port } from '../types'

const coordinates: Record<string, Coordinates> = {
  SGSIN: { lat: 1.2644, lng: 103.8200 },
  EGPSD: { lat: 31.2653, lng: 32.3019 },
  MAPTM: { lat: 35.8833, lng: -5.5000 },
  FRLEH: { lat: 49.4900, lng: 0.1000 },
  CNSHA: { lat: 31.2304, lng: 121.4737 },
  LKCMB: { lat: 6.9271, lng: 79.8612 },
  NLRTM: { lat: 51.9244, lng: 4.4777 },
  PABAL: { lat: 8.9500, lng: -79.5667 },
  USNYC: { lat: 40.6895, lng: -74.0447 },
}

export function getPortCoordinates(port: Port): Coordinates | undefined {
  return coordinates[port.unLocode] ?? coordinates[port.code]
}
