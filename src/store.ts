import { create } from 'zustand'
import { DEFAULT_SETTINGS, FRIDGE, HOB, baseDepth, baseWallGap, columnCompanions, footprint, uid, wallPanelDepth } from './catalog'
import { chainSide, type Pt } from './geometry'
import type { Item, Project, Rot, Selection, Settings, Wall } from './types'

export type Tool = 'select' | 'wall' | 'measure'
export type ViewMode = 'split' | 'plan' | '3d'

interface State extends Project {
  selection: Selection
  tool: Tool
  viewMode: ViewMode
  drawThickness: number
  /** Otwarte fronty w 3D (`idMebla:nazwaFrontu`) – tylko podgląd, bez zapisu i historii. */
  openFronts: Record<string, boolean>
  toggleFront: (key: string) => void
  /** Front kliknięty w 3D (`idMebla:…`) z wymiarami do pokazania. */
  selectedFront: { key: string; w: number; h: number; t: number } | null
  selectFront: (f: State['selectedFront']) => void
  past: Project[]
  future: Project[]
  /** Zapamiętuje stan przed zmianą (do cofania). Wywoływane raz na operację, np. na początku przeciągania. */
  checkpoint: () => void
  undo: () => void
  redo: () => void
  setTool: (t: Tool) => void
  setViewMode: (v: ViewMode) => void
  setDrawThickness: (t: number) => void
  select: (s: Selection) => void
  addItem: (item: Item) => void
  updateItem: (id: string, patch: Partial<Item>) => void
  removeSelected: () => void
  duplicateSelected: () => void
  rotateSelected: (dir: 1 | -1) => void
  addWallChain: (points: Pt[], closed: boolean, thickness: number) => void
  updateWall: (id: string, patch: Partial<Wall>) => void
  moveWallPoint: (from: Pt, to: Pt) => void
  /** Przesuwa całą ścianę; dołączone ściany wydłużają się lub skracają razem z nią. */
  moveWall: (id: string, delta: Pt) => void
  setWallLength: (id: string, length: number) => void
  updateSettings: (patch: Partial<Settings>) => void
  loadProject: (p: Project) => void
}

// v3: przy zmianie przykładowego układu podbijamy wersję, żeby przeglądarka wczytała go od nowa
const STORAGE_KEY = 'kitchen-editor:project:v19'

const snapshot = (s: State): Project => ({ walls: s.walls, items: s.items, settings: s.settings })

function rectRoom(w: number, d: number, thickness = 12): Wall[] {
  return rectWalls(0, 0, w, d, thickness)
}

/** Prostokąt ścian o wymiarach wewnętrznych w × d z lewym górnym narożnikiem lica w (x0, y0). */
function rectWalls(x0: number, y0: number, w: number, d: number, thickness: number): Wall[] {
  const pts = [
    { x: x0, y: y0 },
    { x: x0 + w, y: y0 },
    { x: x0 + w, y: y0 + d },
    { x: x0, y: y0 + d },
  ]
  return pts.map((p, i) => {
    const q = pts[(i + 1) % 4]
    return { id: uid(), x1: p.x, y1: p.y, x2: q.x, y2: q.y, thickness, side: 1 }
  })
}

const r1 = (v: number) => Math.round(v * 10) / 10

/**
 * Moja kuchnia w kształcie Z:
 * długa ściana z płytkami (430,3) – lodówka, szafka 60, zlewowa 80 (1 szuflada), zmywarka 60, szuflady z płytą 90 (lewy bok 155 cm od prawej ściany), blenda;
 * ściana pod 90° (224,5) – ślepy narożnik wsunięty do rogu 88 (blenda 57,4 + drzwiczki 29,8 w licu z 2. frontem górnym), szuflady 93,2 pod 2. szafką górną, szuflady, słupek z piekarnikiem kończący się 250 cm od długiej ściany, nad nimi szafki górne (4 drzwiczki);
 * trzecia ściana (300) – płytkie słupki 30, 60, 30 w licu z płytą boczną słupka.
 */
export function exampleProject(): Project {
  const s = DEFAULT_SETTINGS
  const gap = baseWallGap(s)
  const D = baseDepth(s)
  const TOP = 430.3
  const RIGHT = 224.5
  const THIRD = 300
  const OVEN_END = 250
  /** Lewy bok szuflad z płytą – odległość od prawej (krótszej) ściany. */
  const HOB_FROM_RIGHT = 155
  /** Drzwiczki narożnika zaczynają się tyle za linią frontów długiej ściany (miejsce na uchwyty przy otwieraniu). */
  const BLIND_DOOR_CLEARANCE = 5
  /** Płytkie słupki w licu z płytą boczną słupka z piekarnikiem. */
  const SHALLOW = OVEN_END - RIGHT
  const WALL = 12
  const ROOM = { x: TOP + WALL, y: RIGHT - WALL - 120, w: 185, d: 120 }
  const VANITY_D = 46
  const walls: Wall[] = [
    // okno nad zlewem: 102 cm od lewego końca ściany, parapet 97,7 cm
    { id: uid(), x1: 0, y1: 0, x2: TOP, y2: 0, thickness: WALL, side: 1, windows: [{ id: uid(), offset: 102, width: 174.6, sill: 97.7, height: 138.8 }] },
    { id: uid(), x1: TOP, y1: 0, x2: TOP, y2: RIGHT, thickness: WALL, side: 1 },
    { id: uid(), x1: TOP, y1: RIGHT, x2: TOP + THIRD, y2: RIGHT, thickness: WALL, side: 1 },
    // pomieszczenie obok 185 × 120 (wymiary wewnętrzne) za prawą ścianą kuchni, nad trzecią ścianą – dzieli z kuchnią te dwie ściany
    ...rectWalls(ROOM.x, ROOM.y, ROOM.w, ROOM.d, WALL),
  ]
  const item = (type: Item['type'], x: number, y: number, rot: Rot, width: number, extra: Partial<Item> = {}): Item => ({
    id: uid(),
    type,
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100,
    rot,
    width: r1(width),
    depth: 0,
    ...extra,
  })

  // długa ściana – szuflady z płytą kończą się HOB_FROM_RIGHT od prawej ściany, do frontów krótszej ściany blenda
  const rightRunFront = TOP - gap - D
  let x = TOP - HOB_FROM_RIGHT + 90
  const fillerW = rightRunFront - x
  const items: Item[] = [item('filler', x + fillerW / 2, gap + D / 2, 0, fillerW)]
  const centers: Record<string, number> = {}
  const topRun: [string, Item['type'], number, Partial<Item>][] = [
    ['hob', 'base_drawers', 90, { drawers: 3 }],
    ['dishwasher', 'dishwasher', 60, {}],
    ['sink', 'base_drawers', 80, { drawers: 1 }],
    ['cab', 'base_door', 60, { hinge: 'L' }],
  ]
  for (const [key, type, w, extra] of topRun) {
    x -= w
    centers[key] = x + w / 2
    items.push(item(type, x + w / 2, gap + D / 2, 0, w, extra))
  }
  const runStart = x
  items.push(item('fridge', runStart / 2, FRIDGE.d / 2, 0, FRIDGE.w, { height: FRIDGE.h }))
  items.push({ ...item('countertop', (runStart + TOP) / 2, s.counterDepth / 2, 0, TOP - runStart), depth: s.counterDepth })
  items.push(item('hob', centers.hob, s.counterDepth - 5 - HOB.d / 2, 0, 0))
  items.push(item('sink', centers.sink, s.counterDepth / 2, 0, 0))

  // ściana pod 90° – słupek z piekarnikiem kończy się OVEN_END od długiej ściany
  // standardowy słupek z frontami nakładanymi + osobne płyty boczne do sufitu w licu frontów
  const oven: Item = item('oven_column', 0, 0, 1, 60, { underOvenDoor: true, hinge: 'R' })
  const ovenFp = footprint(oven, s)
  const t = s.boardThickness
  const ovenStart = OVEN_END - ovenFp.w - 2 * t
  // korpus 51 jak szafki dolne, z luzem za plecami; płyty boczne sięgają do ściany i ten luz zakrywają
  oven.x = TOP - gap - ovenFp.d / 2
  oven.y = OVEN_END - t - ovenFp.w / 2
  const panelDepth = gap + ovenFp.d
  const sidePanel = (y: number, extra: Partial<Item>) => ({ ...item('side_panel', TOP - panelDepth / 2, y, 1, t, extra), depth: panelDepth })
  // prawa płyta (od strony płytkich słupków) z 2 kawałków w linii ich frontów, niższa o blendę – blenda nad nią ciągnie pas znad słupków
  items.push(sidePanel(ovenStart + t / 2, {}), sidePanel(OVEN_END - t / 2, { split: true, topBlend: true }))
  // ślepy narożnik wsunięty do samego rogu: blenda od strony długiej ściany sięga do miejsca,
  // gdzie zaczynają się drzwiczki – za frontami długiej ściany; prawa krawędź drzwiczek w licu
  // z drugim frontem szafek górnych (granica pierwszej szafki górnej)
  const wallW = r1(ovenStart / 2)
  const blindStart = gap
  const blindPanel = gap + D + BLIND_DOOR_CLEARANCE - blindStart
  const blind = wallW - blindStart
  items.push(item('base_blind_corner', TOP - gap - D / 2, blindStart + blind / 2, 1, blind, { blindSide: 'L', blindWidth: r1(blindPanel), hinge: 'L' }))
  const drawersStart = blindStart + blind
  // słupek z piekarnikiem + osobne szafki nad piekarnikiem
  items.push(oven, ...columnCompanions(oven, s))
  items.push(item('base_drawers', TOP - gap - D / 2, (drawersStart + ovenStart) / 2, 1, ovenStart - drawersStart))
  items.push({ ...item('countertop', TOP - s.counterDepth / 2, (s.counterDepth + ovenStart) / 2, 1, ovenStart - s.counterDepth), depth: s.counterDepth })

  // szafki górne od długiej ściany do słupka: 2 korpusy z podwójnymi drzwiczkami = 4 fronty ~46 cm
  const wallWidths = [wallW, r1(ovenStart - wallW)]
  let y = 0
  for (const w of wallWidths) {
    items.push(item('wall_cabinet', TOP - s.wallCabinetDepth / 2, y + w / 2, 1, w, { doors: 2 }))
    y += w
  }
  // jedna płyta pod obiema szafkami górnymi, cofnięta za fronty
  items.push(item('wall_panel', TOP - wallPanelDepth(s) / 2, ovenStart / 2, 1, ovenStart))

  // trzecia ściana – płytkie słupki za słupkiem z piekarnikiem
  x = TOP
  for (const w of [30, 60, 30]) {
    const shallow: Item = { ...item('shallow_column', x + w / 2, RIGHT + SHALLOW / 2, 0, w, { hinge: 'L' }), depth: SHALLOW }
    // dolna szafka + osobna szafka górna z blendą
    items.push(shallow, ...columnCompanions(shallow, s))
    x += w
  }
  // pomieszczenie obok – szafki podwieszane w L w prawym górnym narożniku:
  // na ścianie 120 cm szafka z 2 szufladami na całą długość, na ścianie 185 cm obok niej szafka z 1 szufladą
  const roomRight = ROOM.x + ROOM.w
  items.push(item('vanity', roomRight - VANITY_D / 2, ROOM.y + ROOM.d / 2, 1, ROOM.d, { drawers: 2, height: 55 }))
  items.push(item('vanity', roomRight - VANITY_D - 30, ROOM.y + VANITY_D / 2, 0, 60, { drawers: 1, height: 40 }))
  for (const v of items.slice(-2)) v.depth = VANITY_D

  return { walls, items, settings: { ...s } }
}

/** Zapis projektu z chwilą zapisu – po niej wybieramy nowszą wersję (przeglądarka albo plik na dysku). */
type SavedProject = Project & { savedAt?: number }

function readLocal(): SavedProject | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as SavedProject
  } catch {
    // uszkodzony zapis – startujemy od przykładu
  }
  return null
}

const normalize = (p: Project): Project => ({ walls: p.walls ?? [], items: p.items ?? [], settings: { ...DEFAULT_SETTINGS, ...p.settings } })

function loadInitial(): Project {
  const p = readLocal()
  return p ? normalize(p) : exampleProject()
}

export const useStore = create<State>((set, get) => ({
  ...loadInitial(),
  selection: null,
  tool: 'select',
  // w wąskim oknie podział na rzut i 3D robi oba widoki za małe
  viewMode: 'split',
  drawThickness: 12,
  openFronts: {},
  selectedFront: null,
  selectFront: (selectedFront) => set({ selectedFront }),
  toggleFront: (key) => set((s) => ({ openFronts: { ...s.openFronts, [key]: !s.openFronts[key] } })),
  past: [],
  future: [],

  checkpoint: () => set((s) => ({ past: [...s.past.slice(-99), snapshot(s)], future: [] })),
  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1]
      if (!prev) return {}
      return { ...prev, past: s.past.slice(0, -1), future: [snapshot(s), ...s.future], selection: null }
    }),
  redo: () =>
    set((s) => {
      const next = s.future[0]
      if (!next) return {}
      return { ...next, past: [...s.past, snapshot(s)], future: s.future.slice(1), selection: null }
    }),

  setTool: (tool) => set({ tool, selection: null }),
  setViewMode: (viewMode) => set({ viewMode }),
  setDrawThickness: (drawThickness) => set({ drawThickness }),
  // zaznaczony front zostaje, jeśli należy do zaznaczanego mebla
  select: (selection) =>
    set((s) => ({ selection, selectedFront: selection && s.selectedFront?.key.startsWith(`${selection.id}:`) ? s.selectedFront : null })),

  addItem: (item) => {
    get().checkpoint()
    set((s) => ({ items: [...s.items, item], selection: { kind: 'item', id: item.id }, tool: 'select' }))
  },
  updateItem: (id, patch) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
  removeSelected: () => {
    const sel = get().selection
    if (!sel) return
    get().checkpoint()
    set((s) =>
      sel.kind === 'item'
        ? { items: s.items.filter((i) => i.id !== sel.id), selection: null }
        : { walls: s.walls.filter((w) => w.id !== sel.id), selection: null },
    )
  },
  duplicateSelected: () => {
    const sel = get().selection
    if (sel?.kind !== 'item') return
    const src = get().items.find((i) => i.id === sel.id)
    if (!src) return
    get().addItem({ ...src, id: uid(), x: src.x + 20, y: src.y + 20 })
  },
  rotateSelected: (dir) => {
    const sel = get().selection
    if (sel?.kind !== 'item') return
    const item = get().items.find((i) => i.id === sel.id)
    if (!item) return
    get().checkpoint()
    get().updateItem(item.id, { rot: (((item.rot + dir) % 4) + 4) % 4 as Rot })
  },

  addWallChain: (points, closed, thickness) => {
    if (points.length < 2) return
    get().checkpoint()
    const side = closed || points.length > 2 ? chainSide(points) : 1
    const segs = closed ? points.length : points.length - 1
    const walls: Wall[] = []
    for (let i = 0; i < segs; i++) {
      const a = points[i]
      const b = points[(i + 1) % points.length]
      if (Math.hypot(b.x - a.x, b.y - a.y) < 1) continue
      walls.push({ id: uid(), x1: a.x, y1: a.y, x2: b.x, y2: b.y, thickness, side })
    }
    set((s) => ({ walls: [...s.walls, ...walls] }))
  },
  updateWall: (id, patch) => set((s) => ({ walls: s.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
  moveWallPoint: (from, to) =>
    set((s) => ({
      walls: s.walls.map((w) => {
        const p1 = Math.abs(w.x1 - from.x) < 0.5 && Math.abs(w.y1 - from.y) < 0.5
        const p2 = Math.abs(w.x2 - from.x) < 0.5 && Math.abs(w.y2 - from.y) < 0.5
        if (!p1 && !p2) return w
        return { ...w, ...(p1 ? { x1: to.x, y1: to.y } : {}), ...(p2 ? { x2: to.x, y2: to.y } : {}) }
      }),
    })),
  moveWall: (id, delta) => {
    const w = get().walls.find((x) => x.id === id)
    if (!w) return
    const d = wallMoveDelta(w, get().walls, delta)
    if (!d.x && !d.y) return
    const ends = [
      { x: w.x1, y: w.y1 },
      { x: w.x2, y: w.y2 },
    ]
    const at = (x: number, y: number) => ends.some((e) => Math.abs(e.x - x) < 0.5 && Math.abs(e.y - y) < 0.5)
    const r = (v: number) => Math.round(v * 100) / 100
    set((s) => ({
      walls: s.walls.map((o) => {
        const p1 = at(o.x1, o.y1)
        const p2 = at(o.x2, o.y2)
        if (!p1 && !p2) return o
        return { ...o, ...(p1 ? { x1: r(o.x1 + d.x), y1: r(o.y1 + d.y) } : {}), ...(p2 ? { x2: r(o.x2 + d.x), y2: r(o.y2 + d.y) } : {}) }
      }),
    }))
  },
  setWallLength: (id, length) => {
    const w = get().walls.find((x) => x.id === id)
    if (!w || length <= 0) return
    const cur = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1
    const to = { x: w.x1 + ((w.x2 - w.x1) / cur) * length, y: w.y1 + ((w.y2 - w.y1) / cur) * length }
    get().checkpoint()
    get().moveWallPoint({ x: w.x2, y: w.y2 }, to)
  },

  updateSettings: (patch) => {
    get().checkpoint()
    set((s) => ({ settings: { ...s.settings, ...patch } }))
  },
  loadProject: (p) => {
    get().checkpoint()
    set({ walls: p.walls, items: p.items, settings: { ...DEFAULT_SETTINGS, ...p.settings }, selection: null })
  },
}))

/** Ściana z dołączonymi sąsiadami przesuwa się tylko prostopadle do siebie (sąsiedzi zostają pod tym samym kątem); wolnostojąca – swobodnie. */
export function wallMoveDelta(w: Wall, walls: Wall[], delta: Pt): Pt {
  const near = (ax: number, ay: number, bx: number, by: number) => Math.abs(ax - bx) < 0.5 && Math.abs(ay - by) < 0.5
  const touches = (x: number, y: number) => walls.some((o) => o.id !== w.id && (near(o.x1, o.y1, x, y) || near(o.x2, o.y2, x, y)))
  if (!touches(w.x1, w.y1) && !touches(w.x2, w.y2)) return delta
  const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1
  const n = { x: -(w.y2 - w.y1) / len, y: (w.x2 - w.x1) / len }
  const k = delta.x * n.x + delta.y * n.y
  return { x: n.x * k, y: n.y * k }
}

export function newRectRoom(w: number, d: number) {
  useStore.getState().loadProject({ walls: rectRoom(w, d), items: [], settings: useStore.getState().settings })
}

// w trybie dev projekt trafia też do pliku projekt-roboczy.json (wtyczka w vite.config.ts)
const putFile = (p: SavedProject) =>
  import.meta.env.DEV ? fetch('/api/project', { method: 'PUT', body: JSON.stringify(p, null, 2) }).catch(() => undefined) : undefined

let saveTimer: number | undefined
useStore.subscribe((s, prev) => {
  if (s.walls === prev.walls && s.items === prev.items && s.settings === prev.settings) return
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    const saved: SavedProject = { ...snapshot(useStore.getState()), savedAt: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    putFile(saved)
  }, 300)
})

// start: nowszy plik z dysku wygrywa z przeglądarką; bez pliku – zapisujemy na dysk to, co jest w przeglądarce
if (import.meta.env.DEV) {
  fetch('/api/project')
    .then((r) => (r.ok ? (r.json() as Promise<SavedProject>) : null))
    .then((file) => {
      const local = readLocal()
      if (file && (file.savedAt ?? 0) > (local?.savedAt ?? 0)) {
        useStore.setState({ ...normalize(file), selection: null, past: [], future: [] })
        localStorage.setItem(STORAGE_KEY, JSON.stringify(file))
      } else if (!file) {
        putFile({ ...snapshot(useStore.getState()), savedAt: local?.savedAt ?? Date.now() })
      }
    })
    .catch(() => undefined)
}

export const useSelectedItem = () => useStore((s) => (s.selection?.kind === 'item' ? s.items.find((i) => i.id === s.selection!.id) : undefined))
export const useSelectedWall = () => useStore((s) => (s.selection?.kind === 'wall' ? s.walls.find((w) => w.id === s.selection!.id) : undefined))
