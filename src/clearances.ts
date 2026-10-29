import { HOB, SINK, isBaseCabinet } from './catalog'
import { boxContains, itemBox, toLocal, toWorld, type Box, type Pt } from './geometry'
import type { Item, Settings } from './types'

export interface Clearance {
  kind: 'cabinet' | 'counter'
  label: string
  from: Pt
  to: Pt
  dist: number
}

export interface ClearanceInfo {
  /** Obrys części pod blatem (rant zlewu / korpus płyty). */
  under: Box
  /** Otwór w blacie. */
  cutout: Box
  /** Wnętrze korpusu szafki pod spodem (między bokami, od pleców do czoła korpusu). */
  cabinetInner: Box | null
  counter: Box | null
  items: Clearance[]
}

/** Prostokąt o wymiarach w×d w układzie mebla, przeliczony na rzut. */
function localBox(item: Item, x0: number, x1: number, z0: number, z1: number): Box {
  const a = toWorld(item, x0, z0)
  const b = toWorld(item, x1, z1)
  return { minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minY: Math.min(a.y, b.y), maxY: Math.max(a.y, b.y) }
}

const DIRS: Pt[] = [
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: 0, y: 1 },
]

/** Kierunek z rzutu w układzie mebla: -x lewo, +x prawo, -z tył, +z przód (patrząc na front). */
function localSide(ref: Item, dir: Pt): 'left' | 'right' | 'back' | 'front' {
  const o = toLocal(ref, { x: ref.x, y: ref.y })
  const p = toLocal(ref, { x: ref.x + dir.x, y: ref.y + dir.y })
  const dx = p.x - o.x
  const dz = p.y - o.y
  if (Math.abs(dx) > Math.abs(dz)) return dx < 0 ? 'left' : 'right'
  return dz < 0 ? 'back' : 'front'
}

const CABINET_LABEL = { left: 'lewy bok korpusu', right: 'prawy bok korpusu', back: 'plecy korpusu', front: 'czoło korpusu (za frontem)' }
const COUNTER_LABEL = { left: 'lewy koniec blatu', right: 'prawy koniec blatu', back: 'tylna krawędź blatu', front: 'przednia krawędź blatu' }

/** Odległości zlewu / płyty od boków korpusu szafki pod spodem i od krawędzi blatu. */
export function counterItemClearances(item: Item, items: Item[], s: Settings): ClearanceInfo | null {
  if (item.type !== 'sink' && item.type !== 'hob') return null
  const center = { x: item.x, y: item.y }
  const [uw, ud] = item.type === 'sink' ? [SINK.w, SINK.d] : [HOB.cutW, HOB.cutD]
  const [cw, cd] = item.type === 'sink' ? [SINK.bowlW, SINK.bowlD] : [HOB.cutW, HOB.cutD]
  const under = localBox(item, -uw / 2, uw / 2, -ud / 2, ud / 2)
  const cutout = localBox(item, -cw / 2, cw / 2, -cd / 2, cd / 2)

  const cab = items.find((o) => isBaseCabinet(o.type) && o.type !== 'base_corner' && boxContains(itemBox(o, s), center))
  let cabinetInner: Box | null = null
  if (cab) {
    const hw = cab.width / 2
    const hd = (s.baseCarcassDepth + s.frontThickness) / 2
    const t = s.boardThickness
    cabinetInner = localBox(cab, -hw + t, hw - t, -hd + 0.3, -hd + s.baseCarcassDepth)
  }
  const counterItem = items.find((o) => o.type === 'countertop' && boxContains(itemBox(o, s), center))
  const counter = counterItem ? itemBox(counterItem, s) : null

  const result: Clearance[] = []
  const measure = (kind: Clearance['kind'], inner: Box, outer: Box, ref: Item, labels: Record<string, string>, offset: number) => {
    for (const dir of DIRS) {
      const horizontal = dir.x !== 0
      // linie wymiarowe przesunięte w bok od osi, żeby korpus i blat się nie nakładały
      const line = horizontal ? center.y + offset : center.x + offset
      let a: number, b: number
      if (horizontal) {
        a = dir.x < 0 ? inner.minX : inner.maxX
        b = dir.x < 0 ? outer.minX : outer.maxX
      } else {
        a = dir.y < 0 ? inner.minY : inner.maxY
        b = dir.y < 0 ? outer.minY : outer.maxY
      }
      const dist = (b - a) * (horizontal ? dir.x : dir.y)
      result.push({
        kind,
        label: labels[localSide(ref, dir)],
        from: horizontal ? { x: a, y: line } : { x: line, y: a },
        to: horizontal ? { x: b, y: line } : { x: line, y: b },
        dist,
      })
    }
  }
  if (cab && cabinetInner) measure('cabinet', under, cabinetInner, cab, CABINET_LABEL, -Math.min(ud, uw) * 0.22)
  if (counterItem && counter) measure('counter', cutout, counter, counterItem, COUNTER_LABEL, Math.min(ud, uw) * 0.22)
  return { under, cutout, cabinetInner, counter, items: result }
}
