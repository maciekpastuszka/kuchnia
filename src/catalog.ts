import type { Item, ItemType, Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  ceilingHeight: 270,
  plinthHeight: 10,
  baseCarcassHeight: 78,
  baseCarcassDepth: 51,
  counterThickness: 2,
  counterDepth: 60,
  counterOverhang: 2,
  boardThickness: 1.8,
  frontThickness: 1.8,
  frontGap: 0.3,
  frontSideGap: 0.2,
  ovenColumnDepth: 51,
  shallowLowerFront: 205.9,
  shallowFloorGap: 1,
  shallowWallGap: 1,
  tipOnGap: 0.3,
  shallowTopBlend: 12,
  vanityTop: 85,
  wallCabinetBottom: 148,
  wallCabinetDepth: 35,
  wallGripGap: 2,
  ceilingGap: 2,
  frontMaterial: 'denim',
  carcassMaterial: 'denim',
  baseFrontMaterial: 'casella',
  baseCarcassMaterial: 'casella',
  stoneColor: 'white',
  handleColor: 'bordo',
  wallsTransparent: false,
  showDims: true,
}

/** Amica PC7511FT – wymiary z karty produktu, wycięcie wg e-katalog (do potwierdzenia w instrukcji). */
export const HOB = { w: 77, d: 51.8, h: 4.8, cutW: 75.3, cutD: 49 }
/** Franke Box BXX 210/110-68 – montaż podwieszany. */
export const SINK = { w: 72.5, d: 45, bowlW: 68.5, bowlD: 41, bowlH: 20 }
/** Amica EED37671BA – 59,5 × 59,5 × 57, wnęka 60 cm wysokości. */
export const OVEN = { w: 59.5, h: 59.5, d: 57, nicheH: 60 }
export const OVEN_COLUMN_WIDTH = 60
/** Lodówka wolnostojąca – domyślne wymiary. */
export const FRIDGE = { w: 60, d: 65, h: 200 }
export const SHALLOW_DEPTH = 24
/** Wysokość najwyższej szuflady w zestawie 3 szuflad. */
export const TOP_DRAWER_FRONT = 18.5

export const counterTop = (s: Settings) => s.plinthHeight + s.baseCarcassHeight + s.counterThickness
export const baseTop = (s: Settings) => s.plinthHeight + s.baseCarcassHeight
export const baseDepth = (s: Settings) => s.baseCarcassDepth + s.frontThickness
/** Luz za korpusem szafki dolnej, wynikający z głębokości blatu i wysięgu przed fronty. */
export const baseWallGap = (s: Settings) => Math.max(0, s.counterDepth - baseDepth(s) - s.counterOverhang)
/** Linia podziału płytkich słupków: szczelina nad podłogą + dolny front + pół szczeliny między frontami. */
/** Góra górnego korpusu płytkich słupków – nad nim blenda `shallowTopBlend` do sufitu. */
export const shallowUpperTop = (s: Settings) => s.ceilingHeight - s.shallowTopBlend
export const shallowSplit = (s: Settings) => s.shallowFloorGap + s.shallowLowerFront + s.frontGap / 2
/** Szafka górna: front i spód płyty pod szafką na `wallCabinetBottom`, korpus stoi na płycie. */
export const wallCarcassBottom = (s: Settings) => s.wallCabinetBottom + s.boardThickness
/** Płyta pod szafkami górnymi: głębokość korpusu minus cofnięcie za tył frontów. */
export const wallPanelDepth = (s: Settings) => s.wallCabinetDepth - s.frontThickness - s.wallGripGap
export const ovenNicheTop = (s: Settings) => baseTop(s) + OVEN.nicheH

export interface CatalogEntry {
  key: string
  type: ItemType
  label: string
  hint: string
  defaults: Partial<Item>
}

export const CATALOG: CatalogEntry[] = [
  { key: 'drawers', type: 'base_drawers', label: 'Szafka dolna – 3 szuflady', hint: 'standard 60 cm, pod płytą 90 cm', defaults: { width: 60, drawers: 3 } },
  { key: 'door', type: 'base_door', label: 'Szafka dolna z drzwiczkami', hint: 'do 60 cm jedne drzwi, szersza dwoje', defaults: { width: 60, hinge: 'L' } },
  { key: 'sinkcab', type: 'base_drawers', label: 'Szafka zlewowa 80 – 1 szuflada', hint: 'wycięcie U na syfon, Franke min. 80 cm', defaults: { width: 80, drawers: 1 } },
  { key: 'dishwasher', type: 'dishwasher', label: 'Zmywarka do zabudowy', hint: 'pełna zabudowa, wnęka 88 cm = XXL', defaults: { width: 60 } },
  { key: 'corner', type: 'base_corner', label: 'Szafka narożna L 90×90', hint: 'drzwi łamane', defaults: { width: 90 } },
  { key: 'blind', type: 'base_blind_corner', label: 'Szafka narożna – ślepy narożnik', hint: 'korpus 90: blenda 40 + drzwiczki 49,6', defaults: { width: 90, blindSide: 'L', blindWidth: 40, hinge: 'R' } },
  { key: 'filler', type: 'filler', label: 'Blenda', hint: 'wypełnienie przy narożniku lub ścianie, od 0,5 cm', defaults: { width: 7 } },
  { key: 'counter', type: 'countertop', label: 'Blat konglomerat 2 cm', hint: 'głębokość 60 cm', defaults: { width: 120 } },
  { key: 'hob', type: 'hob', label: 'Płyta Amica PC7511FT', hint: '77 × 51,8 cm, wycięcie 75,3 × 49', defaults: {} },
  { key: 'sink', type: 'sink', label: 'Zlew Franke BXX 210/110-68', hint: 'podwieszany, komora 68,5 × 41', defaults: {} },
  { key: 'oven', type: 'oven_column', label: 'Słupek z piekarnikiem Amica', hint: 'EED37671BA, fronty nakładane, TIP-ON', defaults: { underOvenDoor: true, hinge: 'L' } },
  { key: 'shallow', type: 'shallow_column', label: 'Płytki słupek 24 cm', hint: 'dolna + górna szafka, TIP-ON', defaults: { width: 40, hinge: 'L' } },
  { key: 'vanity1', type: 'vanity', label: 'Szafka podwieszana pod zlew – 1 szuflada', hint: '60 × 46 × 40 cm, wycięcie U na syfon', defaults: { width: 60, depth: 46, height: 40, drawers: 1 } },
  { key: 'vanity2', type: 'vanity', label: 'Szafka podwieszana pod zlew – 2 szuflady', hint: '60 × 46 × 55 cm', defaults: { width: 60, depth: 46, height: 55, drawers: 2 } },
  { key: 'colupper', type: 'column_upper', label: 'Szafka górna słupka', hint: 'osobny element nad słupkiem, TIP-ON', defaults: { width: 40, depth: SHALLOW_DEPTH, upperOf: 'shallow', hinge: 'L' } },
  { key: 'sidepanel', type: 'side_panel', label: 'Płyta boczna do sufitu', hint: 'obok słupka, w licu frontów', defaults: { width: 1.8, depth: 58 } },
  { key: 'wallpanel', type: 'wall_panel', label: 'Płyta pod szafkami górnymi', hint: 'cofnięta za fronty – chwyt od dołu', defaults: { width: 90 } },
  { key: 'wall', type: 'wall_cabinet', label: 'Szafka górna do sufitu', hint: 'gł. 35 cm, chwyt za dolną krawędź frontu', defaults: { width: 60, hinge: 'L' } },
  { key: 'fridge', type: 'fridge', label: 'Lodówka wolnostojąca', hint: '60 × 65 cm, wysokość do ustawienia', defaults: { width: FRIDGE.w, height: FRIDGE.h } },
]

export const TYPE_LABEL: Record<ItemType, string> = {
  base_drawers: 'Szafka szufladowa',
  base_door: 'Szafka z drzwiczkami',
  base_corner: 'Szafka narożna L',
  base_blind_corner: 'Szafka narożna – ślepy narożnik',
  filler: 'Blenda',
  countertop: 'Blat konglomerat',
  hob: 'Płyta ceramiczna Amica PC7511FT',
  sink: 'Zlew Franke Box BXX 210/110-68',
  oven_column: 'Słupek z piekarnikiem',
  shallow_column: 'Płytki słupek',
  wall_cabinet: 'Szafka górna',
  wall_panel: 'Płyta pod szafkami górnymi',
  side_panel: 'Płyta boczna do sufitu',
  column_upper: 'Szafka górna słupka',
  vanity: 'Szafka podwieszana pod zlew',
  dishwasher: 'Zmywarka do zabudowy',
  fridge: 'Lodówka wolnostojąca',
}

export const isBaseCabinet = (t: ItemType) => t === 'base_drawers' || t === 'base_door' || t === 'base_corner' || t === 'base_blind_corner'
/** Meble w materiale szafek dolnych (reszta – słupki i szafki górne – w materiale ogólnym). */
export const usesBaseMaterial = (t: ItemType) => isBaseCabinet(t) || t === 'dishwasher' || t === 'filler' || t === 'vanity'

/** Materiał frontów i korpusu danego mebla. */
export function materialsFor(item: Item, s: Settings) {
  return usesBaseMaterial(item.type)
    ? { front: s.baseFrontMaterial, carcass: s.baseCarcassMaterial }
    : { front: s.frontMaterial, carcass: s.carcassMaterial }
}

export const isOnCounter = (t: ItemType) => t === 'hob' || t === 'sink'
export const hasWidth = (t: ItemType) => t !== 'hob' && t !== 'sink' && t !== 'oven_column' && t !== 'side_panel'

/**
 * Ustawienia widziane przez konkretny mebel: szafka z własną głębokością korpusu liczy wszystko od niej.
 * Luzu za szafką (wallOffset) nie liczymy stąd – zostaje taki jak dla całej kuchni.
 */
export const itemSettings = (item: Item, s: Settings): Settings => (item.carcassDepth ? { ...s, baseCarcassDepth: item.carcassDepth } : s)

/** Obrys w układzie lokalnym: w wzdłuż frontu, d w głąb. */
export function footprint(item: Item, settings: Settings): { w: number; d: number } {
  const s = itemSettings(item, settings)
  switch (item.type) {
    case 'base_drawers':
    case 'base_door':
    case 'base_blind_corner':
    case 'dishwasher':
    case 'filler':
      return { w: item.width, d: baseDepth(s) }
    case 'base_corner':
      return { w: item.width, d: item.width }
    case 'countertop':
      return { w: item.width, d: item.depth }
    case 'hob':
      return { w: HOB.w, d: HOB.d }
    case 'sink':
      return { w: SINK.w, d: SINK.d }
    case 'oven_column':
      // korpus + luz TIP-ON + front
      return { w: OVEN_COLUMN_WIDTH + panelCount(item) * s.boardThickness, d: s.ovenColumnDepth + s.tipOnGap + s.frontThickness }
    case 'shallow_column':
      return { w: item.width, d: item.depth }
    case 'wall_cabinet':
      return { w: item.width, d: s.wallCabinetDepth }
    case 'wall_panel':
      return { w: item.width, d: wallPanelDepth(s) }
    case 'side_panel':
      return { w: s.boardThickness, d: item.depth }
    case 'column_upper':
    case 'vanity':
      return { w: item.width, d: item.depth }
    case 'fridge':
      return { w: item.width, d: FRIDGE.d }
  }
}

/** Liczba skrzydeł: jawnie ustawiona albo 1 do 60 cm, szersze 2. */
export const doorCount = (item: Item): 1 | 2 => item.doors ?? (item.width <= 60 ? 1 : 2)

export const panelCount = (item: Item) => (item.panelLeft ? 1 : 0) + (item.panelRight ? 1 : 0)

/** Odsunięcie pleców od ściany przy przyciąganiu. */
export function wallOffset(item: Item, s: Settings) {
  // słupek z piekarnikiem stoi z tym samym luzem co szafki dolne – fronty w jednej linii, piekarnik wchodzi w luz
  if (isBaseCabinet(item.type) || item.type === 'dishwasher' || item.type === 'filler' || item.type === 'oven_column') return baseWallGap(s)
  // płytkie słupki i ich szafki górne – z zapasem od ściany
  if (item.type === 'shallow_column' || (item.type === 'column_upper' && item.upperOf === 'shallow')) return s.shallowWallGap
  return 0
}

/** Fronty szafek dolnych: o pół szczeliny od dołu i od góry korpusu – z każdej strony tyle samo. */
export const baseFrontRange = (s: Settings): [number, number] => [s.plinthHeight + s.frontGap / 2, s.plinthHeight + s.baseCarcassHeight - s.frontGap / 2]

/** Wysokości frontów od dołu, razem z ich dolną krawędzią. */
export function drawerFronts(count: 1 | 2 | 3, bottom: number, carcassHeight: number, s: Settings) {
  const total = carcassHeight - s.frontGap
  let heights: number[]
  if (count === 3) {
    const rest = (total - TOP_DRAWER_FRONT - 2 * s.frontGap) / 2
    heights = [rest, rest, TOP_DRAWER_FRONT]
  } else if (count === 2) {
    const half = (total - s.frontGap) / 2
    heights = [half, half]
  } else heights = [total]
  let y = bottom
  return heights.map((h) => {
    const f = { y, h }
    y += h + s.frontGap
    return f
  })
}

export function newItem(entry: CatalogEntry, x: number, y: number, s: Settings): Item {
  return {
    id: uid(),
    type: entry.type,
    x,
    y,
    rot: 0,
    width: 60,
    depth: entry.type === 'countertop' ? s.counterDepth : SHALLOW_DEPTH,
    ...entry.defaults,
  }
}

export const uid = () => Math.random().toString(36).slice(2, 9)

/** Obrys samego korpusu (bez frontów, płyt bocznych i blend) w układzie mebla; null dla mebli bez korpusu. */
export function carcassBox(item: Item, settings: Settings): { x0: number; x1: number; z0: number; z1: number } | null {
  const s = itemSettings(item, settings)
  const { w, d } = footprint(item, s)
  const t = s.boardThickness
  const hw = w / 2
  const hd = d / 2
  switch (item.type) {
    case 'base_drawers':
    case 'base_door':
    case 'base_blind_corner':
      return { x0: -hw, x1: hw, z0: -hd, z1: -hd + s.baseCarcassDepth }
    case 'base_corner':
      return { x0: -hw, x1: hw, z0: -hd, z1: hd }
    case 'oven_column': {
      const xL = -hw + (item.panelLeft ? t : 0)
      return { x0: xL, x1: xL + OVEN_COLUMN_WIDTH, z0: -hd, z1: -hd + s.ovenColumnDepth }
    }
    case 'shallow_column':
      return { x0: -hw + (item.panelLeft ? t : 0), x1: hw - (item.panelRight ? t : 0), z0: -hd, z1: hd - s.frontThickness - s.tipOnGap }
    case 'wall_cabinet':
      return { x0: -hw, x1: hw, z0: -hd, z1: hd - s.frontThickness }
    // płyta pod szafkami górnymi – zaznaczona pokazuje swoje wymiary tak jak korpus
    case 'wall_panel':
    case 'side_panel':
      return { x0: -hw, x1: hw, z0: -hd, z1: hd }
    case 'column_upper':
    case 'vanity':
      return { x0: -hw, x1: hw, z0: -hd, z1: hd - s.frontThickness - s.tipOnGap }
    default:
      return null
  }
}

/** Szafka podwieszana pod zlew: od (góra − wysokość) do góry `vanityTop`. */
export function vanityRange(item: Item, s: Settings): [number, number] {
  const h = item.height ?? 40
  return [s.vanityTop - h, s.vanityTop]
}

/**
 * Szafka górna słupka – wysokości od podłogi wynikające z ustawień (te same linie co w audycie):
 * korpus, front (TIP-ON) i opcjonalna blenda/maskownica do sufitu.
 */
export function columnUpperSpec(item: Item, s: Settings) {
  const g = s.frontGap
  const t = s.boardThickness
  const split = shallowSplit(s)
  const C = s.ceilingHeight
  switch (item.upperOf ?? 'shallow') {
    case 'oven_low':
      // nad dolnym korpusem słupka z piekarnikiem; front od góry wnęki – w linii dołu frontów szafek górnych
      return { carcass: [ovenNicheTop(s) + t, split] as R2, front: [ovenNicheTop(s), split - g / 2] as R2, mask: null, maskSideGap: true }
    case 'oven_high': {
      // blenda pod sufitem taka sama jak nad płytkimi słupkami, w jednej linii
      const top = shallowUpperTop(s)
      return { carcass: [split, top] as R2, front: [split + g / 2, top - g] as R2, mask: [top, C] as R2, maskSideGap: false }
    }
    case 'shallow': {
      const top = shallowUpperTop(s)
      // blenda bez szczelin bocznych – w rzędzie płytkich słupków czyta się jak jeden pas
      return { carcass: [split, top] as R2, front: [split + g / 2, top - g] as R2, mask: [top, C] as R2, maskSideGap: false }
    }
  }
}

type R2 = [number, number]

/** Szafki górne dodawane razem ze słupkiem z katalogu (ta sama pozycja i głębokość). */
export function columnCompanions(item: Item, s: Settings): Item[] {
  const upper = (upperOf: Item['upperOf'], width: number, depth: number): Item => ({
    id: uid(),
    type: 'column_upper',
    x: item.x,
    y: item.y,
    rot: item.rot,
    width,
    depth,
    upperOf,
    hinge: item.hinge,
  })
  if (item.type === 'shallow_column') return [upper('shallow', item.width, item.depth)]
  if (item.type === 'oven_column') {
    const d = footprint(item, s).d
    return [upper('oven_low', OVEN_COLUMN_WIDTH, d), upper('oven_high', OVEN_COLUMN_WIDTH, d)]
  }
  return []
}

/** Linie podziału płyty bocznej od podłogi do sufitu: łączenie w linii frontów płytkich słupków i/lub blenda u góry. */
export function sidePanelCuts(item: Item, s: Settings): number[] {
  const cuts = [0]
  if (item.split) cuts.push(shallowSplit(s))
  if (item.topBlend) cuts.push(shallowUpperTop(s))
  cuts.push(s.ceilingHeight)
  return cuts
}

/**
 * Kawałki płyty bocznej [dół, góra] ze szczeliną frontów `frontGap` na każdym łączeniu – w tych samych liniach co fronty
 * płytkich słupków: przy podziale szczelina po połowie z obu stron, przy blendzie cała pod nią (blenda ma pełną wysokość).
 */
export function sidePanelPieces(item: Item, s: Settings): [number, number][] {
  const cuts = sidePanelCuts(item, s)
  const g = s.frontGap
  const blendCut = item.topBlend ? cuts[cuts.length - 2] : null
  return cuts.slice(0, -1).map((a, i) => {
    const b = cuts[i + 1]
    const start = i === 0 || a === blendCut ? a : a + g / 2
    const end = i === cuts.length - 2 ? b : b === blendCut ? b - g : b - g / 2
    return [start, end]
  })
}

/** Zakresy wysokości korpusów od dołu (słupki mają dolny i górny korpus); pusta lista dla mebli bez korpusu. */
export function carcassYRanges(item: Item, s: Settings): [number, number][] {
  const P = s.plinthHeight
  const t = s.boardThickness
  const upperTop = s.ceilingHeight - s.ceilingGap
  switch (item.type) {
    case 'base_drawers':
    case 'base_door':
    case 'base_blind_corner':
    case 'base_corner':
      return [[P, P + s.baseCarcassHeight]]
    case 'oven_column':
      return [[P, ovenNicheTop(s) + t]]
    case 'shallow_column':
      return [[P, shallowSplit(s)]]
    case 'column_upper':
      return [columnUpperSpec(item, s).carcass]
    case 'vanity':
      return [vanityRange(item, s)]
    case 'wall_cabinet':
      return [[wallCarcassBottom(s), upperTop]]
    case 'wall_panel':
      return [[s.wallCabinetBottom, wallCarcassBottom(s)]]
    case 'side_panel': {
      const cuts = sidePanelCuts(item, s)
      return cuts.slice(0, -1).map((a, i) => [a, cuts[i + 1]] as [number, number])
    }
    default:
      return []
  }
}

/** Zakres wysokości mebla od podłogi [dół, góra]. */
export function heightRange(item: Item, s: Settings): [number, number] {
  switch (item.type) {
    case 'countertop':
      return [counterTop(s) - s.counterThickness, counterTop(s)]
    case 'hob':
    case 'sink':
      return [counterTop(s) - 1, counterTop(s) + 2]
    case 'oven_column':
      return [0, ovenNicheTop(s) + s.boardThickness]
    case 'shallow_column':
      return [0, shallowSplit(s)]
    case 'side_panel':
      return [0, s.ceilingHeight]
    case 'column_upper': {
      const u = columnUpperSpec(item, s)
      return [Math.min(u.carcass[0], u.front[0]), u.mask ? u.mask[1] : u.carcass[1]]
    }
    case 'vanity':
      return vanityRange(item, s)
    // szafka górna bez płyty pod nią (płyta to osobny element)
    case 'wall_cabinet':
      return [wallCarcassBottom(s), s.ceilingHeight]
    case 'wall_panel':
      return [s.wallCabinetBottom, wallCarcassBottom(s)]
    case 'fridge':
      return [0, item.height ?? FRIDGE.h]
    default:
      return [0, baseTop(s)]
  }
}

/** Wymiary gabarytowe „szer × gł × wys” (AGD na blacie pomijamy – mają własne opisy). */
export function dimsLabel(item: Item, s: Settings): string | null {
  if (isOnCounter(item.type)) return null
  const { w, d } = footprint(item, s)
  const [y0, y1] = heightRange(item, s)
  return `${fmt(w)} × ${fmt(d)} × ${fmt(y1 - y0)}`
}

export const fmt = (v: number) => (Math.round(v * 10) / 10).toLocaleString('pl-PL')
