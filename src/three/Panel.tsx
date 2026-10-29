import { Edges } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

/** Tworzy prostopadłościan, którego UV są w centymetrach (/100) w układzie mebla – słoje ciągną się przez sąsiednie fronty. */
function boardGeometry(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
  const w = x1 - x0
  const h = y1 - y0
  const d = z1 - z0
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const cz = (z0 + z1) / 2
  const g = new THREE.BoxGeometry(w, h, d)
  const pos = g.attributes.position
  const nor = g.attributes.normal
  const uv = g.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx
    const y = pos.getY(i) + cy
    const z = pos.getZ(i) + cz
    const nx = Math.abs(nor.getX(i))
    const ny = Math.abs(nor.getY(i))
    if (nx > 0.5) uv.setXY(i, z / 100, y / 100)
    else if (ny > 0.5) uv.setXY(i, x / 100, z / 100)
    else uv.setXY(i, x / 100, y / 100)
  }
  g.translate(cx, cy, cz)
  return g
}

interface Props {
  x: [number, number]
  y: [number, number]
  z: [number, number]
  material: THREE.Material
  shadow?: boolean
  /** Rysuje obrys – fronty w jednym kolorze inaczej zlewają się w jedną płaszczyznę. */
  edges?: boolean
  /** Niebieski, grubszy obrys – zaznaczony front. */
  highlight?: boolean
}

/** Płyta / bryła podana przez zakresy min–max w układzie mebla. */
export function Panel({ x, y, z, material, shadow = true, edges = false, highlight = false }: Props) {
  const geom = useMemo(() => boardGeometry(x[0], x[1], y[0], y[1], z[0], z[1]), [x[0], x[1], y[0], y[1], z[0], z[1]])
  useEffect(() => () => geom.dispose(), [geom])
  if (x[1] - x[0] <= 0 || y[1] - y[0] <= 0 || z[1] - z[0] <= 0) return null
  return (
    <mesh geometry={geom} material={material} castShadow={shadow} receiveShadow>
      {highlight ? <Edges color="#1f6fff" lineWidth={2.5} /> : edges && <Edges color="#141820" lineWidth={1} transparent opacity={0.45} />}
    </mesh>
  )
}
