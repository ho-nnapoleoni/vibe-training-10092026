import { useEffect } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { RouteModel } from '../domain/routing'
import { chokepointRules } from '../domain/chokepoints'
import type { ImpactAssessment } from '../types'

function FitRoute({ route }: { route: RouteModel }) {
  const map = useMap()
  useEffect(() => {
    const points = [...route.nominal, ...route.alternate].map((point) => [point.lat, point.lng] as [number, number])
    if (points.length > 1) map.fitBounds(points, { padding: [28, 28] })
  }, [map, route])
  return null
}

export function MapViewer({ route, impact, mode = 'combined' }: { route: RouteModel; impact: ImpactAssessment; mode?: 'combined' | 'nominal' | 'alternate' }) {
  const nominal = route.nominal.map((point) => [point.lat, point.lng] as [number, number])
  const alternate = route.alternate.map((point) => [point.lat, point.lng] as [number, number])
  const affected = route.affected.map((point) => [point.lat, point.lng] as [number, number])
  const activeRules = chokepointRules.filter((rule) => impact.activeChokepoints.includes(rule.id))
  const center: [number, number] = nominal[0] ?? [20, 0]

  return <div className="map-shell">
    <MapContainer className="route-map" center={center} zoom={2} scrollWheelZoom={false} worldCopyJump>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitRoute route={route} />
      {mode !== 'alternate' && nominal.length > 1 && <Polyline positions={nominal} pathOptions={{ color: '#a8ebcf', weight: 3, opacity: .86 }} />}
      {mode === 'combined' && affected.length > 0 && <Polyline positions={affected} pathOptions={{ color: '#ff806c', weight: 7, opacity: .95 }} />}
      {mode !== 'nominal' && alternate.length > 1 && <Polyline positions={alternate} pathOptions={{ color: '#ff806c', weight: 2, opacity: .9, dashArray: '7 8' }} />}
      {route.ports.map((point) => <CircleMarker key={point.unLocode} center={[point.lat, point.lng]} radius={6} pathOptions={{ color: '#0b2026', weight: 2, fillColor: '#a8ebcf', fillOpacity: 1 }}><Tooltip direction="top">{point.label} · {point.unLocode}</Tooltip></CircleMarker>)}
      {activeRules.map((rule) => <CircleMarker key={rule.id} center={[rule.marker.lat, rule.marker.lng]} radius={8} pathOptions={{ color: '#ff806c', weight: 2, fillColor: '#ff806c', fillOpacity: .25 }}><Tooltip direction="top">{rule.label} · fermeture simulee</Tooltip></CircleMarker>)}
    </MapContainer>
    <div className="map-legend">{mode !== 'alternate' && <span><i className="legend-line nominal-line" />API / fixture route</span>}{mode !== 'nominal' && <span><i className="legend-line alternate-line" />Heuristic alternative</span>}{mode === 'combined' && <span><i className="legend-dot closure-dot" />Closed chokepoint</span>}</div>
    {route.missingPorts.length > 0 && <p className="map-note">Coordinates unavailable for {route.missingPorts.join(', ')}. The timeline remains authoritative.</p>}
    {!route.depthValidated && <p className="map-note">Indicative maritime network route. Draft, under-keel clearance, tides and current navigational warnings are not validated.</p>}
  </div>
}
