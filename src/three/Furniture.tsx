import { Html } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { FRIDGE, HOB, OVEN, OVEN_COLUMN_WIDTH, SINK, baseTop, counterTop, doorCount, drawerFronts, fmt, footprint, materialsFor, columnUpperSpec, baseFrontRange, itemSettings, ovenNicheTop, vanityRange, shallowSplit, sidePanelPieces, wallCarcassBottom } from '../catalog'
import { itemBox, toLocal } from '../geometry'
import { useStore } from '../store'
import type { Item, Settings } from '../types'
import { MAT, boardMaterial, handleMaterial, stoneMaterial } from './materials'
import { DimLine3D, Z_FRONTS } from './DimLine3D'
import { Panel } from './Panel'

type R = [number, number]

interface Ctx {
  /** Id mebla – prefiks kluczy otwieranych frontów. */
  id: string
  s: Settings
  front: THREE.Material
  carcass: THREE.Material
  handle: THREE.Material
}

const PLINTH_RECESS = 4
/** Uchwyt płaski owalny 96 mm (seria Kolory Płaskie): dł. 14,4, szer. 1,8, wysokość od frontu 2,4, rozstaw 9,6 cm. */
const HANDLE_LEN = 14.4
const HANDLE_W = 1.8
const HANDLE_H = 2.4
const HANDLE_SPACING = 9.6
const GRIP_T = 0.6

/** Płaski owal (stadion) wyciągnięty w z – część chwytna uchwytu; wspólna geometria dla wszystkich uchwytów. */
const GRIP_GEOMETRY = (() => {
  const r = HANDLE_W / 2
  const half = HANDLE_LEN / 2 - r
  const shape = new THREE.Shape()
  shape.moveTo(-half, -r)
  shape.lineTo(half, -r)
  shape.absarc(half, 0, r, -Math.PI / 2, Math.PI / 2, false)
  shape.lineTo(-half, r)
  shape.absarc(-half, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false)
  const g = new THREE.ExtrudeGeometry(shape, { depth: GRIP_T - 0.2, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3, curveSegments: 16 })
  g.translate(0, 0, HANDLE_H - GRIP_T + 0.1)
  return g
})()
const LEG_GEOMETRY = (() => {
  const g = new THREE.CylinderGeometry(0.45, 0.55, HANDLE_H - GRIP_T + 0.1, 16)
  g.rotateX(Math.PI / 2)
  g.translate(0, 0, (HANDLE_H - GRIP_T + 0.1) / 2)
  return g
})()

function useCtx(s: Settings, item: Item): Ctx {
  const m = materialsFor(item, s)
  return { id: item.id, s, front: boardMaterial(m.front), carcass: boardMaterial(m.carcass), handle: handleMaterial(s.handleColor) }
}

/** Uchwyt płaski owalny: poziomy lub pionowy, środek w (cx, cy), lico frontu na z. */
function Handle({ cx, cy, z, vertical, material }: { cx: number; cy: number; z: number; vertical?: boolean; material: THREE.Material }) {
  return (
    <group position={[cx, cy, z]} rotation={[0, 0, vertical ? Math.PI / 2 : 0]}>
      <mesh geometry={GRIP_GEOMETRY} material={material} castShadow />
      {[-HANDLE_SPACING / 2, HANDLE_SPACING / 2].map((lx) => (
        <mesh key={lx} geometry={LEG_GEOMETRY} material={material} position={[lx, 0, 0]} />
      ))}
    </group>
  )
}

/**
 * Front albo płyta w kolorze frontów (blenda, maskownica, płyta boczna). Kliknięcie w 3D zaznacza go:
 * niebieski obrys i wymiar „szer × wys” na środku, pełny wymiar w panelu właściwości.
 */
function FrontPanel({ x, y, z, c }: { x: R; y: R; z: R; c: Ctx }) {
  const key = `${c.id}:f:${x[0].toFixed(1)}:${y[0].toFixed(1)}:${z[0].toFixed(1)}`
  const selected = useStore((st) => st.selectedFront?.key === key)
  const itemSelected = useStore((st) => st.selection?.kind === 'item' && st.selection.id === c.id)
  const dx = x[1] - x[0]
  const dz = z[1] - z[0]
  // płyta boczna stoi bokiem: jej „szerokość” to głębokość
  const w = Math.max(dx, dz)
  const h = y[1] - y[0]
  const t = Math.min(dx, dz)
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return
    const st = useStore.getState()
    st.select({ kind: 'item', id: c.id })
    st.selectFront({ key, w, h, t })
  }
  return (
    <group onClick={onClick} name={`front:${c.id}`}>
      <Panel x={x} y={y} z={z} material={c.front} edges highlight={selected} />
      {itemSelected && !selected && (
        <Html position={[(x[0] + x[1]) / 2, (y[0] + y[1]) / 2, z[1] + 0.5]} center zIndexRange={Z_FRONTS}>
          <div className="front-dims small">
            {fmt(w)} × {fmt(h)}
          </div>
        </Html>
      )}
      {selected &&
        (dx >= dz ? (
          <group>
            <DimLine3D from={[x[0], y[0] + 3, z[1] + 0.6]} to={[x[1], y[0] + 3, z[1] + 0.6]} tick={[0, 1.5, 0]} value={w} />
            <DimLine3D from={[x[0] + 3, y[0], z[1] + 0.6]} to={[x[0] + 3, y[1], z[1] + 0.6]} tick={[1.5, 0, 0]} value={h} />
          </group>
        ) : (
          // płyta boczna: szerokość to głębokość (wzdłuż z)
          <group>
            <DimLine3D from={[x[1] + 0.6, y[0] + 3, z[0]]} to={[x[1] + 0.6, y[0] + 3, z[1]]} tick={[0, 1.5, 0]} value={w} />
            <DimLine3D from={[x[1] + 0.6, y[0], z[1] - 3]} to={[x[1] + 0.6, y[1], z[1] - 3]} tick={[0, 0, 1.5]} value={h} />
          </group>
        ))}
    </group>
  )
}

type OpenKind = 'hingeL' | 'hingeR' | 'drawer' | 'flap'

/**
 * Front otwierany kliknięciem w 3D: drzwi obracają się o 100° na krawędzi zawiasu, szuflada wysuwa się o `travel`,
 * klapa (zmywarka, piekarnik) opada o 90° na dolnej krawędzi. `pivot` to oś obrotu w układzie mebla.
 */
function Openable({ id, kind, pivot = [0, 0, 0], travel = 40, children }: { id: string; kind: OpenKind; pivot?: [number, number, number]; travel?: number; children: ReactNode }) {
  const open = useStore((st) => !!st.openFronts[id])
  const ref = useRef<THREE.Group>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    const g = ref.current
    const target = open ? 1 : 0
    if (!g || Math.abs(t.current - target) < 0.0005) return
    t.current += (target - t.current) * Math.min(1, dt * 8)
    const v = t.current
    if (kind === 'drawer') g.position.z = v * travel
    else if (kind === 'flap') g.rotation.x = (v * Math.PI) / 2
    else g.rotation.y = (kind === 'hingeL' ? -1 : 1) * v * ((100 * Math.PI) / 180)
  })
  const toggle = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return
    e.stopPropagation()
    const st = useStore.getState()
    st.toggleFront(id)
    st.select({ kind: 'item', id: id.split(':')[0] })
  }
  return (
    <group position={pivot} onClick={toggle}>
      <group ref={ref}>
        <group position={[-pivot[0], -pivot[1], -pivot[2]]}>{children}</group>
      </group>
    </group>
  )
}

/** Skrzynka szuflady za frontem (widoczna po wysunięciu). */
function DrawerBox({ x, y, zFront, depth, c }: { x: R; y: R; zFront: number; depth: number; c: Ctx }) {
  const t = c.s.boardThickness
  const k = 1.2
  const x0 = x[0] + t + 1.3
  const x1 = x[1] - t - 1.3
  const y0 = y[0] + 2
  const y1 = Math.max(y0 + 8, y[1] - 4)
  const z0 = zFront - depth
  const m = MAT.drawerBox()
  return (
    <group>
      <Panel x={[x0, x1]} y={[y0, y0 + k]} z={[z0, zFront]} material={m} shadow={false} />
      <Panel x={[x0, x0 + k]} y={[y0, y1]} z={[z0, zFront]} material={m} shadow={false} />
      <Panel x={[x1 - k, x1]} y={[y0, y1]} z={[z0, zFront]} material={m} shadow={false} />
      <Panel x={[x0, x1]} y={[y0, y1]} z={[z0, z0 + k]} material={m} shadow={false} />
    </group>
  )
}

/** Szuflady z frontami, uchwytami i skrzynkami; `handle` = false dla TIP-ON. */
function Drawers({ name, count, x, bottom, height, zCF, zF, handle, carcassDepth, c }: { name: string; count: 1 | 2 | 3; x: R; bottom: number; height: number; zCF: number; zF: number; handle: boolean; carcassDepth?: number; c: Ctx }) {
  const sg = c.s.frontSideGap
  // skrzynka o 5 cm płytsza od korpusu (prowadnice), najwyżej 45 cm
  const depth = Math.min(45, (carcassDepth ?? c.s.baseCarcassDepth) - 5)
  return (
    <group>
      {drawerFronts(count, bottom, height, c.s).map((f, i, all) => (
        <Openable key={i} id={`${c.id}:${name}${i}`} kind="drawer" travel={depth - 5}>
          <FrontPanel x={[x[0] + sg, x[1] - sg]} y={[f.y, f.y + f.h]} z={[zCF, zF]} c={c} />
          <DrawerBox x={x} y={[f.y, f.y + f.h]} zFront={zCF} depth={depth} c={c} />
          {/* w zestawie 3 szuflad uchwyt górnej na środku frontu, w pozostałych przy górnej krawędzi */}
          {handle && <Handle cx={(x[0] + x[1]) / 2} cy={all.length === 3 && i === 2 ? f.y + f.h / 2 : f.y + f.h - 4} z={zF} material={c.handle} />}
        </Openable>
      ))}
    </group>
  )
}

/** Korpus z płyt: boki, dno, opcjonalnie wieniec górny, plecy HDF (do wysokości `backTo`, jeśli plecy są wycięte). */
function Carcass({ x, y, z, top, backTo, c }: { x: R; y: R; z: R; top: boolean; backTo?: number; c: Ctx }) {
  const t = c.s.boardThickness
  return (
    <group name={`carcass:${c.id}`}>
      <Panel x={[x[0], x[0] + t]} y={y} z={z} material={c.carcass} />
      <Panel x={[x[1] - t, x[1]]} y={y} z={z} material={c.carcass} />
      <Panel x={[x[0] + t, x[1] - t]} y={[y[0], y[0] + t]} z={z} material={c.carcass} />
      {top && <Panel x={[x[0] + t, x[1] - t]} y={[y[1] - t, y[1]]} z={z} material={c.carcass} />}
      <Panel x={[x[0] + t, x[1] - t]} y={[y[0] + t, backTo ?? y[1] - (top ? t : 0)]} z={[z[0], z[0] + 0.3]} material={MAT.hdf()} shadow={false} />
    </group>
  )
}

/** Płyta boczna od podłogi do sufitu, opcjonalnie z dwóch kawałków łączonych w linii `split`. */
function SidePanel({ x, z, split, c }: { x: R; z: R; split: number | null; c: Ctx }) {
  const C = c.s.ceilingHeight
  const g = c.s.frontGap
  if (split === null) return <FrontPanel x={x} y={[0, C]} z={z} c={c} />
  return (
    <group>
      <FrontPanel x={x} y={[0, split - g / 2]} z={z} c={c} />
      <FrontPanel x={x} y={[split + g / 2, C]} z={z} c={c} />
    </group>
  )
}

function Plinth({ x, zFront, c }: { x: R; zFront: number; c: Ctx }) {
  return <Panel x={x} y={[0, c.s.plinthHeight]} z={[zFront - PLINTH_RECESS - c.s.boardThickness, zFront - PLINTH_RECESS]} material={c.front} />
}

/** Drzwiczki jedno- lub dwuskrzydłowe, otwierane kliknięciem. */
function Doors({ name, x, y, z, hinge, count, handle, c }: { name: string; x: R; y: R; z: R; hinge: 'L' | 'R'; count: 1 | 2; handle: boolean; c: Ctx }) {
  const sg = c.s.frontSideGap
  const mid = (x[0] + x[1]) / 2
  const leaves: { x: R; handleAt: number; hinge: 'L' | 'R' }[] =
    count === 1
      ? [{ x: [x[0] + sg, x[1] - sg], handleAt: hinge === 'L' ? x[1] - 4 : x[0] + 4, hinge }]
      : [
          { x: [x[0] + sg, mid - sg], handleAt: mid - 4, hinge: 'L' },
          { x: [mid + sg, x[1] - sg], handleAt: mid + 4, hinge: 'R' },
        ]
  return (
    <group>
      {leaves.map((l, i) => (
        <Openable
          key={i}
          id={`${c.id}:${name}${i}`}
          kind={l.hinge === 'L' ? 'hingeL' : 'hingeR'}
          pivot={[l.hinge === 'L' ? l.x[0] : l.x[1], 0, z[1]]}
        >
          <FrontPanel x={l.x} y={y} z={z} c={c} />
          {handle && <Handle cx={l.handleAt} cy={y[1] - 4 - HANDLE_LEN / 2} z={z[1]} vertical material={c.handle} />}
        </Openable>
      ))}
    </group>
  )
}

function BaseCabinet({ item, c }: { item: Item; c: Ctx }) {
  const { s } = c
  const { w, d } = footprint(item, s)
  const P = s.plinthHeight
  const H = s.baseCarcassHeight
  const zBack = -d / 2
  const zCF = zBack + s.baseCarcassDepth
  const zF = d / 2
  const x: R = [-w / 2, w / 2]
  return (
    <group>
      <Carcass x={x} y={[P, P + H]} z={[zBack, zCF]} top={false} c={c} />
      <Plinth x={x} zFront={zF} c={c} />
      {item.type === 'base_drawers' ? (
        <Drawers name="drawer" count={item.drawers ?? 3} x={x} bottom={baseFrontRange(s)[0]} height={H} zCF={zCF} zF={zF} handle c={c} />
      ) : (
        <Doors name="door" x={x} y={baseFrontRange(s)} z={[zCF, zF]} hinge={item.hinge ?? 'L'} count={doorCount(item)} handle c={c} />
      )}
    </group>
  )
}

/** Narożnik L: plecy przy -z i -x, drzwi łamane na wewnętrznym narożu. */
function CornerCabinet({ item, c }: { item: Item; c: Ctx }) {
  const { s } = c
  const W = item.width
  const h = W / 2
  const P = s.plinthHeight
  const H = s.baseCarcassHeight
  const t = s.boardThickness
  const cd = s.baseCarcassDepth
  const inner = -h + cd
  const y: R = [P, P + H]
  const fy: R = baseFrontRange(s)
  return (
    <group>
      {/* bok na końcu ramienia wzdłuż x */}
      <Panel x={[h - t, h]} y={y} z={[-h, inner]} material={c.carcass} />
      {/* bok na końcu ramienia wzdłuż z */}
      <Panel x={[-h, inner]} y={y} z={[h - t, h]} material={c.carcass} />
      <Panel x={[-h, h - t]} y={[P, P + t]} z={[-h, inner]} material={c.carcass} />
      <Panel x={[-h, inner]} y={[P, P + t]} z={[inner, h - t]} material={c.carcass} />
      <Panel x={[-h, h]} y={y} z={[-h, -h + 0.3]} material={MAT.hdf()} shadow={false} />
      <Panel x={[-h, -h + 0.3]} y={y} z={[-h, h]} material={MAT.hdf()} shadow={false} />
      <Panel x={[inner + s.frontThickness - PLINTH_RECESS, h]} y={[0, P]} z={[inner + s.frontThickness - PLINTH_RECESS - t, inner + s.frontThickness - PLINTH_RECESS]} material={c.front} />
      <Panel x={[inner + s.frontThickness - PLINTH_RECESS - t, inner + s.frontThickness - PLINTH_RECESS]} y={[0, P]} z={[inner + s.frontThickness - PLINTH_RECESS, h]} material={c.front} />
      {/* drzwi łamane */}
      <FrontPanel x={[inner + s.frontThickness, h - s.frontSideGap]} y={fy} z={[inner, inner + s.frontThickness]} c={c} />
      <FrontPanel x={[inner, inner + s.frontThickness]} y={fy} z={[inner, h - s.frontSideGap]} c={c} />
      <Handle cx={h - 4} cy={fy[1] - 4 - HANDLE_LEN / 2} z={inner + s.frontThickness} vertical material={c.handle} />
    </group>
  )
}

/**
 * Słupek z piekarnikiem – dolny korpus: drzwi (lub szuflady) TIP-ON i piekarnik na wysokości blatu.
 * Szafki nad piekarnikiem (`column_upper`) i płyty boczne (`side_panel`) to osobne elementy.
 */
function OvenColumn({ item, c }: { item: Item; c: Ctx }) {
  const { s } = c
  const { w, d } = footprint(item, s)
  const t = s.boardThickness
  const P = s.plinthHeight
  const xL = -w / 2 + (item.panelLeft ? t : 0)
  const xR = xL + OVEN_COLUMN_WIDTH
  const zBack = -d / 2
  const zF = d / 2
  // front TIP-ON: tył frontu na zFB, korpus kończy się o luz wcześniej
  const zFB = zF - s.frontThickness
  const zCF = zFB - s.tipOnGap
  const bTop = baseTop(s)
  const nTop = ovenNicheTop(s)
  return (
    <group>
      {item.panelLeft && <SidePanel x={[-w / 2, -w / 2 + t]} z={[zBack, zF]} split={item.panelSplitLeft ? shallowSplit(s) : null} c={c} />}
      {item.panelRight && <SidePanel x={[w / 2 - t, w / 2]} z={[zBack, zF]} split={item.panelSplitRight ? shallowSplit(s) : null} c={c} />}
      <Plinth x={[xL, xR]} zFront={zF} c={c} />
      {/* plecy wycięte w strefie piekarnika – jego tył wchodzi w luz za korpusem */}
      <Carcass x={[xL, xR]} y={[P, nTop + t]} z={[zBack, zCF]} top backTo={bTop - t} c={c} />
      <Panel x={[xL + t, xR - t]} y={[bTop - t, bTop]} z={[zBack + 0.3, zCF]} material={c.carcass} />
      {item.underOvenDoor ? (
        <Doors name="under" x={[xL, xR]} y={baseFrontRange(s)} z={[zFB, zF]} hinge={item.hinge ?? 'L'} count={1} handle={false} c={c} />
      ) : (
        <Drawers name="under" count={item.drawers ?? 3} x={[xL, xR]} bottom={baseFrontRange(s)[0]} height={s.baseCarcassHeight} zCF={zFB} zF={zF} handle={false} c={c} />
      )}
      <Oven id={`${c.id}:oven`} x={(xL + xR) / 2} y={bTop} z={zFB} handle={handleMaterial('steel')} />
    </group>
  )
}

/** Piekarnik: panel sterowania na górze stały, drzwi (klapa) opadają po kliknięciu. */
function Oven({ id, x, y, z, handle }: { id: string; x: number; y: number; z: number; handle: THREE.Material }) {
  const hw = OVEN.w / 2
  const top = y + OVEN.h
  const doorTop = top - 9.5
  return (
    <group>
      <Panel x={[x - hw + 1, x + hw - 1]} y={[y, top - 1]} z={[z - OVEN.d + 2, z]} material={MAT.dark()} shadow={false} />
      <Panel x={[x - hw, x + hw]} y={[doorTop, top]} z={[z, z + 2]} material={MAT.glass()} />
      <Openable id={id} kind="flap" pivot={[x, y, z + 2]}>
        <Panel x={[x - hw, x + hw]} y={[y, doorTop - 0.2]} z={[z, z + 2]} material={MAT.glass()} />
        <Panel x={[x - 22, x + 22]} y={[y + 8, y + 38]} z={[z + 2, z + 2.05]} material={MAT.ovenWindow()} shadow={false} />
        <Panel x={[x - 25, x + 25]} y={[top - 13.5, top - 12.5]} z={[z + 5, z + 6]} material={handle} />
        {[-22, 22].map((lx) => (
          <Panel key={lx} x={[x + lx - 0.5, x + lx + 0.5]} y={[top - 13.4, top - 12.6]} z={[z + 2, z + 5]} material={handle} />
        ))}
      </Openable>
      {[-21, 21].map((kx) => (
        <mesh key={kx} position={[x + kx, top - 4.7, z + 2.8]} rotation={[Math.PI / 2, 0, 0]} material={handle}>
          <cylinderGeometry args={[1.7, 1.7, 1.6, 24]} />
        </mesh>
      ))}
      <Panel x={[x - 6, x + 6]} y={[top - 6.5, top - 3]} z={[z + 2, z + 2.08]} material={MAT.ring()} shadow={false} />
    </group>
  )
}

/** Płytki słupek – dolna szafka: drzwi TIP-ON do podłogi, cokół schowany za frontem. Szafka górna to osobny element. */
function ShallowColumn({ item, c }: { item: Item; c: Ctx }) {
  const { s } = c
  const { w, d } = footprint(item, s)
  const t = s.boardThickness
  const g = s.frontGap
  const P = s.plinthHeight
  const C = s.ceilingHeight
  const split = shallowSplit(s)
  const xL = -w / 2 + (item.panelLeft ? t : 0)
  const xR = w / 2 - (item.panelRight ? t : 0)
  const zBack = -d / 2
  const zF = d / 2
  const zFB = zF - s.frontThickness
  const zCF = zFB - s.tipOnGap
  const hinge = item.hinge ?? 'L'
  return (
    <group>
      {item.panelLeft && <FrontPanel x={[-w / 2, -w / 2 + t]} y={[0, C]} z={[zBack, zF]} c={c} />}
      {item.panelRight && <FrontPanel x={[w / 2 - t, w / 2]} y={[0, C]} z={[zBack, zF]} c={c} />}
      <Plinth x={[xL, xR]} zFront={zF} c={c} />
      <Carcass x={[xL, xR]} y={[P, split]} z={[zBack, zCF]} top c={c} />
      <Doors name="lower" x={[xL, xR]} y={[s.shallowFloorGap, split - g / 2]} z={[zFB, zF]} hinge={hinge} count={doorCount(item)} handle={false} c={c} />
    </group>
  )
}

/** Szafka podwieszana pod zlew: korpus z wieńcem, bez cokołu, szuflady z uchwytami (górna z wycięciem U na syfon). */
function Vanity({ item, c }: { item: Item; c: Ctx }) {
  const { s } = c
  const { w, d } = footprint(item, s)
  const [bottom, top] = vanityRange(item, s)
  const zBack = -d / 2
  const zCF = d / 2 - s.frontThickness
  const zF = d / 2
  const x: R = [-w / 2, w / 2]
  return (
    <group>
      <Carcass x={x} y={[bottom, top]} z={[zBack, zCF]} top c={c} />
      <Drawers name="drawer" count={item.drawers === 2 ? 2 : 1} x={x} bottom={bottom} height={top - bottom} zCF={zCF} zF={zF} handle carcassDepth={zCF - zBack} c={c} />
    </group>
  )
}

/** Szafka górna słupka (osobny element): korpus, drzwi TIP-ON i opcjonalna blenda/maskownica do sufitu. */
function ColumnUpper({ item, c }: { item: Item; c: Ctx }) {
  const { s } = c
  const { w, d } = footprint(item, s)
  const u = columnUpperSpec(item, s)
  const sg = s.frontSideGap
  const zBack = -d / 2
  const zF = d / 2
  const zFB = zF - s.frontThickness
  const zCF = zFB - s.tipOnGap
  const x: R = [-w / 2, w / 2]
  return (
    <group>
      <Carcass x={x} y={u.carcass} z={[zBack, zCF]} top c={c} />
      <Doors name="door" x={x} y={u.front} z={[zFB, zF]} hinge={item.hinge ?? 'L'} count={doorCount(item)} handle={false} c={c} />
      {u.mask && <FrontPanel x={u.maskSideGap ? [x[0] + sg, x[1] - sg] : x} y={u.mask} z={[zFB, zF]} c={c} />}
    </group>
  )
}

/**
 * Szafka górna do maskownicy pod sufitem. Korpus stoi na płycie pod szafkami (osobny element `wall_panel`),
 * front schodzi do jej spodu i zakrywa ją z przodu.
 */
function WallCabinet({ item, c }: { item: Item; c: Ctx }) {
  const { s } = c
  const { w, d } = footprint(item, s)
  const g = s.frontGap
  const bottom = s.wallCabinetBottom
  const top = s.ceilingHeight - s.ceilingGap
  const zBack = -d / 2
  const zCF = d / 2 - s.frontThickness
  const zF = d / 2
  const x: R = [-w / 2, w / 2]
  const carcassBottom = wallCarcassBottom(s)
  return (
    <group>
      <Carcass x={x} y={[carcassBottom, top]} z={[zBack, zCF]} top c={c} />
      <Doors name="door" x={x} y={[bottom, top - g]} z={[zCF, zF]} hinge={item.hinge ?? 'L'} count={doorCount(item)} handle={false} c={c} />
      <FrontPanel x={[x[0] + s.frontSideGap, x[1] - s.frontSideGap]} y={[top, s.ceilingHeight]} z={[zCF, zF]} c={c} />
    </group>
  )
}

/** Płyta boczna od podłogi do sufitu (osobny element), opcjonalnie z dwóch kawałków. */
function SidePanelItem({ item, c }: { item: Item; c: Ctx }) {
  const { w, d } = footprint(item, c.s)
  return (
    <group>
      {sidePanelPieces(item, c.s).map(([a, b], i) => (
        <FrontPanel key={i} x={[-w / 2, w / 2]} y={[a, b]} z={[-d / 2, d / 2]} c={c} />
      ))}
    </group>
  )
}

/** Płyta pod szafkami górnymi (osobny element) – spód w linii dolnej krawędzi frontów. */
function WallPanel({ item, c }: { item: Item; c: Ctx }) {
  const { s } = c
  const { w, d } = footprint(item, s)
  return <FrontPanel x={[-w / 2, w / 2]} y={[s.wallCabinetBottom, wallCarcassBottom(s)]} z={[-d / 2, d / 2]} c={c} />
}

/** Zmywarka w pełnej zabudowie: front w linii szafek dolnych z uchwytem u góry. */
function Dishwasher({ item, c }: { item: Item; c: Ctx }) {
  const { s } = c
  const { w, d } = footprint(item, s)
  const P = s.plinthHeight
  const H = s.baseCarcassHeight
  const zBack = -d / 2
  const zCF = zBack + s.baseCarcassDepth
  const zF = d / 2
  const [bottom, top] = baseFrontRange(s)
  return (
    <group>
      <Panel x={[-w / 2 + 0.5, w / 2 - 0.5]} y={[P, P + H - 1]} z={[zBack + 2, zCF]} material={MAT.steel()} shadow={false} />
      <Plinth x={[-w / 2, w / 2]} zFront={zF} c={c} />
      <Openable id={`${c.id}:door`} kind="flap" pivot={[0, P, zF]}>
        <FrontPanel x={[-w / 2 + s.frontSideGap, w / 2 - s.frontSideGap]} y={[bottom, top]} z={[zCF, zF]} c={c} />
        <Handle cx={0} cy={top - 4} z={zF} material={c.handle} />
      </Openable>
    </group>
  )
}

/** Lodówka wolnostojąca z zamrażarką na dole. */
function Fridge({ item, c }: { item: Item; c: Ctx }) {
  const w = item.width
  const d = FRIDGE.d
  const h = item.height ?? FRIDGE.h
  const split = 70
  const body = MAT.fridge()
  const zF = d / 2
  return (
    <group>
      <Panel x={[-w / 2, w / 2]} y={[1, h]} z={[-d / 2, zF - 5]} material={body} />
      <Panel x={[-w / 2 + 2, w / 2 - 2]} y={[3, h - 2]} z={[zF - 5.2, zF - 5]} material={MAT.hdf()} shadow={false} />
      <Openable id={`${c.id}:freezer`} kind="hingeL" pivot={[-w / 2, 0, zF]}>
        <Panel x={[-w / 2, w / 2]} y={[1, split - 0.3]} z={[zF - 5, zF]} material={body} edges />
        <Panel x={[w / 2 - 5, w / 2 - 3.5]} y={[split - 35, split - 8]} z={[zF, zF + 3]} material={MAT.dark()} />
      </Openable>
      <Openable id={`${c.id}:fridge`} kind="hingeL" pivot={[-w / 2, 0, zF]}>
        <Panel x={[-w / 2, w / 2]} y={[split + 0.3, h]} z={[zF - 5, zF]} material={body} edges />
        <Panel x={[w / 2 - 5, w / 2 - 3.5]} y={[split + 10, split + 50]} z={[zF, zF + 3]} material={MAT.dark()} />
      </Openable>
    </group>
  )
}

/** Szafka ze ślepym narożnikiem: stała blenda po stronie narożnika, obok jedne drzwiczki z uchwytem. */
function BlindCorner({ item, c }: { item: Item; c: Ctx }) {
  const { s } = c
  const { w, d } = footprint(item, s)
  const P = s.plinthHeight
  const H = s.baseCarcassHeight
  const zBack = -d / 2
  const zCF = zBack + s.baseCarcassDepth
  const zF = d / 2
  const bw = item.blindWidth ?? 60
  const right = item.blindSide === 'R'
  const sg = s.frontSideGap
  const blind: R = right ? [w / 2 - bw + sg, w / 2 - sg] : [-w / 2 + sg, -w / 2 + bw - sg]
  const door: R = right ? [-w / 2, w / 2 - bw] : [-w / 2 + bw, w / 2]
  return (
    <group>
      <Carcass x={[-w / 2, w / 2]} y={[P, P + H]} z={[zBack, zCF]} top={false} c={c} />
      <Plinth x={[-w / 2, w / 2]} zFront={zF} c={c} />
      <FrontPanel x={blind} y={baseFrontRange(s)} z={[zCF, zF]} c={c} />
      <Doors name="door" x={door} y={baseFrontRange(s)} z={[zCF, zF]} hinge={item.hinge ?? (right ? 'L' : 'R')} count={1} handle c={c} />
    </group>
  )
}

/** Blenda w linii frontów (wypełnienie przy narożniku) z cokołem. */
function Filler({ item, c }: { item: Item; c: Ctx }) {
  const { s } = c
  const { w, d } = footprint(item, s)
  const zF = d / 2
  return (
    <group>
      <Plinth x={[-w / 2, w / 2]} zFront={zF} c={c} />
      <FrontPanel x={[-w / 2 + s.frontSideGap, w / 2 - s.frontSideGap]} y={baseFrontRange(s)} z={[zF - s.frontThickness, zF]} c={c} />
      <Panel x={[-w / 2, w / 2]} y={[s.plinthHeight, s.plinthHeight + s.baseCarcassHeight]} z={[zF - s.frontThickness - 8, zF - s.frontThickness]} material={c.carcass} />
    </group>
  )
}

/** Blat z otworami pod płytę (wycięcie montażowe) i zlew podwieszany (na wymiar komory). */
function Countertop({ item, items, s }: { item: Item; items: Item[]; s: Settings }) {
  const top = counterTop(s)
  const T = s.counterThickness
  const holeKey = items
    .filter((o) => o.type === 'hob' || o.type === 'sink')
    .map((o) => `${o.type}:${o.x}:${o.y}:${o.rot}`)
    .join('|')
  const geom = useMemo(() => {
    const hw = item.width / 2
    const hd = item.depth / 2
    const shape = new THREE.Shape()
    shape.moveTo(-hw, -hd)
    shape.lineTo(hw, -hd)
    shape.lineTo(hw, hd)
    shape.lineTo(-hw, hd)
    shape.closePath()
    const box = itemBox(item, s)
    for (const o of items) {
      if (o.type !== 'hob' && o.type !== 'sink') continue
      if (o.x < box.minX || o.x > box.maxX || o.y < box.minY || o.y > box.maxY) continue
      const p = toLocal(item, { x: o.x, y: o.y })
      let [cw, cd] = o.type === 'hob' ? [HOB.cutW, HOB.cutD] : [SINK.bowlW, SINK.bowlD]
      if ((o.rot - item.rot) % 2 !== 0) [cw, cd] = [cd, cw]
      if (Math.abs(p.x) + cw / 2 > hw - 1 || Math.abs(p.y) + cd / 2 > hd - 1) continue
      const hole = new THREE.Path()
      hole.moveTo(p.x - cw / 2, p.y - cd / 2)
      hole.lineTo(p.x - cw / 2, p.y + cd / 2)
      hole.lineTo(p.x + cw / 2, p.y + cd / 2)
      hole.lineTo(p.x + cw / 2, p.y - cd / 2)
      hole.closePath()
      shape.holes.push(hole)
    }
    const g = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false })
    g.rotateX(Math.PI / 2)
    g.translate(0, top, 0)
    return g
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.width, item.depth, item.x, item.y, item.rot, holeKey, top, T])
  useEffect(() => () => geom.dispose(), [geom])
  return <mesh geometry={geom} material={stoneMaterial(s.stoneColor)} castShadow receiveShadow />
}

function Hob({ s }: { s: Settings }) {
  const top = counterTop(s)
  const rings: [number, number, number][] = [
    [-24, 12, 9],
    [-24, -12, 7.5],
    [0, 0, 11],
    [24, 12, 7.5],
    [24, -12, 9],
  ]
  return (
    <group>
      <Panel x={[-HOB.w / 2, HOB.w / 2]} y={[top, top + 0.5]} z={[-HOB.d / 2, HOB.d / 2]} material={MAT.glass()} />
      <Panel x={[-HOB.cutW / 2 + 1, HOB.cutW / 2 - 1]} y={[top - (HOB.h - 0.5), top]} z={[-HOB.cutD / 2 + 1, HOB.cutD / 2 - 1]} material={MAT.dark()} shadow={false} />
      {rings.map(([x, z, r], i) => (
        <mesh key={i} position={[x, top + 0.52, z]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.ring()}>
          <ringGeometry args={[r - 0.35, r, 48]} />
        </mesh>
      ))}
      <Panel x={[-12, 12]} y={[top + 0.5, top + 0.52]} z={[21, 24]} material={MAT.ring()} shadow={false} />
    </group>
  )
}

function Sink({ s }: { s: Settings }) {
  const top = counterTop(s)
  const under = top - s.counterThickness
  const bottom = under - SINK.bowlH
  const hw = SINK.bowlW / 2
  const hd = SINK.bowlD / 2
  const k = 0.1
  const steel = MAT.steel()
  const fz = -SINK.d / 2 - 4
  return (
    <group>
      <Panel x={[-hw, hw]} y={[bottom, bottom + k]} z={[-hd, hd]} material={steel} />
      <Panel x={[-hw, -hw + k]} y={[bottom, under]} z={[-hd, hd]} material={steel} />
      <Panel x={[hw - k, hw]} y={[bottom, under]} z={[-hd, hd]} material={steel} />
      <Panel x={[-hw, hw]} y={[bottom, under]} z={[-hd, -hd + k]} material={steel} />
      <Panel x={[-hw, hw]} y={[bottom, under]} z={[hd - k, hd]} material={steel} />
      <mesh position={[hw - 12, bottom + k + 0.02, -hd + 12]} rotation={[-Math.PI / 2, 0, 0]} material={MAT.dark()}>
        <circleGeometry args={[4.5, 32]} />
      </mesh>
      {/* bateria */}
      <mesh position={[0, top + 15, fz]} material={steel} castShadow>
        <cylinderGeometry args={[2.2, 2.6, 30, 24]} />
      </mesh>
      <mesh position={[0, top + 29, fz + 10]} rotation={[Math.PI / 2, 0, 0]} material={steel} castShadow>
        <cylinderGeometry args={[1.3, 1.3, 22, 16]} />
      </mesh>
      <mesh position={[0, top + 26.5, fz + 20]} material={steel}>
        <cylinderGeometry args={[1.4, 1.4, 5, 16]} />
      </mesh>
    </group>
  )
}

export function Furniture({ item, items, s }: { item: Item; items: Item[]; s: Settings }) {
  const c = useCtx(itemSettings(item, s), item)
  switch (item.type) {
    case 'base_drawers':
    case 'base_door':
      return <BaseCabinet item={item} c={c} />
    case 'base_corner':
      return <CornerCabinet item={item} c={c} />
    case 'oven_column':
      return <OvenColumn item={item} c={c} />
    case 'shallow_column':
      return <ShallowColumn item={item} c={c} />
    case 'countertop':
      return <Countertop item={item} items={items} s={s} />
    case 'hob':
      return <Hob s={s} />
    case 'sink':
      return <Sink s={s} />
    case 'wall_cabinet':
      return <WallCabinet item={item} c={c} />
    case 'wall_panel':
      return <WallPanel item={item} c={c} />
    case 'side_panel':
      return <SidePanelItem item={item} c={c} />
    case 'column_upper':
      return <ColumnUpper item={item} c={c} />
    case 'vanity':
      return <Vanity item={item} c={c} />
    case 'dishwasher':
      return <Dishwasher item={item} c={c} />
    case 'fridge':
      return <Fridge item={item} c={c} />
    case 'base_blind_corner':
      return <BlindCorner item={item} c={c} />
    case 'filler':
      return <Filler item={item} c={c} />
  }
}
