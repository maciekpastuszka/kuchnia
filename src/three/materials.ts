import * as THREE from 'three'
import type { BoardMaterial, HandleColor, StoneColor } from '../types'

const loader = new THREE.TextureLoader()

/**
 * Skan dekoru Egger jako tekstura w skali 1:1. UV płyt są w centymetrach / 100 (Panel.tsx),
 * więc `repeat = 100 / wymiar_skanu_w_cm` daje jedną kopię skanu na jego rzeczywisty rozmiar.
 */
function decorScan(file: string, widthCm: number, heightCm: number) {
  const tex = loader.load(`${import.meta.env.BASE_URL}textures/${file}`)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.repeat.set(100 / widthCm, 100 / heightCm)
  return tex
}

const cache = new Map<string, THREE.Material>()

const cached = (key: string, make: () => THREE.Material) => {
  let m = cache.get(key)
  if (!m) cache.set(key, (m = make()))
  return m
}

export const BOARD_LABEL: Record<BoardMaterial, string> = {
  denim: 'Egger U540 niebieski denim',
  casella: 'Egger H1386 dąb Casella brązowy',
  white: 'Biały',
  grey: 'Szary jasny',
}

/** U540 na zdjęciu realizacji: fronty #8aa9bf / #83a0b8, oświetlony bok #b5c9d7. */
const DENIM_PHOTO = '#86a5bc'

/** Kolor próbek (rzut, panel): denim ze zdjęcia, dąb – średnia skanu. */
export const BOARD_SWATCH: Record<BoardMaterial, string> = {
  denim: DENIM_PHOTO,
  casella: '#906c4e',
  white: '#f1f0ec',
  grey: '#c9c9c6',
}

export function boardMaterial(kind: BoardMaterial) {
  return cached(`board:${kind}`, () => {
    // H1386 ST40 – skan całej płyty 130 × 280 cm, słoje pionowo; ST40 to matowa struktura z porami
    if (kind === 'casella') return new THREE.MeshStandardMaterial({ map: decorScan('egger-h1386-st40-dab-casella-brazowy.jpg', 130, 280), roughness: 0.75 })
    // U540 ST9 Smoothtouch Matt – gładki uni; kolor wzięty ze zdjęcia frontów (skan Egger jest wyraźnie bardziej szary)
    if (kind === 'denim') return new THREE.MeshStandardMaterial({ color: DENIM_PHOTO, roughness: 0.85 })
    return new THREE.MeshStandardMaterial({ color: BOARD_SWATCH[kind], roughness: 0.75 })
  })
}

export const STONE_LABEL: Record<StoneColor, string> = {
  white: 'Biały',
  grey: 'Szary',
  black: 'Czarny',
  beige: 'Beżowy',
}

const STONE_COLOR: Record<StoneColor, string> = {
  white: '#eeece8',
  grey: '#9a9a97',
  black: '#26272a',
  beige: '#d9cdb8',
}

export const stoneMaterial = (c: StoneColor) => cached(`stone:${c}`, () => new THREE.MeshStandardMaterial({ color: STONE_COLOR[c], roughness: 0.35 }))

/** Uchwyty: seria „Kolory Płaskie” (ZnAl, lakier gładki) oraz stal i czerń. */
export const HANDLE_LABEL: Record<HandleColor, string> = {
  bordo: 'Płaski owalny 96 – bordo',
  granat: 'Płaski owalny 96 – granat',
  roz: 'Płaski owalny 96 – róż',
  kaszmir: 'Płaski owalny 96 – kaszmir',
  steel: 'Płaski owalny 96 – stal',
  black: 'Płaski owalny 96 – czarny',
}

const HANDLE_COLOR: Record<HandleColor, string> = {
  bordo: '#5a2a30',
  granat: '#27324a',
  roz: '#d8a9a6',
  kaszmir: '#c9b9a5',
  steel: '#c8cacc',
  black: '#1d1d1f',
}

export const handleMaterial = (c: HandleColor) =>
  cached(`handle:${c}`, () =>
    c === 'steel'
      ? new THREE.MeshStandardMaterial({ color: HANDLE_COLOR.steel, metalness: 0.9, roughness: 0.3 })
      : new THREE.MeshStandardMaterial({ color: HANDLE_COLOR[c], metalness: 0.15, roughness: 0.45 }),
  )

export const MAT = {
  steel: () => cached('steel', () => new THREE.MeshStandardMaterial({ color: '#c4c7ca', metalness: 0.85, roughness: 0.32, side: THREE.DoubleSide })),
  glass: () => cached('glass', () => new THREE.MeshStandardMaterial({ color: '#0d0d0f', metalness: 0.2, roughness: 0.08 })),
  ovenWindow: () => cached('ovenWindow', () => new THREE.MeshStandardMaterial({ color: '#1b1d22', metalness: 0.3, roughness: 0.05 })),
  dark: () => cached('dark', () => new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.6 })),
  ring: () => cached('ring', () => new THREE.MeshBasicMaterial({ color: '#5a5c60' })),
  wall: (transparent: boolean) =>
    cached(`wall:${transparent}`, () => new THREE.MeshStandardMaterial({ color: '#ecebe7', roughness: 0.95, transparent, opacity: transparent ? 0.25 : 1, depthWrite: !transparent })),
  windowFrame: () => cached('windowFrame', () => new THREE.MeshStandardMaterial({ color: '#f4f4f2', roughness: 0.5 })),
  windowGlass: () =>
    cached('windowGlass', () => new THREE.MeshStandardMaterial({ color: '#cfe3f0', metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false })),
  floor: () => cached('floor', () => new THREE.MeshStandardMaterial({ color: '#d8d2c8', roughness: 0.9 })),
  fridge: () => cached('fridge', () => new THREE.MeshStandardMaterial({ color: '#b9bdc1', metalness: 0.6, roughness: 0.35 })),
  drawerBox: () => cached('drawerBox', () => new THREE.MeshStandardMaterial({ color: '#d4d6d9', metalness: 0.3, roughness: 0.5 })),
  hdf: () => cached('hdf', () => new THREE.MeshStandardMaterial({ color: '#e9e7e2', roughness: 0.9 })),
  obstacle: () => cached('obstacle', () => new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.6 })),
  /** Przeszkoda widziana przez meble – półprzezroczysta, bez testu głębi. */
  obstacleGhost: () => cached('obstacleGhost', () => new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.6, depthTest: false, depthWrite: false })),
  selection: () => cached('selection', () => new THREE.MeshBasicMaterial({ color: '#1f6fff', wireframe: true })),
}
