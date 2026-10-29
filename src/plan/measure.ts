import { itemOutline, toWorld, wallPolygon, type Pt } from '../geometry'
import type { Item, Settings, Wall } from '../types'
import { itemBoards } from './boards'

export interface MeasureSnap {
  p: Pt
  /** point – narożnik / koniec, edge – punkt na krawędzi, free – bez przyciągania. */
  kind: 'point' | 'edge' | 'free'
}

type Seg = [Pt, Pt]

/** Narożniki i krawędzie, do których przyciąga miarka: obrys mebli, płyty korpusów i fronty, ściany. */
function snapGeometry(items: Item[], walls: Wall[], s: Settings) {
  const points: Pt[] = []
  const segs: Seg[] = []
  const polygon = (poly: Pt[]) => {
    points.push(...poly)
    poly.forEach((a, i) => segs.push([a, poly[(i + 1) % poly.length]]))
  }
  for (const item of items) {
    polygon(itemOutline(item, s))
    for (const b of itemBoards(item, s))
      polygon([toWorld(item, b.x0, b.z0), toWorld(item, b.x1, b.z0), toWorld(item, b.x1, b.z1), toWorld(item, b.x0, b.z1)])
  }
  for (const w of walls) {
    polygon(wallPolygon(w, walls))
    const a = { x: w.x1, y: w.y1 }
    const b = { x: w.x2, y: w.y2 }
    points.push(a, b)
    segs.push([a, b])
  }
  return { points, segs }
}

function nearestOnSegment(p: Pt, [a, b]: Seg): Pt {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  return { x: a.x + t * dx, y: a.y + t * dy }
}

/**
 * Punkt miarki: najpierw narożnik w promieniu `threshold`, potem najbliższy punkt na krawędzi,
 * a bez trafienia – kursor zaokrąglony do 1 mm. Z `orthoFrom` pomiar wymuszony w poziomie lub pionie.
 */
export function measureSnap(p: Pt, items: Item[], walls: Wall[], s: Settings, threshold: number, orthoFrom?: Pt | null): MeasureSnap {
  const { points, segs } = snapGeometry(items, walls, s)
  let best: MeasureSnap = { p: { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }, kind: 'free' }
  let bestD = threshold
  for (const q of points) {
    const d = Math.hypot(q.x - p.x, q.y - p.y)
    if (d < bestD) {
      bestD = d
      best = { p: q, kind: 'point' }
    }
  }
  if (best.kind === 'free') {
    bestD = threshold * 0.7
    for (const seg of segs) {
      const q = nearestOnSegment(p, seg)
      const d = Math.hypot(q.x - p.x, q.y - p.y)
      if (d < bestD) {
        bestD = d
        best = { p: q, kind: 'edge' }
      }
    }
  }
  if (orthoFrom) {
    const horizontal = Math.abs(best.p.x - orthoFrom.x) >= Math.abs(best.p.y - orthoFrom.y)
    best = { ...best, p: horizontal ? { x: best.p.x, y: orthoFrom.y } : { x: orthoFrom.x, y: best.p.y } }
  }
  return best
}
