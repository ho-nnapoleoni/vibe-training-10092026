import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { RouteModel } from '../domain/routing'
import { chokepointRules } from '../domain/chokepoints'
import type { Coordinates, ImpactAssessment } from '../types'

const EARTH_RADIUS = 1.42
const EARTH_TEXTURE = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'

function toVector(point: Coordinates, radius = EARTH_RADIUS) {
  const phi = (90 - point.lat) * Math.PI / 180
  const theta = (point.lng + 180) * Math.PI / 180
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

function arcBetween(start: Coordinates, end: Coordinates, lift = .08) {
  const from = toVector(start)
  const to = toVector(end)
  return Array.from({ length: 25 }, (_, index) => {
    const point = from.clone().lerp(to, index / 24).normalize()
    const height = EARTH_RADIUS + Math.sin(Math.PI * index / 24) * lift
    return point.multiplyScalar(height)
  })
}

function Earth({ route, impact }: { route: RouteModel; impact: ImpactAssessment }) {
  const texture = useTexture(EARTH_TEXTURE)
  texture.colorSpace = THREE.SRGBColorSpace
  const nominalArcs = route.nominal.slice(1).map((point, index) => arcBetween(route.nominal[index], point))
  const alternateArcs = route.alternate.length > 1 ? route.alternate.slice(1).map((point, index) => arcBetween(route.alternate[index], point, .12)) : []
  const activeRules = chokepointRules.filter((rule) => impact.activeChokepoints.includes(rule.id))

  return <>
    <ambientLight intensity={1.7} />
    <directionalLight position={[4, 2, 5]} intensity={2.8} />
    <Stars radius={7} depth={4} count={700} factor={2.1} saturation={0} fade speed={.25} />
    <mesh>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <meshStandardMaterial map={texture} roughness={.95} metalness={0} />
    </mesh>
    <mesh scale={1.035}>
      <sphereGeometry args={[EARTH_RADIUS, 48, 48]} />
      <meshBasicMaterial color="#8ee8d0" transparent opacity={.08} side={THREE.BackSide} />
    </mesh>
    {nominalArcs.map((arc, index) => <line key={`nominal-${index}`}><bufferGeometry attach="geometry" onUpdate={(geometry) => geometry.setFromPoints(arc)} /><lineBasicMaterial color="#a8ebcf" linewidth={2} transparent opacity={.95} /></line>)}
    {alternateArcs.map((arc, index) => <line key={`alternate-${index}`}><bufferGeometry attach="geometry" onUpdate={(geometry) => geometry.setFromPoints(arc)} /><lineDashedMaterial color="#ff806c" dashSize={.07} gapSize={.045} linewidth={2} /></line>)}
    {route.ports.map((point) => <mesh key={point.unLocode} position={toVector(point, EARTH_RADIUS + .025)}><sphereGeometry args={[.045, 12, 12]} /><meshBasicMaterial color="#a8ebcf" /></mesh>)}
    {activeRules.map((rule) => <mesh key={rule.id} position={toVector(rule.marker, EARTH_RADIUS + .035)}><sphereGeometry args={[.065, 14, 14]} /><meshBasicMaterial color="#ff806c" /></mesh>)}
  </>
}

export function GlobeViewer({ route, impact }: { route: RouteModel; impact: ImpactAssessment }) {
  return <div className="globe-shell">
    <Canvas camera={{ position: [0, .2, 4.2], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={['#061116']} />
      <Earth route={route} impact={impact} />
      <OrbitControls enablePan={false} minDistance={2.4} maxDistance={6} enableDamping dampingFactor={.08} autoRotate autoRotateSpeed={.25} />
    </Canvas>
    <div className="globe-overlay"><span>3D NETWORK VIEW</span><small>Drag to rotate · scroll to zoom</small></div>
    <div className="map-legend globe-legend"><span><i className="legend-line nominal-line" />Nominal route</span><span><i className="legend-line alternate-line" />Estimated alternative</span><span><i className="legend-dot closure-dot" />Closed chokepoint</span></div>
  </div>
}
