import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { carcassBox, dimsLabel, fmt, footprint, isBaseCabinet, isOnCounter } from '../catalog'
import {
  distToSegment,
  itemBox,
  itemOutline,
  pointInPolygon,
  snapPosition,
  toWorld,
  wallDistances,
  wallLength,
  wallOutward,
  wallPolygon,
  type Box,
  type Pt,
} from '../geometry'
import { counterItemClearances } from '../clearances'
import { useStore } from '../store'
import type { Item, Wall } from '../types'
import { ItemBoards, ItemShape, itemLabel } from './ItemShape'
import { measureSnap, type MeasureSnap } from './measure'

interface View {
  scale: number
  tx: number
  ty: number
}

type Drag =
  | { mode: 'pan'; sx: number; sy: number; view: View }
  | { mode: 'item'; id: string; dx: number; dy: number; sx: number; sy: number; moved: boolean; cycle: Item[] | null }
  | { mode: 'point'; from: Pt; moved: boolean }
  | null

/** Kolejność wybierania przy nakładaniu: AGD na blacie, szafki górne, szafki dolne, na końcu blat. */
const pickOrder = (i: Item) =>
  isOnCounter(i.type) ? 0 : i.type === 'wall_cabinet' || i.type === 'column_upper' ? 1 : i.type === 'wall_panel' ? 1.5 : i.type === 'countertop' ? 3 : 2
const isWallLevel = (i: Item) => i.type === 'wall_cabinet' || i.type === 'wall_panel' || i.type === 'column_upper'

export function PlanView() {
  const walls = useStore((s) => s.walls)
  const items = useStore((s) => s.items)
  const settings = useStore((s) => s.settings)
  const selection = useStore((s) => s.selection)
  const tool = useStore((s) => s.tool)
  const drawThickness = useStore((s) => s.drawThickness)

  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<View>({ scale: 1.5, tx: 60, ty: 60 })
  const drag = useRef<Drag>(null)
  /** Dopóki użytkownik nie przesunie/przybliży rzutu, widok dopasowuje się do rozmiaru panelu. */
  const userMoved = useRef(false)

  // rysowanie ścian
  const [chain, setChain] = useState<Pt[]>([])
  const [cursor, setCursor] = useState<Pt | null>(null)

  // miarka: zapisane pomiary (tylko w widoku, nie w projekcie), rozpoczęty pomiar i punkt pod kursorem
  const [measures, setMeasures] = useState<{ a: Pt; b: Pt }[]>([])
  const [mStart, setMStart] = useState<Pt | null>(null)
  const [mHover, setMHover] = useState<MeasureSnap | null>(null)
  const snapMeasure = (p: Pt, shift: boolean) => measureSnap(p, items, walls, settings, 10 / view.scale, shift ? mStart : null)
  const [typed, setTyped] = useState('')
  const shiftRef = useRef(false)

  useLayoutEffect(() => {
    const el = svgRef.current!
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const fit = useCallback(() => {
    // stan z magazynu, nie z domknięcia – fit bywa wołany zaraz po wczytaniu projektu
    const { walls, items, settings } = useStore.getState()
    const xs: number[] = []
    const ys: number[] = []
    for (const w of walls) xs.push(w.x1, w.x2), ys.push(w.y1, w.y2)
    for (const i of items) {
      const b = itemBox(i, settings)
      xs.push(b.minX, b.maxX)
      ys.push(b.minY, b.maxY)
    }
    if (!xs.length) return setView({ scale: 1.5, tx: 60, ty: 60 })
    const minX = Math.min(...xs) - 40
    const maxX = Math.max(...xs) + 40
    const minY = Math.min(...ys) - 40
    const maxY = Math.max(...ys) + 40
    const scale = Math.min(size.w / (maxX - minX), size.h / (maxY - minY))
    setView({ scale, tx: (size.w - (maxX - minX) * scale) / 2 - minX * scale, ty: (size.h - (maxY - minY) * scale) / 2 - minY * scale })
  }, [size])

  useEffect(() => {
    if (!userMoved.current && size.w > 100) fit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size])

  useEffect(() => {
    const onFit = () => fit()
    window.addEventListener('plan:fit', onFit)
    return () => window.removeEventListener('plan:fit', onFit)
  }, [fit])

  const toWorldPt = (e: { clientX: number; clientY: number }): Pt => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left - view.tx) / view.scale, y: (e.clientY - r.top - view.ty) / view.scale }
  }

  // ───── ściany: przyciąganie punktu ─────
  const snapWallPoint = (p: Pt, prev: Pt | undefined, free: boolean): Pt => {
    const thr = 10 / view.scale
    const ends = walls.flatMap((w) => [
      { x: w.x1, y: w.y1 },
      { x: w.x2, y: w.y2 },
    ])
    for (const e of [...ends, ...chain]) if (Math.hypot(e.x - p.x, e.y - p.y) < thr) return e
    if (prev && !free) {
      return Math.abs(p.x - prev.x) > Math.abs(p.y - prev.y) ? { x: Math.round(p.x), y: prev.y } : { x: prev.x, y: Math.round(p.y) }
    }
    return { x: Math.round(p.x), y: Math.round(p.y) }
  }

  const previewPoint = (): Pt | null => {
    if (!cursor) return null
    const prev = chain[chain.length - 1]
    const len = parseFloat(typed.replace(',', '.'))
    if (prev && len > 0) {
      const dx = cursor.x - prev.x
      const dy = cursor.y - prev.y
      const l = Math.hypot(dx, dy) || 1
      return { x: prev.x + (dx / l) * len, y: prev.y + (dy / l) * len }
    }
    return cursor
  }

  const finishChain = useCallback(
    (points: Pt[], closed: boolean) => {
      const clean = points.filter((p, i) => i === 0 || Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) > 0.5)
      if (clean.length >= 2) useStore.getState().addWallChain(clean, closed, drawThickness)
      setChain([])
      setTyped('')
    },
    [drawThickness],
  )

  const addChainPoint = (p: Pt) => {
    if (chain.length >= 3 && Math.hypot(p.x - chain[0].x, p.y - chain[0].y) < 0.5) return finishChain(chain, true)
    setChain([...chain, p])
    setTyped('')
  }

  useEffect(() => {
    setChain([])
    setTyped('')
    setMStart(null)
    setMHover(null)
  }, [tool])

  // klawiatura w trybie miarki: Esc przerywa pomiar, a bez rozpoczętego wraca do zaznaczania
  useEffect(() => {
    if (tool !== 'measure') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || (e.target as HTMLElement).closest('input, select, textarea')) return
      if (mStart) setMStart(null)
      else useStore.getState().setTool('select')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tool, mStart])

  // klawiatura w trybie rysowania
  useEffect(() => {
    if (tool !== 'wall') return
    const onKey = (e: KeyboardEvent) => {
      shiftRef.current = e.shiftKey
      if ((e.target as HTMLElement).closest('input, select, textarea')) return
      if (/^[0-9.,]$/.test(e.key) && chain.length) {
        setTyped((t) => t + e.key)
        e.preventDefault()
      } else if (e.key === 'Backspace' && typed) {
        setTyped((t) => t.slice(0, -1))
        e.preventDefault()
      } else if (e.key === 'Enter') {
        const p = previewPoint()
        if (typed && p) addChainPoint({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })
        else finishChain(chain, false)
      } else if (e.key === 'Escape') {
        if (chain.length) finishChain(chain, false)
        else useStore.getState().setTool('select')
      }
    }
    const onUp = (e: KeyboardEvent) => (shiftRef.current = e.shiftKey)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onUp)
    }
  })

  // ───── wskaźnik ─────
  const hitItems = (p: Pt) =>
    items
      .filter((i) => pointInPolygon(p, itemOutline(i, settings)))
      .sort((a, b) => pickOrder(a) - pickOrder(b))

  const hitWall = (p: Pt): Wall | undefined =>
    walls.find((w) => pointInPolygon(p, wallPolygon(w, walls)) || distToSegment(p, { x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }) < 5 / view.scale)

  const onPointerDown = (e: React.PointerEvent) => {
    svgRef.current!.setPointerCapture(e.pointerId)
    const p = toWorldPt(e)
    if (e.button === 1 || e.button === 2) {
      drag.current = { mode: 'pan', sx: e.clientX, sy: e.clientY, view }
      return
    }
    if (tool === 'wall') {
      addChainPoint(previewPoint() ?? snapWallPoint(p, chain[chain.length - 1], e.shiftKey))
      return
    }
    if (tool === 'measure') {
      const sn = snapMeasure(p, e.shiftKey)
      if (!mStart) setMStart(sn.p)
      else {
        setMeasures([...measures, { a: mStart, b: sn.p }])
        setMStart(null)
      }
      return
    }
    const store = useStore.getState()
    // uchwyty końców zaznaczonej ściany
    const selWall = selection?.kind === 'wall' ? walls.find((w) => w.id === selection.id) : undefined
    if (selWall) {
      for (const end of [
        { x: selWall.x1, y: selWall.y1 },
        { x: selWall.x2, y: selWall.y2 },
      ])
        if (Math.hypot(end.x - p.x, end.y - p.y) < 8 / view.scale) {
          drag.current = { mode: 'point', from: end, moved: false }
          return
        }
    }
    const hits = hitItems(p)
    if (hits.length) {
      const current = selection?.kind === 'item' ? hits.find((h) => h.id === selection.id) : undefined
      const target = current ?? hits[0]
      if (!current) store.select({ kind: 'item', id: target.id })
      drag.current = { mode: 'item', id: target.id, dx: p.x - target.x, dy: p.y - target.y, sx: e.clientX, sy: e.clientY, moved: false, cycle: current && hits.length > 1 ? hits : null }
      return
    }
    const wall = hitWall(p)
    if (wall) {
      store.select({ kind: 'wall', id: wall.id })
      return
    }
    store.select(null)
    drag.current = { mode: 'pan', sx: e.clientX, sy: e.clientY, view }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const p = toWorldPt(e)
    if (tool === 'wall') setCursor(snapWallPoint(p, chain[chain.length - 1], e.shiftKey))
    if (tool === 'measure') setMHover(snapMeasure(p, e.shiftKey))
    const d = drag.current
    if (!d) return
    const store = useStore.getState()
    if (d.mode === 'pan') {
      userMoved.current = true
      setView({ ...d.view, tx: d.view.tx + e.clientX - d.sx, ty: d.view.ty + e.clientY - d.sy })
    } else if (d.mode === 'item') {
      if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 3) return
      const item = store.items.find((i) => i.id === d.id)
      if (!item) return
      if (!d.moved) store.checkpoint()
      d.moved = true
      const pos = snapPosition(item, { x: p.x - d.dx, y: p.y - d.dy }, store.items, store.walls, store.settings, 14 / view.scale)
      store.updateItem(d.id, pos)
    } else if (d.mode === 'point') {
      if (!d.moved) store.checkpoint()
      d.moved = true
      const to = snapWallPoint(p, undefined, true)
      store.moveWallPoint(d.from, to)
      d.from = to
    }
  }

  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (d?.mode === 'item' && !d.moved && d.cycle) {
      // ponowne kliknięcie w to samo miejsce wybiera element pod spodem
      const idx = d.cycle.findIndex((i) => i.id === d.id)
      useStore.getState().select({ kind: 'item', id: d.cycle[(idx + 1) % d.cycle.length].id })
    }
  }

  /** Powiększenie wokół punktu ekranu (domyślnie środek widoku). */
  const zoomAt = (k: number, mx = size.w / 2, my = size.h / 2) => {
    userMoved.current = true
    const scale = Math.min(20, Math.max(0.2, view.scale * k))
    const f = scale / view.scale
    setView({ scale, tx: mx - (mx - view.tx) * f, ty: my - (my - view.ty) * f })
  }

  const onWheel = (e: React.WheelEvent) => {
    const r = svgRef.current!.getBoundingClientRect()
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top)
  }

  // ───── rysowanie ─────
  const px = (n: number) => n / view.scale
  const selectedItem = selection?.kind === 'item' ? items.find((i) => i.id === selection.id) : undefined
  const selectedWall = selection?.kind === 'wall' ? walls.find((w) => w.id === selection.id) : undefined
  const layers = [
    items.filter((i) => !isOnCounter(i.type) && i.type !== 'countertop' && !isWallLevel(i)),
    items.filter((i) => i.type === 'countertop'),
    items.filter((i) => isOnCounter(i.type)),
    items.filter(isWallLevel),
  ]
  const preview = tool === 'wall' ? previewPoint() : null
  const last = chain[chain.length - 1]

  const grid10 = 10 * view.scale
  const grid100 = 100 * view.scale

  return (
    <>
      <svg
        ref={svgRef}
        className={`plan tool-${tool}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          setCursor(null)
          setMHover(null)
        }}
        onWheel={onWheel}
        onDoubleClick={() => tool === 'wall' && finishChain(chain, false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <pattern id="g10" width={grid10} height={grid10} patternUnits="userSpaceOnUse" x={view.tx} y={view.ty}>
            <path d={`M ${grid10} 0 L 0 0 0 ${grid10}`} className="grid-minor" />
          </pattern>
          <pattern id="g100" width={grid100} height={grid100} patternUnits="userSpaceOnUse" x={view.tx} y={view.ty}>
            <rect width={grid100} height={grid100} fill={grid10 > 6 ? 'url(#g10)' : 'none'} />
            <path d={`M ${grid100} 0 L 0 0 0 ${grid100}`} className="grid-major" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g100)" />

        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.scale})`} style={{ '--inv-scale': 1 / view.scale } as React.CSSProperties}>
          {walls.map((w) => (
            <polygon
              key={w.id}
              points={wallPolygon(w, walls)
                .map((p) => `${p.x},${p.y}`)
                .join(' ')}
              className={`wall${selectedWall?.id === w.id ? ' selected' : ''}`}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {layers.map((layer, li) => (
            <g key={li}>
              {/* nad blatem (warstwa 1), pod AGD: płyty korpusów i fronty szafek dolnych i słupków */}
              {li === 2 && layers[0].map((i) => <ItemBoards key={`b-${i.id}`} item={i} s={settings} />)}
              {layer.map((i) => (
                <ItemShape key={i.id} item={i} s={settings} selected={selectedItem?.id === i.id} />
              ))}
            </g>
          ))}

          {items
            .filter((i) => i.type !== 'countertop' || selectedItem?.id === i.id)
            .map((i) => (
              <ItemLabel key={i.id} item={i} px={px} />
            ))}

          {walls.map((w) => (
            <WallDimension key={w.id} wall={w} px={px} />
          ))}


          {selectedWall &&
            [
              { x: selectedWall.x1, y: selectedWall.y1 },
              { x: selectedWall.x2, y: selectedWall.y2 },
            ].map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={px(5)} className="handle" vectorEffect="non-scaling-stroke" />)}

          {tool === 'wall' && (
            <g className="drawing">
              {chain.length > 1 && <polyline points={chain.map((p) => `${p.x},${p.y}`).join(' ')} vectorEffect="non-scaling-stroke" />}
              {last && preview && (
                <>
                  <line x1={last.x} y1={last.y} x2={preview.x} y2={preview.y} vectorEffect="non-scaling-stroke" className="rubber" />
                  <text x={(last.x + preview.x) / 2} y={(last.y + preview.y) / 2} dy={px(-6)} fontSize={px(12)} textAnchor="middle" className="rubber-label">
                    {typed ? `${typed} cm ↵` : `${fmt(Math.hypot(preview.x - last.x, preview.y - last.y))} cm`}
                  </text>
                </>
              )}
              {chain.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={px(i === 0 && chain.length >= 3 ? 6 : 3)} className="handle" vectorEffect="non-scaling-stroke" />
              ))}
              {preview && <circle cx={preview.x} cy={preview.y} r={px(3)} className="cursor" />}
            </g>
          )}
          {measures.map((m, i) => (
            <MeasureLine key={i} a={m.a} b={m.b} px={px} />
          ))}
          {tool === 'measure' && mStart && mHover && <MeasureLine a={mStart} b={mHover.p} px={px} live />}
          {tool === 'measure' && mStart && <circle cx={mStart.x} cy={mStart.y} r={px(3.5)} className="measure-point" vectorEffect="non-scaling-stroke" />}
          {tool === 'measure' && mHover && (
            <circle cx={mHover.p.x} cy={mHover.p.y} r={px(mHover.kind === 'free' ? 2 : 4.5)} className={`measure-snap ${mHover.kind}`} vectorEffect="non-scaling-stroke" />
          )}
          {/* wymiary zaznaczenia na samym wierzchu – nic ich nie przykrywa */}
          {selectedItem && <SelectionDims item={selectedItem} px={px} />}
        </g>

        {tool === 'wall' && (
          <text x={12} y={size.h - 12} className="hint">
            Klik – punkt · wpisz liczbę + Enter – dokładna długość · Shift – dowolny kąt · klik w pierwszy punkt – zamknij · Enter/Esc – zakończ
          </text>
        )}
        {tool === 'measure' && (
          <text x={12} y={size.h - 12} className="hint">
            Klik – początek, klik – koniec pomiaru · przyciąga do narożników (●) i krawędzi (○) · Shift – poziomo/pionowo · Esc – przerwij
          </text>
        )}
        {tool === 'select' && selectedItem && hitCount(selectedItem, items, settings) > 1 && (
          <text x={12} y={size.h - 12} className="hint">
            Kliknij ponownie bez przesuwania, aby wybrać element pod spodem (np. blat)
          </text>
        )}
      </svg>
      {measures.length > 0 && (
        <div className="measure-tools">
          <button onClick={() => setMeasures([])}>Wyczyść pomiary ({measures.length})</button>
        </div>
      )}
      <div className="zoom-controls">
        <button onClick={() => zoomAt(1.25)} title="Przybliż">
          +
        </button>
        <button onClick={() => zoomAt(0.8)} title="Oddal">
          −
        </button>
        <button onClick={fit} title="Dopasuj rzut">
          ⤢
        </button>
      </div>
    </>
  )
}

/** Pomiar miarką: odcinek z kreskami na końcach i długością (przy skosie także Δx × Δy), tekst wzdłuż odcinka. */
function MeasureLine({ a, b, px, live }: { a: Pt; b: Pt; px: (n: number) => number; live?: boolean }) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len < 0.05) return null
  const nx = -dy / len
  const ny = dx / len
  const tick = px(5)
  let ang = (Math.atan2(dy, dx) * 180) / Math.PI
  if (ang > 90 || ang <= -90) ang += 180
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const diagonal = Math.abs(dx) > 0.05 && Math.abs(dy) > 0.05
  return (
    <g className={`measure${live ? ' live' : ''}`}>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} vectorEffect="non-scaling-stroke" />
      {[a, b].map((p, i) => (
        <line key={i} x1={p.x - nx * tick} y1={p.y - ny * tick} x2={p.x + nx * tick} y2={p.y + ny * tick} vectorEffect="non-scaling-stroke" />
      ))}
      <text x={mx} y={my} dy={px(-5)} fontSize={px(12)} textAnchor="middle" transform={`rotate(${ang} ${mx} ${my})`}>
        {fmt(len)}
        {diagonal ? ` (${fmt(Math.abs(dx))} × ${fmt(Math.abs(dy))})` : ''}
      </text>
    </g>
  )
}

function DimLine({ from, to, text, px, cls, size = 10 }: { from: Pt; to: Pt; text: string; px: (n: number) => number; cls: string; size?: number }) {
  const horizontal = Math.abs(to.y - from.y) < 0.01
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2
  const tick = px(4)
  return (
    <g className={cls}>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} vectorEffect="non-scaling-stroke" />
      {[from, to].map((p, i) =>
        horizontal ? (
          <line key={i} x1={p.x} y1={p.y - tick} x2={p.x} y2={p.y + tick} vectorEffect="non-scaling-stroke" />
        ) : (
          <line key={i} x1={p.x - tick} y1={p.y} x2={p.x + tick} y2={p.y} vectorEffect="non-scaling-stroke" />
        ),
      )}
      <text x={mx} y={my} fontSize={px(size)} dy={px(-4)} textAnchor="middle" transform={horizontal ? undefined : `rotate(-90 ${mx} ${my})`}>
        {text}
      </text>
    </g>
  )
}

/** Prostokąt z układu mebla na rzucie (obrót co 90°, więc wystarczą dwa narożniki). */
function worldBox(item: Item, r: { x0: number; x1: number; z0: number; z1: number }): Box {
  const a = toWorld(item, r.x0, r.z0)
  const c = toWorld(item, r.x1, r.z1)
  return { minX: Math.min(a.x, c.x), maxX: Math.max(a.x, c.x), minY: Math.min(a.y, c.y), maxY: Math.max(a.y, c.y) }
}

const boxPoints = (b: Box) => `${b.minX},${b.minY} ${b.maxX},${b.minY} ${b.maxX},${b.maxY} ${b.minX},${b.maxY}`

/** Wymiary zaznaczonego mebla: szerokość i głębokość, odległości od ścian; dla zlewu/płyty – od korpusu i blatu. */
function SelectionDims({ item, px }: { item: Item; px: (n: number) => number }) {
  const items = useStore((s) => s.items)
  const walls = useStore((s) => s.walls)
  const settings = useStore((s) => s.settings)
  const info = counterItemClearances(item, items, settings)
  if (info)
    return (
      <g>
        {info.cabinetInner && <polygon points={boxPoints(info.cabinetInner)} className="clear-outline cabinet" vectorEffect="non-scaling-stroke" />}
        <polygon points={boxPoints(info.cutout)} className="clear-outline cutout" vectorEffect="non-scaling-stroke" />
        {info.items.map((c, i) => (
          <DimLine key={i} from={c.from} to={c.to} text={fmt(c.dist)} px={px} cls={`clear-dim ${c.kind}`} />
        ))}
      </g>
    )
  // korpus (bez frontów i płyt bocznych), a gdy mebel go nie ma – cały obrys
  const cb = carcassBox(item, settings)
  const b = cb ? worldBox(item, cb) : itemBox(item, settings)
  const off = px(16)
  return (
    <g>
      {cb && <polygon points={boxPoints(b)} className="carcass-outline" vectorEffect="non-scaling-stroke" />}
      <DimLine from={{ x: b.minX, y: b.maxY + off }} to={{ x: b.maxX, y: b.maxY + off }} text={fmt(b.maxX - b.minX)} px={px} cls="sel-dim" size={13} />
      <DimLine from={{ x: b.maxX + off, y: b.minY }} to={{ x: b.maxX + off, y: b.maxY }} text={fmt(b.maxY - b.minY)} px={px} cls="sel-dim" size={13} />
      {wallDistances(b, walls).map((d, i) => (
        <g key={i} className="distance">
          <line x1={d.from.x} y1={d.from.y} x2={d.to.x} y2={d.to.y} vectorEffect="non-scaling-stroke" />
          <text x={(d.from.x + d.to.x) / 2} y={(d.from.y + d.to.y) / 2} fontSize={px(10)} dy={px(-3)} textAnchor="middle">
            {fmt(d.dist)}
          </text>
        </g>
      ))}
    </g>
  )
}

/** Nazwa i „szer × gł × wys” wzdłuż frontu; szafki górne opisane przy ścianie, żeby nie nachodziły na dolne. */
function ItemLabel({ item, px }: { item: Item; px: (n: number) => number }) {
  const settings = useStore((s) => s.settings)
  const { d } = footprint(item, settings)
  // szafki górne opisane przy ścianie, płyta pod nimi przy przedniej krawędzi – żeby się nie nakładały
  const at =
    item.type === 'wall_cabinet' || item.type === 'column_upper' ? toWorld(item, 0, -d / 2 + px(14)) : item.type === 'wall_panel' ? toWorld(item, 0, d / 2 - px(6)) : { x: item.x, y: item.y }
  const dims = settings.showDims ? dimsLabel(item, settings) : null
  const angle = item.rot % 2 === 1 ? -90 : 0
  return (
    <text x={at.x} y={at.y} transform={`rotate(${angle} ${at.x} ${at.y})`} className="item-label" fontSize={px(11)} textAnchor="middle">
      <tspan x={at.x} dy={dims ? '-0.25em' : '0.35em'}>
        {itemLabel(item)}
      </tspan>
      {dims && (
        <tspan x={at.x} dy="1.2em" className="item-dims" fontSize={px(9)}>
          {dims}
        </tspan>
      )}
    </text>
  )
}

function hitCount(item: Item, items: Item[], s: Parameters<typeof itemBox>[1]) {
  return items.filter((o) => o.id !== item.id && pointInPolygon({ x: item.x, y: item.y }, itemOutline(o, s))).length + 1
}

function WallDimension({ wall, px }: { wall: Wall; px: (n: number) => number }) {
  const len = wallLength(wall)
  if (len < 1) return null
  const n = wallOutward(wall)
  const off = px(18)
  // linia wymiarowa po stronie pokoju
  const a = { x: wall.x1 - n.x * off, y: wall.y1 - n.y * off }
  const b = { x: wall.x2 - n.x * off, y: wall.y2 - n.y * off }
  let ang = (Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1) * 180) / Math.PI
  if (ang > 90 || ang <= -90) ang += 180
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const tick = px(5)
  return (
    <g className="dimension">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} vectorEffect="non-scaling-stroke" />
      <line x1={a.x - n.x * tick} y1={a.y - n.y * tick} x2={a.x + n.x * tick} y2={a.y + n.y * tick} vectorEffect="non-scaling-stroke" />
      <line x1={b.x - n.x * tick} y1={b.y - n.y * tick} x2={b.x + n.x * tick} y2={b.y + n.y * tick} vectorEffect="non-scaling-stroke" />
      <text x={mx} y={my} transform={`rotate(${ang} ${mx} ${my})`} dy={px(-4)} fontSize={px(12)} textAnchor="middle">
        {fmt(len)}
      </text>
    </g>
  )
}

export const isFloorItem = (i: Item) => isBaseCabinet(i.type) || i.type === 'oven_column' || i.type === 'shallow_column'
