import { footprint, materialsFor } from '../catalog'
import { BOARD_SWATCH } from '../three/materials'
import { toWorld, itemOutline, type Pt } from '../geometry'
import type { Item, Settings } from '../types'
import { itemBoards } from './boards'

const pts = (list: Pt[]) => list.map((p) => `${p.x},${p.y}`).join(' ')

interface Props {
  item: Item
  s: Settings
  selected: boolean
}

/** Symbol mebla na rzucie z góry. */
export function ItemShape({ item, s, selected }: Props) {
  const { w, d } = footprint(item, s)
  const hw = w / 2
  const hd = d / 2
  const L = (x1: number, z1: number, x2: number, z2: number, cls: string) => {
    const a = toWorld(item, x1, z1)
    const b = toWorld(item, x2, z2)
    return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={cls} vectorEffect="non-scaling-stroke" />
  }
  const rect = (x1: number, z1: number, x2: number, z2: number, cls: string) => (
    <polygon points={pts([toWorld(item, x1, z1), toWorld(item, x2, z1), toWorld(item, x2, z2), toWorld(item, x1, z2)])} className={cls} vectorEffect="non-scaling-stroke" />
  )
  const outline = <polygon points={pts(itemOutline(item, s))} className={`shape shape-${item.type}${selected ? ' selected' : ''}`} vectorEffect="non-scaling-stroke" />

  switch (item.type) {
    // płyty korpusu i fronty rysuje ItemBoards w osobnej warstwie nad blatem
    case 'base_blind_corner':
    case 'base_drawers':
    case 'base_door':
    case 'dishwasher':
    case 'filler':
    case 'base_corner':
    case 'vanity':
      return outline
    case 'wall_panel':
    case 'side_panel':
    case 'column_upper':
      return outline
    case 'wall_cabinet':
      return (
        <g>
          {outline}
          {L(-hw, hd, hw, hd, 'front-line')}
        </g>
      )
    case 'countertop':
      return outline
    case 'hob':
      return (
        <g>
          {outline}
          {[
            [-24, 12, 9],
            [-24, -12, 7.5],
            [0, 0, 11],
            [24, 12, 7.5],
            [24, -12, 9],
          ].map(([x, z, r], i) => {
            const c = toWorld(item, x, z)
            return <circle key={i} cx={c.x} cy={c.y} r={r} className="hob-ring" vectorEffect="non-scaling-stroke" />
          })}
        </g>
      )
    case 'sink':
      return (
        <g>
          {outline}
          {rect(-34.25, -20.5, 34.25, 20.5, 'sink-bowl')}
        </g>
      )
    case 'oven_column': {
      const xl = -hw + (item.panelLeft ? s.boardThickness : 0)
      const xr = xl + (w - ((item.panelLeft ? 1 : 0) + (item.panelRight ? 1 : 0)) * s.boardThickness)
      return (
        <g>
          {outline}
          {L(xl, -hd, xr, hd, 'tall-x')}
          {L(xr, -hd, xl, hd, 'tall-x')}
        </g>
      )
    }
    case 'fridge':
      return (
        <g>
          {outline}
          {L(-hw, -hd, hw, hd, 'tall-x')}
          {L(hw, -hd, -hw, hd, 'tall-x')}
          {L(-hw, hd, hw, hd, 'front-line')}
        </g>
      )
    case 'shallow_column':
      return (
        <g>
          {outline}
          {L(-hw, -hd, hw, hd, 'tall-x')}
          {L(hw, -hd, -hw, hd, 'tall-x')}
        </g>
      )
    case 'obstacle':
      return (
        <g>
          {outline}
          {L(-hw, -hd, hw, hd, 'obstacle-x')}
          {L(hw, -hd, -hw, hd, 'obstacle-x')}
        </g>
      )
  }
}

/** Obrysy płyt korpusu i frontów (bez wymiarów) – widoczne przez blat. */
export function ItemBoards({ item, s }: { item: Item; s: Settings }) {
  return (
    <g>
      {itemBoards(item, s).map((bd, i) => (
        <polygon
          key={i}
          points={pts([toWorld(item, bd.x0, bd.z0), toWorld(item, bd.x1, bd.z0), toWorld(item, bd.x1, bd.z1), toWorld(item, bd.x0, bd.z1)])}
          className={`board board-${bd.kind}`}
          style={bd.kind === 'front' ? { fill: BOARD_SWATCH[materialsFor(item, s).front] } : undefined}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  )
}

export function itemLabel(item: Item): string {
  switch (item.type) {
    case 'base_drawers':
      return `S${item.drawers ?? 3} ${item.width}`
    case 'base_door':
      return `D ${item.width}`
    case 'base_corner':
      return `N ${item.width}`
    case 'base_blind_corner':
      return `N ${item.width}`
    case 'filler':
      return `B ${item.width}`
    case 'countertop':
      return `Blat ${item.width}×${item.depth}`
    case 'hob':
      return 'Płyta'
    case 'sink':
      return 'Zlew'
    case 'oven_column':
      return 'Piekarnik'
    case 'shallow_column':
      return `P ${item.width}`
    case 'wall_cabinet':
      return `G ${item.width}`
    case 'wall_panel':
      return `Płyta ${item.width}`
    case 'side_panel':
      return 'PB'
    case 'column_upper':
      return `GS ${item.width}`
    case 'vanity':
      return `ZL${item.drawers === 2 ? 2 : 1} ${item.width}`
    case 'dishwasher':
      return `ZM ${item.width}`
    case 'fridge':
      return 'Lodówka'
    case 'obstacle':
      return 'Przeszkoda'
  }
}
