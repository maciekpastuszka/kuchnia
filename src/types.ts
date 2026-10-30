/** Wszystkie wymiary w centymetrach. Rzut: x w prawo, y w dół ekranu. W 3D: X = x, Z = y, Y w górę. */

export interface Wall {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  thickness: number
  /** Narysowana linia to lico ściany od strony pokoju; grubość idzie na bok `side` (1 = lewa normalna, -1 = prawa). */
  side: 1 | -1
  windows?: WallWindow[]
}

/** Okno w ścianie – otwór na całą grubość. */
export interface WallWindow {
  id: string
  /** Od początku ściany (x1, y1) wzdłuż lica do bliższej krawędzi otworu. */
  offset: number
  width: number
  /** Wysokość parapetu (dolnej krawędzi otworu) od podłogi. */
  sill: number
  height: number
}

export type ItemType =
  | 'base_drawers'
  | 'base_door'
  | 'base_corner'
  | 'base_blind_corner'
  | 'filler'
  | 'countertop'
  | 'hob'
  | 'sink'
  | 'oven_column'
  | 'shallow_column'
  | 'wall_cabinet'
  | 'wall_panel'
  | 'side_panel'
  | 'column_upper'
  | 'vanity'
  | 'dishwasher'
  | 'fridge'

/** Obrót co 90°: 0 = front w dół rzutu (plecy przy górnej ścianie), 1 = front w lewo, 2 = w górę, 3 = w prawo. */
export type Rot = 0 | 1 | 2 | 3

export interface Item {
  id: string
  type: ItemType
  /** Środek obrysu na rzucie. */
  x: number
  y: number
  rot: Rot
  width: number
  /** Używane przez blat i płytkie słupki; reszta liczy głębokość z ustawień. */
  depth: number
  hinge?: 'L' | 'R'
  /** Liczba skrzydeł drzwi; brak = 1 do 60 cm, szersze 2. */
  doors?: 1 | 2
  /** Szafka dolna: własna głębokość korpusu (np. pod płytszym blatem); brak = z ustawień. */
  carcassDepth?: number
  /** Wysokość lodówki wolnostojącej / szafki podwieszanej. */
  height?: number
  /** Liczba szuflad (szafka szufladowa, słupek z piekarnikiem). */
  drawers?: 1 | 2 | 3
  /** Ślepy narożnik: po której stronie (patrząc na front) jest blenda zakrywająca martwą część. */
  blindSide?: 'L' | 'R'
  /** Ślepy narożnik: szerokość blendy. */
  blindWidth?: number
  /** Słupek z piekarnikiem: pod piekarnikiem drzwiczki zamiast szuflad. */
  underOvenDoor?: boolean
  /** Szafka górna słupka: nad czym stoi – wysokości korpusu, frontu i blendy wynikają z ustawień. */
  upperOf?: UpperOf
  panelLeft?: boolean
  panelRight?: boolean
  /** Płyta boczna z dwóch kawałków, łączenie w linii szczeliny frontów płytkich słupków. */
  panelSplitLeft?: boolean
  panelSplitRight?: boolean
  /** Płyta boczna z dwóch kawałków, łączenie w linii szczeliny frontów płytkich słupków. */
  split?: boolean
  /** Płyta boczna niższa o blendę nad płytkimi słupkami, a nad nią ta sama blenda. */
  topBlend?: boolean
}

/** Szafka górna słupka: nad płytkim słupkiem, nad piekarnikiem (dolna) albo pod sufitem nad nią (górna). */
export type UpperOf = 'shallow' | 'oven_low' | 'oven_high'

export type BoardMaterial = 'denim' | 'casella' | 'white' | 'grey'
export type StoneColor = 'white' | 'grey' | 'black' | 'beige'
export type HandleColor = 'bordo' | 'granat' | 'roz' | 'kaszmir' | 'steel' | 'black'

export interface Settings {
  ceilingHeight: number
  plinthHeight: number
  baseCarcassHeight: number
  baseCarcassDepth: number
  counterThickness: number
  counterDepth: number
  /** Ile blat wystaje przed lico frontu. Luz za szafką = blat − korpus − front − wysięg. */
  counterOverhang: number
  boardThickness: number
  frontThickness: number
  /** Szczelina pionowa między frontami jeden nad drugim. */
  frontGap: number
  /** O ile front jest węższy od swojej części korpusu z każdego boku. */
  frontSideGap: number
  /** Głębokość korpusu słupka z piekarnikiem (bez luzu TIP-ON i frontu). */
  ovenColumnDepth: number
  /** Wysokość dolnego frontu płytkich słupków – z niej wynika podział na dolny i górny korpus. */
  shallowLowerFront: number
  /** Szczelina między podłogą a dolnym frontem płytkich słupków (front schodzi przed cokół). */
  shallowFloorGap: number
  /** Zapas między plecami płytkich słupków a ścianą. */
  shallowWallGap: number
  /** Luz między tyłem frontu TIP-ON a korpusem – front musi dać się wcisnąć, żeby się otworzył. */
  tipOnGap: number
  /** Blenda pod sufitem nad płytkimi słupkami (dochodzi do boku słupka z piekarnikiem). */
  shallowTopBlend: number
  /** Szafka podwieszana pod zlew: góra szafki od podłogi. */
  vanityTop: number
  /** Dolna krawędź szafek górnych od podłogi. */
  wallCabinetBottom: number
  /** Głębokość szafek górnych razem z frontem. */
  wallCabinetDepth: number
  /** O ile płyta pod szafką jest cofnięta za tył frontu – miejsce na palce do chwytu za dolną krawędź frontu. */
  wallGripGap: number
  /** Maskownica między górnym korpusem słupka a sufitem. */
  ceilingGap: number
  /** Słupki i szafki górne. */
  frontMaterial: BoardMaterial
  carcassMaterial: BoardMaterial
  /** Szafki dolne (szuflady, drzwiczki, narożniki, front zmywarki, blendy). */
  baseFrontMaterial: BoardMaterial
  baseCarcassMaterial: BoardMaterial
  stoneColor: StoneColor
  handleColor: HandleColor
  wallsTransparent: boolean
  showDims: boolean
}

export interface Project {
  walls: Wall[]
  items: Item[]
  settings: Settings
}

export type Selection = { kind: 'item'; id: string } | { kind: 'wall'; id: string } | null
