import { OVEN_COLUMN_WIDTH, doorCount, footprint, itemSettings } from '../catalog'
import type { Item, Settings } from '../types'

/** Płyta widziana z góry, w układzie mebla: x wzdłuż frontu, z w głąb (front przy +z). */
export interface Board {
  x0: number
  x1: number
  z0: number
  z1: number
  kind: 'carcass' | 'front'
}

const b = (x0: number, x1: number, z0: number, z1: number, kind: Board['kind']): Board => ({ x0, x1, z0, z1, kind })

/** Boki korpusu i plecy HDF między `x0`–`x1`, od pleców `zBack` do czoła korpusu `zCF`. */
function carcass(x0: number, x1: number, zBack: number, zCF: number, t: number): Board[] {
  return [b(x0, x0 + t, zBack, zCF, 'carcass'), b(x1 - t, x1, zBack, zCF, 'carcass'), b(x0 + t, x1 - t, zBack, zBack + 0.3, 'carcass')]
}

/** Fronty w linii z0–z1: każda część o szerokości z `cuts` zwężona o szczelinę boczną. */
function fronts(cuts: number[], z0: number, z1: number, sg: number): Board[] {
  const out: Board[] = []
  for (let i = 0; i < cuts.length - 1; i++) out.push(b(cuts[i] + sg, cuts[i + 1] - sg, z0, z1, 'front'))
  return out
}

const split = (x0: number, x1: number, count: 1 | 2) => (count === 1 ? [x0, x1] : [x0, (x0 + x1) / 2, x1])

/** Płyty korpusu i fronty do rysowania na rzucie (bez szafek górnych, AGD na blacie i lodówki). */
export function itemBoards(item: Item, settings: Settings): Board[] {
  const s = itemSettings(item, settings)
  const { w, d } = footprint(item, s)
  const t = s.boardThickness
  const ft = s.frontThickness
  const sg = s.frontSideGap
  const hw = w / 2
  const hd = d / 2
  switch (item.type) {
    case 'base_drawers':
    case 'base_door': {
      const zCF = -hd + s.baseCarcassDepth
      const count = item.type === 'base_door' ? doorCount(item) : 1
      return [...carcass(-hw, hw, -hd, zCF, t), ...fronts(split(-hw, hw, count), zCF, hd, sg)]
    }
    case 'base_blind_corner': {
      const zCF = -hd + s.baseCarcassDepth
      const bw = item.blindWidth ?? 60
      const cut = item.blindSide === 'R' ? hw - bw : -hw + bw
      return [...carcass(-hw, hw, -hd, zCF, t), ...fronts([-hw, cut, hw], zCF, hd, sg)]
    }
    case 'dishwasher':
    case 'filler':
      return fronts([-hw, hw], hd - ft, hd, sg)
    case 'base_corner': {
      const inner = -hw + s.baseCarcassDepth
      return [
        b(hw - t, hw, -hd, inner, 'carcass'),
        b(-hw, inner, hd - t, hd, 'carcass'),
        b(-hw, hw, -hd, -hd + 0.3, 'carcass'),
        b(-hw, -hw + 0.3, -hd, hd, 'carcass'),
        b(inner + ft, hw - sg, inner, inner + ft, 'front'),
        b(inner, inner + ft, inner, hd - sg, 'front'),
      ]
    }
    case 'oven_column': {
      const zFB = hd - ft
      const xL = -hw + (item.panelLeft ? t : 0)
      const xR = xL + OVEN_COLUMN_WIDTH
      const out = [...carcass(xL, xR, -hd, zFB - s.tipOnGap, t), ...fronts([xL, xR], zFB, hd, sg)]
      if (item.panelLeft) out.push(b(-hw, -hw + t, -hd, hd, 'front'))
      if (item.panelRight) out.push(b(hw - t, hw, -hd, hd, 'front'))
      return out
    }
    case 'shallow_column': {
      const zFB = hd - ft
      const xL = -hw + (item.panelLeft ? t : 0)
      const xR = hw - (item.panelRight ? t : 0)
      const out = [...carcass(xL, xR, -hd, zFB - s.tipOnGap, t), ...fronts(split(xL, xR, doorCount(item)), zFB, hd, sg)]
      if (item.panelLeft) out.push(b(-hw, -hw + t, -hd, hd, 'front'))
      if (item.panelRight) out.push(b(hw - t, hw, -hd, hd, 'front'))
      return out
    }
    case 'side_panel':
      return [b(-hw, hw, -hd, hd, 'front')]
    case 'vanity':
      return [...carcass(-hw, hw, -hd, hd - ft, t), ...fronts([-hw, hw], hd - ft, hd, sg)]
    default:
      return []
  }
}
