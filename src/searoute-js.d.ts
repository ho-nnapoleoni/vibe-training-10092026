declare module 'searoute-js' {
  interface PointFeature {
    type: 'Feature'
    properties: Record<string, unknown>
    geometry: { type: 'Point'; coordinates: [number, number] }
  }

  interface LineFeature {
    type: 'Feature'
    properties: { length?: number; units?: string }
    geometry: { type: 'LineString'; coordinates: [number, number][] }
  }

  export default function seaRoute(origin: PointFeature, destination: PointFeature, units?: string): LineFeature
}