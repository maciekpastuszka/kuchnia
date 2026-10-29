import {
  OVEN,
  OVEN_COLUMN_WIDTH,
  baseTop,
  columnUpperSpec,
  doorCount,
  drawerFronts,
  footprint,
  shallowSplit,
  sidePanelPieces,
  vanityRange,
  wallCarcassBottom,
} from './catalog'
import { toWorld } from './geometry'
import type { Item, Settings } from './types'

/** Front (lub element w linii frontów) w układzie mebla: x wzdłuż frontu, y od podłogi. */
interface Part {
  name: string
  x: [number, number]
  y: [number, number]
}

/**
 * Kontrola wymiarów: fronty każdego mebla liczone tymi samymi wzorami co modele 3D (three/Furniture.tsx).
 * Przy zmianie geometrii mebla trzeba zmienić oba miejsca.
 */
export function itemFrontParts(item: Item, s: Settings): Part[] {
  const { w } = footprint(item, s)
  const t = s.boardThickness
  const g = s.frontGap
  const sg = s.frontSideGap
  const P = s.plinthHeight
  const H = s.baseCarcassHeight
  const C = s.ceilingHeight
  const hw = w / 2
  const leaves = (x0: number, x1: number, count: 1 | 2): [number, number][] =>
    count === 1
      ? [[x0 + sg, x1 - sg]]
      : [
          [x0 + sg, (x0 + x1) / 2 - sg],
          [(x0 + x1) / 2 + sg, x1 - sg],
        ]
  switch (item.type) {
    case 'base_drawers':
      return drawerFronts(item.drawers ?? 3, P, H, s).map((f, i) => ({ name: `szuflada ${i + 1}`, x: [-hw + sg, hw - sg], y: [f.y, f.y + f.h] }))
    case 'base_door':
      return leaves(-hw, hw, doorCount(item)).map((x, i) => ({ name: `drzwi ${i + 1}`, x, y: [P, P + H - g] }))
    case 'base_blind_corner': {
      const bw = item.blindWidth ?? 60
      const cut = item.blindSide === 'R' ? hw - bw : -hw + bw
      const [blind, door]: [number, number][] =
        item.blindSide === 'R'
          ? [
              [cut + sg, hw - sg],
              [-hw + sg, cut - sg],
            ]
          : [
              [-hw + sg, cut - sg],
              [cut + sg, hw - sg],
            ]
      return [
        { name: 'blenda', x: blind, y: [P, P + H - g] },
        { name: 'drzwi', x: door, y: [P, P + H - g] },
      ]
    }
    case 'dishwasher':
    case 'filler':
      return [{ name: item.type === 'filler' ? 'blenda' : 'front', x: [-hw + sg, hw - sg], y: [P, P + H - g] }]
    case 'oven_column': {
      const xL = -hw + (item.panelLeft ? t : 0)
      const xR = xL + OVEN_COLUMN_WIDTH
      const bTop = baseTop(s)
      const fx: [number, number] = [xL + sg, xR - sg]
      const under: Part[] = item.underOvenDoor
        ? [{ name: 'drzwi pod piekarnikiem', x: fx, y: [P, bTop - g] }]
        : drawerFronts(item.drawers ?? 3, P, H, s).map((f, i) => ({ name: `szuflada ${i + 1}`, x: fx, y: [f.y, f.y + f.h] }))
      return [...under, { name: 'piekarnik', x: [-OVEN.w / 2 + (xL + xR) / 2, OVEN.w / 2 + (xL + xR) / 2], y: [bTop, bTop + OVEN.h] }]
    }
    case 'shallow_column': {
      const xL = -hw + (item.panelLeft ? t : 0)
      const xR = hw - (item.panelRight ? t : 0)
      const split = shallowSplit(s)
      return leaves(xL, xR, doorCount(item)).map((x, i) => ({ name: `front ${i + 1}`, x, y: [s.shallowFloorGap, split - g / 2] as [number, number] }))
    }
    case 'vanity': {
      const [bottom, top] = vanityRange(item, s)
      return drawerFronts(item.drawers === 2 ? 2 : 1, bottom, top - bottom, s).map((f, i) => ({ name: `szuflada ${i + 1}`, x: [-hw + sg, hw - sg] as [number, number], y: [f.y, f.y + f.h] as [number, number] }))
    }
    case 'column_upper': {
      const u = columnUpperSpec(item, s)
      return [
        ...leaves(-hw, hw, doorCount(item)).map((x, i) => ({ name: `drzwi ${i + 1}`, x, y: u.front })),
        ...(u.mask ? [{ name: u.maskSideGap ? 'maskownica' : 'blenda', x: (u.maskSideGap ? [-hw + sg, hw - sg] : [-hw, hw]) as [number, number], y: u.mask }] : []),
      ]
    }
    case 'wall_cabinet': {
      const top = C - s.ceilingGap
      return [
        ...leaves(-hw, hw, doorCount(item)).map((x, i) => ({ name: `drzwi ${i + 1}`, x, y: [s.wallCabinetBottom, top - g] as [number, number] })),
        { name: 'maskownica', x: [-hw + sg, hw - sg], y: [top, C] },
      ]
    }
    case 'wall_panel':
      return [{ name: 'płyta pod szafkami', x: [-hw, hw], y: [s.wallCabinetBottom, wallCarcassBottom(s)] }]
    case 'side_panel':
      return sidePanelPieces(item, s).map(([a, b], i, all) => ({ name: item.topBlend && i === all.length - 1 ? 'blenda' : `płyta ${i + 1}`, x: [-hw, hw], y: [a, b] }))
    default:
      return []
  }
}

const r = (v: number) => Math.round(v * 100) / 100

/** Raport: fronty od dołu ze szczelinami, marginesy do blatu/sufitu, szczeliny poziome między sąsiadami w rzędzie. */
export function auditReport(items: Item[], s: Settings) {
  const perItem = items
    .map((item) => {
      const parts = itemFrontParts(item, s)
      if (!parts.length) return null
      // pion: części ułożone od dołu w kolumnach (te same x), szczeliny między kolejnymi
      const stack = [...parts].sort((a, b) => a.y[0] - b.y[0] || a.x[0] - b.x[0])
      const gapsV: string[] = []
      for (let i = 1; i < stack.length; i++) {
        const prev = [...stack.slice(0, i)].reverse().find((p) => p.x[0] < stack[i].x[1] && p.x[1] > stack[i].x[0] && p.y[1] <= stack[i].y[0] + 0.001)
        if (prev) gapsV.push(`${prev.name} → ${stack[i].name}: ${r((stack[i].y[0] - prev.y[1]) * 10)} mm`)
      }
      return {
        id: item.id,
        typ: item.type,
        szer: item.width,
        fronty: stack.map((p) => `${p.name}: ${r(p.x[1] - p.x[0])} × ${r(p.y[1] - p.y[0])} (y ${r(p.y[0])}–${r(p.y[1])})`),
        szczelinyPion: gapsV,
        goraNajwyzej: r(Math.max(...parts.map((p) => p.y[1]))),
      }
    })
    .filter(Boolean)

  // poziomo: sąsiednie meble w tym samym rzędzie (ta sama orientacja i linia frontów), odstęp między frontami na tej samej wysokości
  const gapsH: string[] = []
  const placed = items.map((item) => {
    const parts = itemFrontParts(item, s)
    return { item, parts: parts.map((p) => ({ ...p, w0: toWorld(item, p.x[0], 0), w1: toWorld(item, p.x[1], 0) })) }
  })
  for (const a of placed)
    for (const b of placed) {
      if (a.item.id >= b.item.id || a.item.rot !== b.item.rot) continue
      const axis = a.item.rot % 2 === 0 ? 'x' : 'y'
      for (const pa of a.parts)
        for (const pb of b.parts) {
          if (pa.y[0] >= pb.y[1] || pb.y[0] >= pa.y[1]) continue
          const [a0, a1] = [pa.w0[axis], pa.w1[axis]].sort((m, n) => m - n)
          const [b0, b1] = [pb.w0[axis], pb.w1[axis]].sort((m, n) => m - n)
          const gap = b0 >= a1 ? b0 - a1 : a0 >= b1 ? a0 - b1 : -1
          if (gap >= 0 && gap < 2) gapsH.push(`${a.item.type}/${pa.name} ↔ ${b.item.type}/${pb.name}: ${r(gap * 10)} mm`)
        }
    }
  return { perItem, szczelinyPoziom: [...new Set(gapsH)] }
}
