import { baseDepth, footprint, isBaseCabinet, isOnCounter, wallOffset } from './catalog'
import type { Item, Rot, Settings, Wall } from './types'

export interface Pt {
  x: number
  y: number
}
export interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const COS = [1, 0, -1, 0]
const SIN = [0, 1, 0, -1]

/** Punkt z układu mebla (lx wzdłuż frontu, lz w głąb, front przy +lz) na rzut. */
export function toWorld(item: Item, lx: number, lz: number): Pt {
  const c = COS[item.rot]
  const s = SIN[item.rot]
  return { x: item.x + lx * c - lz * s, y: item.y + lx * s + lz * c }
}

export function toLocal(item: Item, p: Pt): Pt {
  const c = COS[item.rot]
  const s = SIN[item.rot]
  const dx = p.x - item.x
  const dy = p.y - item.y
  return { x: dx * c + dy * s, y: -dx * s + dy * c }
}

export function halfSize(item: Item, s: Settings) {
  const { w, d } = footprint(item, s)
  return item.rot % 2 === 0 ? { hx: w / 2, hy: d / 2 } : { hx: d / 2, hy: w / 2 }
}

export function itemBox(item: Item, s: Settings): Box {
  const { hx, hy } = halfSize(item, s)
  return { minX: item.x - hx, minY: item.y - hy, maxX: item.x + hx, maxY: item.y + hy }
}

/** Obrys na rzucie (narożnik ma kształt L). */
export function itemOutline(item: Item, s: Settings): Pt[] {
  const { w, d } = footprint(item, s)
  const hw = w / 2
  const hd = d / 2
  let local: [number, number][]
  if (item.type === 'base_corner') {
    const a = baseDepth(s)
    local = [
      [-hw, -hd],
      [hw, -hd],
      [hw, -hd + a],
      [-hw + a, -hd + a],
      [-hw + a, hd],
      [-hw, hd],
    ]
  } else
    local = [
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [-hw, hd],
    ]
  return local.map(([x, z]) => toWorld(item, x, z))
}

/** Kierunek, w który patrzą plecy mebla (na rzucie). */
export function backDir(rot: Rot): Pt {
  return { x: SIN[rot], y: -COS[rot] }
}

/** Wszystkie strony pleców – narożnik L stoi plecami do dwóch ścian. */
export function backDirs(item: Item): Pt[] {
  const dirs = [backDir(item.rot)]
  if (item.type === 'base_corner') dirs.push({ x: -COS[item.rot], y: -SIN[item.rot] })
  return dirs
}

export const boxContains = (b: Box, p: Pt) => p.x >= b.minX - 0.01 && p.x <= b.maxX + 0.01 && p.y >= b.minY - 0.01 && p.y <= b.maxY + 0.01
export const boxInside = (inner: Box, outer: Box) =>
  inner.minX >= outer.minX - 0.01 && inner.maxX <= outer.maxX + 0.01 && inner.minY >= outer.minY - 0.01 && inner.maxY <= outer.maxY + 0.01
export const boxesOverlap = (a: Box, b: Box) => a.minX < b.maxX - 0.01 && a.maxX > b.minX + 0.01 && a.minY < b.maxY - 0.01 && a.maxY > b.minY + 0.01

// ───────────── ściany ─────────────

export const wallLength = (w: Wall) => Math.hypot(w.x2 - w.x1, w.y2 - w.y1)

/** Normalna w stronę grubości ściany (na zewnątrz pokoju). */
export function wallOutward(w: Wall): Pt {
  const len = wallLength(w) || 1
  const dx = (w.x2 - w.x1) / len
  const dy = (w.y2 - w.y1) / len
  return { x: dy * w.side, y: -dx * w.side }
}

const same = (a: Pt, b: Pt) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5

/** Prostokąt ściany, przedłużony na narożnikach wypukłych, żeby nie było dziury w rogu. */
export function wallPolygon(w: Wall, walls: Wall[]): Pt[] {
  const len = wallLength(w) || 1
  const d = { x: (w.x2 - w.x1) / len, y: (w.y2 - w.y1) / len }
  const n = wallOutward(w)
  const t = w.thickness
  const cross = (a: Pt, b: Pt) => a.x * b.y - a.y * b.x
  let extStart = 0
  let extEnd = 0
  for (const o of walls) {
    if (o.id === w.id) continue
    const ol = wallLength(o) || 1
    const od = { x: (o.x2 - o.x1) / ol, y: (o.y2 - o.y1) / ol }
    if (same({ x: o.x1, y: o.y1 }, { x: w.x2, y: w.y2 }) && cross(d, od) * w.side > 0.01) extEnd = t
    if (same({ x: o.x2, y: o.y2 }, { x: w.x1, y: w.y1 }) && cross(od, d) * w.side > 0.01) extStart = t
  }
  const a = { x: w.x1 - d.x * extStart, y: w.y1 - d.y * extStart }
  const b = { x: w.x2 + d.x * extEnd, y: w.y2 + d.y * extEnd }
  return [a, b, { x: b.x + n.x * t, y: b.y + n.y * t }, { x: a.x + n.x * t, y: a.y + n.y * t }]
}

/** Wycinek wielokąta między dwiema płaszczyznami prostopadłymi do ściany: s = (p − początek)·kierunek ∈ [a, b]. */
function clipAlong(poly: Pt[], o: Pt, d: Pt, a: number, b: number): Pt[] {
  const clip = (pts: Pt[], keep: (s: number) => number) => {
    const out: Pt[] = []
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]
      const q = pts[(i + 1) % pts.length]
      const fp = keep((p.x - o.x) * d.x + (p.y - o.y) * d.y)
      const fq = keep((q.x - o.x) * d.x + (q.y - o.y) * d.y)
      if (fp >= 0) out.push(p)
      if ((fp >= 0) !== (fq >= 0)) {
        const t = fp / (fp - fq)
        out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t })
      }
    }
    return out
  }
  return clip(clip(poly, (s) => s - a), (s) => b - s)
}

/** Okna ściany przycięte do jej długości, posortowane wzdłuż ściany. */
export function wallWindows(w: Wall) {
  const len = wallLength(w)
  return (w.windows ?? [])
    .map((win) => ({ ...win, from: Math.max(0, win.offset), to: Math.min(len, win.offset + win.width) }))
    .filter((win) => win.to > win.from)
    .sort((a, b) => a.from - b.from)
}

/** Kawałki ściany do wyciągnięcia w górę: pełna wysokość poza oknami, pod parapetem i nad nadprożem w oknach. */
export function wallPieces(w: Wall, walls: Wall[], height: number): { poly: Pt[]; y0: number; y1: number }[] {
  const poly = wallPolygon(w, walls)
  const wins = wallWindows(w)
  if (!wins.length) return [{ poly, y0: 0, y1: height }]
  const len = wallLength(w) || 1
  const o = { x: w.x1, y: w.y1 }
  const d = { x: (w.x2 - w.x1) / len, y: (w.y2 - w.y1) / len }
  const pieces: { poly: Pt[]; y0: number; y1: number }[] = []
  let s = -1e6
  for (const win of wins) {
    if (win.from > s) pieces.push({ poly: clipAlong(poly, o, d, s, win.from), y0: 0, y1: height })
    const part = clipAlong(poly, o, d, win.from, win.to)
    if (win.sill > 0) pieces.push({ poly: part, y0: 0, y1: Math.min(win.sill, height) })
    if (win.sill + win.height < height) pieces.push({ poly: part, y0: win.sill + win.height, y1: height })
    s = Math.max(s, win.to)
  }
  pieces.push({ poly: clipAlong(poly, o, d, s, 1e6), y0: 0, y1: height })
  return pieces.filter((p) => p.poly.length >= 3 && p.y1 > p.y0)
}

/** Otwór okna na rzucie: od lica ściany przez całą grubość. */
export function windowOutline(w: Wall, from: number, to: number): Pt[] {
  const len = wallLength(w) || 1
  const d = { x: (w.x2 - w.x1) / len, y: (w.y2 - w.y1) / len }
  const n = wallOutward(w)
  const a = { x: w.x1 + d.x * from, y: w.y1 + d.y * from }
  const b = { x: w.x1 + d.x * to, y: w.y1 + d.y * to }
  const t = w.thickness
  return [a, b, { x: b.x + n.x * t, y: b.y + n.y * t }, { x: a.x + n.x * t, y: a.y + n.y * t }]
}

/** Strona grubości dla łańcucha ścian: na zewnątrz wielokąta. */
export function chainSide(points: Pt[]): 1 | -1 {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    area += a.x * b.y - b.x * a.y
  }
  return area >= 0 ? 1 : -1
}

interface Face {
  axis: 'x' | 'y'
  /** Współrzędna lica (x dla pionowej, y dla poziomej). */
  at: number
  from: number
  to: number
  /** Strona pokoju: +1 = pokój po stronie większych współrzędnych. */
  room: 1 | -1
}

export function wallFaces(walls: Wall[]): Face[] {
  const faces: Face[] = []
  for (const w of walls) {
    const n = wallOutward(w)
    if (Math.abs(w.x1 - w.x2) < 0.01)
      faces.push({ axis: 'x', at: w.x1, from: Math.min(w.y1, w.y2), to: Math.max(w.y1, w.y2), room: n.x > 0 ? -1 : 1 })
    else if (Math.abs(w.y1 - w.y2) < 0.01)
      faces.push({ axis: 'y', at: w.y1, from: Math.min(w.x1, w.x2), to: Math.max(w.x1, w.x2), room: n.y > 0 ? -1 : 1 })
  }
  return faces
}

// ───────────── przyciąganie ─────────────

interface Candidate {
  delta: number
}

/**
 * Przyciąga mebel do lic ścian (z luzem za plecami szafek dolnych) i krawędzi innych mebli.
 * Płyta i zlew przyciągają środek do środka szafki lub blatu pod spodem.
 */
export function snapPosition(item: Item, p: Pt, items: Item[], walls: Wall[], s: Settings, threshold: number): Pt {
  const { hx, hy } = halfSize(item, s)
  const others = items.filter((o) => o.id !== item.id)
  const backs = backDirs(item)
  const offset = wallOffset(item, s)
  const faces = wallFaces(walls)

  const snapAxis = (axis: 'x' | 'y', value: number, half: number, cross: number, crossHalf: number) => {
    let best: Candidate | null = null
    const consider = (delta: number) => {
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) best = { delta }
    }
    const min = value - half
    const max = value + half
    if (isOnCounter(item.type)) {
      for (const o of others) {
        if (!isBaseCabinet(o.type) && o.type !== 'countertop') continue
        consider((axis === 'x' ? o.x : o.y) - value)
      }
    } else {
      for (const f of faces) {
        if (f.axis !== axis) continue
        if (cross + crossHalf < f.from - 1 || cross - crossHalf > f.to + 1) continue
        const backHere = backs.some((b) => (axis === 'x' ? b.x === -f.room : b.y === -f.room))
        const gap = backHere ? offset : 0
        if (f.room === 1) consider(f.at + gap - min)
        else consider(f.at - gap - max)
      }
      for (const o of others) {
        if (isOnCounter(o.type)) continue
        const b = itemBox(o, s)
        const [oMin, oMax] = axis === 'x' ? [b.minX, b.maxX] : [b.minY, b.maxY]
        consider(oMin - max)
        consider(oMax - min)
        consider(oMin - min)
        consider(oMax - max)
      }
    }
    const b = best as Candidate | null
    if (b) return value + b.delta
    // bez przyciągania: krawędź na pełnym centymetrze
    return Math.round(min) + half
  }

  return {
    x: snapAxis('x', p.x, hx, p.y, hy),
    y: snapAxis('y', p.y, hy, p.x, hx),
  }
}

/** Odległości od krawędzi mebla do najbliższych lic ścian w czterech kierunkach. */
export function wallDistances(box: Box, walls: Wall[]) {
  const faces = wallFaces(walls)
  const cx = (box.minX + box.maxX) / 2
  const cy = (box.minY + box.maxY) / 2
  const result: { from: Pt; to: Pt; dist: number }[] = []
  const pick = (cands: { to: Pt; dist: number }[], from: Pt) => {
    const best = cands.filter((c) => c.dist > 0.05).sort((a, b) => a.dist - b.dist)[0]
    if (best) result.push({ from, ...best })
  }
  const along = (axis: 'x' | 'y', coord: number) => faces.filter((f) => f.axis === axis && coord >= f.from - 0.01 && coord <= f.to + 0.01)
  pick(along('x', cy).filter((f) => f.at <= box.minX).map((f) => ({ to: { x: f.at, y: cy }, dist: box.minX - f.at })), { x: box.minX, y: cy })
  pick(along('x', cy).filter((f) => f.at >= box.maxX).map((f) => ({ to: { x: f.at, y: cy }, dist: f.at - box.maxX })), { x: box.maxX, y: cy })
  pick(along('y', cx).filter((f) => f.at <= box.minY).map((f) => ({ to: { x: cx, y: f.at }, dist: box.minY - f.at })), { x: cx, y: box.minY })
  pick(along('y', cx).filter((f) => f.at >= box.maxY).map((f) => ({ to: { x: cx, y: f.at }, dist: f.at - box.maxY })), { x: cx, y: box.maxY })
  return result
}

export function distToSegment(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

export function pointInPolygon(p: Pt, poly: Pt[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}
