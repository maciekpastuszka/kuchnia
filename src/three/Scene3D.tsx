import { Html, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { carcassBox, carcassYRanges, dimsLabel, footprint, heightRange } from '../catalog'
import { itemBox, wallLength, wallOutward, wallPieces, wallWindows } from '../geometry'
import { useStore } from '../store'
import type { Item, Settings, Wall } from '../types'
import { DimLine3D, Z_LABELS } from './DimLine3D'
import { Furniture } from './Furniture'
import { MAT } from './materials'

function WallMesh({ wall, walls, height, transparent }: { wall: Wall; walls: Wall[]; height: number; transparent: boolean }) {
  const geoms = useMemo(
    () =>
      wallPieces(wall, walls, height).map(({ poly, y0, y1 }) => {
        const shape = new THREE.Shape(poly.map((p) => new THREE.Vector2(p.x, -p.y)))
        const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false })
        g.rotateX(-Math.PI / 2)
        g.translate(0, y0, 0)
        return g
      }),
    [wall, walls, height],
  )
  useEffect(() => () => geoms.forEach((g) => g.dispose()), [geoms])
  const group = useRef<THREE.Group>(null)
  // przekrój: ściana (z oknami), za którą stoi kamera, znika
  useFrame(({ camera }) => {
    if (!group.current) return
    const n = wallOutward(wall)
    const side = (camera.position.x - wall.x1) * n.x + (camera.position.z - wall.y1) * n.y
    group.current.visible = side < 0
  })
  const select = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return
    e.stopPropagation()
    useStore.getState().select({ kind: 'wall', id: wall.id })
  }
  return (
    <group ref={group} onClick={select}>
      {geoms.map((g, i) => (
        <mesh key={i} geometry={g} material={MAT.wall(transparent)} receiveShadow castShadow={!transparent} />
      ))}
      {wallWindows(wall).map((win) => (
        <Window3D key={win.id} wall={wall} from={win.from} to={win.to} sill={win.sill} height={Math.min(win.height, height - win.sill)} />
      ))}
    </group>
  )
}

const FRAME = 6
const FRAME_DEPTH = 7

/** Okno w otworze: rama z słupkiem przy szerokich oknach, szyby i parapet od strony pokoju. */
function Window3D({ wall, from, to, sill, height }: { wall: Wall; from: number; to: number; sill: number; height: number }) {
  const len = wallLength(wall) || 1
  const d = { x: (wall.x2 - wall.x1) / len, y: (wall.y2 - wall.y1) / len }
  const n = wallOutward(wall)
  const t = wall.thickness
  const mid = (from + to) / 2
  const w = to - from
  // środek grubości ściany; lokalna oś X wzdłuż ściany, +Z w stronę pokoju dla side = 1
  const pos: [number, number, number] = [wall.x1 + d.x * mid + (n.x * t) / 2, 0, wall.y1 + d.y * mid + (n.y * t) / 2]
  const rotY = Math.atan2(-d.y, d.x)
  const room = wall.side
  const sashes = w > 120 ? 2 : 1
  const bar = (x: number, y: number, bw: number, bh: number, key: string) => (
    <mesh key={key} position={[x, y, 0]} material={MAT.windowFrame()} castShadow>
      <boxGeometry args={[bw, bh, FRAME_DEPTH]} />
    </mesh>
  )
  const paneW = (w - FRAME * (sashes + 1)) / sashes
  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      {bar(0, sill + FRAME / 2, w, FRAME, 'b')}
      {bar(0, sill + height - FRAME / 2, w, FRAME, 't')}
      {bar(-w / 2 + FRAME / 2, sill + height / 2, FRAME, height, 'l')}
      {bar(w / 2 - FRAME / 2, sill + height / 2, FRAME, height, 'r')}
      {sashes === 2 && bar(0, sill + height / 2, FRAME, height, 'm')}
      {Array.from({ length: sashes }, (_, i) => (
        <mesh key={`g${i}`} position={[-w / 2 + FRAME + paneW / 2 + i * (paneW + FRAME), sill + height / 2, 0]} material={MAT.windowGlass()}>
          <boxGeometry args={[paneW, height - 2 * FRAME, 0.6]} />
        </mesh>
      ))}
      {/* parapet: od ramy do lica ściany + 3 cm wysięgu, górą na wysokości parapetu */}
      <mesh position={[0, sill - 1, (room * (t / 2 + 3)) / 2]} material={MAT.windowFrame()} castShadow receiveShadow>
        <boxGeometry args={[w + 6, 2, t / 2 + 3]} />
      </mesh>
    </group>
  )
}

function ItemMesh({ item, items, s, selected }: { item: Item; items: Item[]; s: Settings; selected: boolean }) {
  const { w, d } = footprint(item, s)
  const [y0, y1] = heightRange(item, s)
  // po zaznaczeniu zamiast gabarytu całości pokazujemy korpus (fronty mają własne etykiety)
  const dims = s.showDims && !selected ? dimsLabel(item, s) : null
  const cb = selected ? carcassBox(item, s) : null
  const carcassYs = cb ? carcassYRanges(item, s) : []
  const frontBoard = item.type === 'side_panel' || item.type === 'wall_panel'
  const tagRef = useDimsFontSize([item.x, (y0 + y1) / 2, item.y])
  const select = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return
    e.stopPropagation()
    useStore.getState().select({ kind: 'item', id: item.id })
  }
  return (
    <group position={[item.x, 0, item.y]} rotation={[0, (-item.rot * Math.PI) / 2, 0]} onClick={select}>
      <Furniture item={item} items={items} s={s} />
      {dims && (
        // blat: etykieta na przedniej krawędzi, reszta: środek frontu
        <Html position={[0, item.type === 'countertop' ? y1 + 1 : (y0 + y1) / 2, d / 2 + 1]} center occlude zIndexRange={Z_LABELS}>
          <div ref={tagRef} className="dims-3d">
            {dims}
          </div>
        </Html>
      )}
      {selected && cb && carcassYs.length > 0
        ? carcassYs.map(([a, b], i) => (
            <mesh key={i} position={[(cb.x0 + cb.x1) / 2, (a + b) / 2, (cb.z0 + cb.z1) / 2]} material={MAT.selection()} raycast={() => null}>
              <boxGeometry args={[cb.x1 - cb.x0 + 0.4, b - a + 0.4, cb.z1 - cb.z0 + 0.4]} />
            </mesh>
          ))
        : selected && (
            <mesh position={[0, (y0 + y1) / 2, 0]} material={MAT.selection()} raycast={() => null}>
              <boxGeometry args={[w + 0.6, y1 - y0 + 0.6, d + 0.6]} />
            </mesh>
          )}
      {cb && carcassYs.length > 0 && (
        // płyta boczna i płyta pod szafkami górnymi są w kolorze frontów – ich wymiary zielone jak fronty
        <group>
          {/* szerokość po górnej przedniej krawędzi korpusu, głębokość po prawym boku, wysokość przy lewej krawędzi */}
          <DimLine3D from={[cb.x0, carcassYs[carcassYs.length - 1][1] + 2, cb.z1]} to={[cb.x1, carcassYs[carcassYs.length - 1][1] + 2, cb.z1]} tick={[0, 2, 0]} value={cb.x1 - cb.x0} front={frontBoard} />
          <DimLine3D from={[cb.x1, carcassYs[carcassYs.length - 1][1] + 2, cb.z0]} to={[cb.x1, carcassYs[carcassYs.length - 1][1] + 2, cb.z1]} tick={[0, 2, 0]} value={cb.z1 - cb.z0} front={frontBoard} />
          {carcassYs.map(([a, b], i) => (
            <DimLine3D key={i} from={[cb.x0 - 3, a, cb.z1]} to={[cb.x0 - 3, b, cb.z1]} tick={[2, 0, 0]} value={b - a} front={frontBoard} />
          ))}
        </group>
      )}
    </group>
  )
}

const tmp = new THREE.Vector3()

/**
 * Czcionka etykiety wymiarów maleje z odległością kamery, w granicach 7–10 px.
 * Liczone tutaj, bo dzieci <Html> renderują się poza kontekstem Canvas (bez useFrame).
 */
function useDimsFontSize(at: [number, number, number]) {
  const ref = useRef<HTMLDivElement>(null)
  useFrame(({ camera }) => {
    if (!ref.current) return
    const dist = camera.position.distanceTo(tmp.set(...at))
    ref.current.style.fontSize = `${Math.max(7, Math.min(10, 3000 / dist)).toFixed(1)}px`
  })
  return ref
}

/** Tylko w trybie deweloperskim: dostęp do sceny z konsoli (kontrola wymiarów narysowanych płyt). */
function DevSceneHandle() {
  const scene = useThree((st) => st.scene)
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __kitchenScene?: THREE.Scene }).__kitchenScene = scene
  }, [scene])
  return null
}

function bounds(walls: Wall[], items: Item[], s: Settings) {
  const xs: number[] = []
  const ys: number[] = []
  for (const w of walls) xs.push(w.x1, w.x2), ys.push(w.y1, w.y2)
  for (const i of items) {
    const b = itemBox(i, s)
    xs.push(b.minX, b.maxX)
    ys.push(b.minY, b.maxY)
  }
  if (!xs.length) return { minX: 0, maxX: 400, minY: 0, maxY: 300 }
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
}

/** Kamera na wysokości wzroku, z lewego dołu rzutu, patrzy na środek zabudowy. */
function cameraPose(b: ReturnType<typeof bounds>) {
  const cx = (b.minX + b.maxX) / 2
  const cz = (b.minY + b.maxY) / 2
  const span = Math.max(b.maxX - b.minX, b.maxY - b.minY, 200)
  return {
    position: [cx - span * 0.25, 240, b.maxY + span * 0.5] as [number, number, number],
    target: [cx, 100, cz - span * 0.05] as [number, number, number],
  }
}

export function Scene3D() {
  const walls = useStore((s) => s.walls)
  const items = useStore((s) => s.items)
  const s = useStore((st) => st.settings)
  const selection = useStore((st) => st.selection)
  const controls = useRef<OrbitControlsImpl>(null)

  const b = bounds(walls, items, s)
  const cx = (b.minX + b.maxX) / 2
  const cz = (b.minY + b.maxY) / 2
  const span = Math.max(b.maxX - b.minX, b.maxY - b.minY, 200)
  const initial = useRef(cameraPose(b))

  useEffect(() => {
    const onReset = () => {
      const c = controls.current
      if (!c) return
      const pose = cameraPose(b)
      c.target.set(...pose.target)
      c.object.position.set(...pose.position)
      c.update()
    }
    window.addEventListener('3d:reset', onReset)
    return () => window.removeEventListener('3d:reset', onReset)
  }, [b.minX, b.maxX, b.minY, b.maxY])

  const i0 = initial.current
  return (
    <Canvas
      shadows
      camera={{ position: i0.position, fov: 50, near: 1, far: 10000 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        // Neutral zachowuje odcienie materiałów (ACES wypłukiwał niebieski denim w szarość)
        gl.toneMapping = THREE.NeutralToneMapping
        gl.toneMappingExposure = 1
      }}
    >
      <color attach="background" args={['#dfe3e8']} />
      <hemisphereLight args={['#ffffff', '#b9b2a6', 1.4]} />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[cx - 120, 700, cz + 380]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-camera-near={10}
        shadow-camera-far={3000}
        shadow-bias={-0.0004}
      >
        <object3D attach="target" position={[cx, 0, cz]} />
      </directionalLight>
      <pointLight position={[cx, s.ceilingHeight - 20, cz]} intensity={25000} distance={900} decay={2} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]} receiveShadow material={MAT.floor()}>
        <planeGeometry args={[span + 200, span + 200]} />
      </mesh>

      {walls.map((w) => (
        <WallMesh key={w.id} wall={w} walls={walls} height={s.ceilingHeight} transparent={s.wallsTransparent} />
      ))}
      {items.map((i) => (
        <ItemMesh key={i.id} item={i} items={items} s={s} selected={selection?.kind === 'item' && selection.id === i.id} />
      ))}

      <DevSceneHandle />
      <OrbitControls ref={controls} makeDefault target={i0.target} maxPolarAngle={Math.PI / 2 - 0.02} />
    </Canvas>
  )
}
