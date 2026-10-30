import { useRef, useState } from 'react'
import { CATALOG, baseWallGap, columnCompanions, counterTop, fmt, newItem } from '../catalog'
import { exampleProject, newRectRoom, useStore } from '../store'
import type { BoardMaterial, HandleColor, Project, Settings, StoneColor } from '../types'
import { BOARD_LABEL, BOARD_SWATCH, HANDLE_LABEL, STONE_LABEL } from '../three/materials'
import { Icon, type IconName } from './icons'
import { NumberField } from './NumberField'

function roomCenter() {
  const { walls } = useStore.getState()
  if (!walls.length) return { x: 150, y: 150 }
  const xs = walls.flatMap((w) => [w.x1, w.x2])
  const ys = walls.flatMap((w) => [w.y1, w.y2])
  return { x: Math.round((Math.min(...xs) + Math.max(...xs)) / 2), y: Math.round((Math.min(...ys) + Math.max(...ys)) / 2) }
}

/** Po wczytaniu projektu dopasowuje rzut i kamerę 3D (po renderze, gdy widoki mają już nowe ściany). */
function afterLoad() {
  window.dispatchEvent(new Event('plan:fit'))
  window.setTimeout(() => window.dispatchEvent(new Event('3d:reset')), 50)
}

type Panel = 'catalog' | 'settings'

const PANELS: { key: Panel; icon: IconName; label: string }[] = [
  { key: 'catalog', icon: 'cabinet', label: 'Dodaj meble' },
  { key: 'settings', icon: 'settings', label: 'Ustawienia' },
]

/** Pasek ikon po lewej; ikona otwiera swój panel, ponowne kliknięcie go zwija. */
export function SideRail() {
  const [open, setOpen] = useState<Panel | null>('catalog')
  return (
    <div className="side">
      <nav className="rail">
        {PANELS.map((p) => (
          <button
            key={p.key}
            className={`rail-btn${open === p.key ? ' active' : ''}`}
            title={p.label}
            aria-label={p.label}
            aria-pressed={open === p.key}
            onClick={() => setOpen(open === p.key ? null : p.key)}
          >
            <Icon name={p.icon} size={20} />
          </button>
        ))}
      </nav>
      {open && <aside className="sidebar">{open === 'catalog' ? <CatalogPanel /> : <SettingsPanel />}</aside>}
    </div>
  )
}

/** Narzędzia ścian w górnym pasku: zaznaczanie, rysowanie, miarka, nowy pokój. */
export function WallTools() {
  const tool = useStore((s) => s.tool)
  const drawThickness = useStore((s) => s.drawThickness)
  const [room, setRoom] = useState({ w: 400, d: 300 })
  const tools: { key: 'select' | 'wall' | 'measure'; icon: IconName; label: string; title?: string }[] = [
    { key: 'select', icon: 'pointer', label: 'Zaznacz' },
    { key: 'wall', icon: 'wall', label: 'Rysuj ściany' },
    { key: 'measure', icon: 'ruler', label: 'Miarka', title: 'M' },
  ]
  return (
    <div className="tool-group">
      <div className="segmented">
        {tools.map((t) => (
          <button key={t.key} className={tool === t.key ? 'active' : ''} title={t.title} onClick={() => useStore.getState().setTool(t.key)}>
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </div>
      {tool === 'wall' && (
        <span className="inline-field">
          <NumberField label="Grubość" value={drawThickness} onChange={(v) => useStore.getState().setDrawThickness(v)} min={1} />
        </span>
      )}
      <details className="dropdown">
        <summary className="button">
          <Icon name="room" size={16} />
          Nowy pokój
        </summary>
        <div className="dropdown-panel">
          <NumberField label="Szerokość (wewn.)" value={room.w} onChange={(w) => setRoom({ ...room, w })} min={50} />
          <NumberField label="Głębokość (wewn.)" value={room.d} onChange={(d) => setRoom({ ...room, d })} min={50} />
          <button
            onClick={(e) => {
              if (confirm('Utworzyć nowy pokój? Obecne ściany i meble zostaną usunięte (można cofnąć Ctrl+Z).')) {
                newRectRoom(room.w, room.d)
                afterLoad()
                e.currentTarget.closest('details')?.removeAttribute('open')
              }
            }}
          >
            Utwórz pokój prostokątny
          </button>
        </div>
      </details>
    </div>
  )
}

function CatalogPanel() {
  return (
    <section>
      <h3>Dodaj meble</h3>
      <div className="catalog">
        {CATALOG.map((e) => (
          <button
            key={e.key}
            className="catalog-item"
            onClick={() => {
              const c = roomCenter()
              const st = useStore.getState()
              const added = newItem(e, c.x, c.y, st.settings)
              st.addItem(added)
              // słupki dostają od razu swoje szafki górne (osobne elementy); zaznaczony zostaje słupek
              for (const companion of columnCompanions(added, st.settings)) useStore.setState((x) => ({ items: [...x.items, companion] }))
            }}
          >
            <strong>{e.label}</strong>
            <span>{e.hint}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function SettingsPanel() {
  const s = useStore((st) => st.settings)
  const set = (patch: Partial<Settings>) => useStore.getState().updateSettings(patch)
  return (
    <section>
      <h3>Ustawienia</h3>
      <NumberField label="Wysokość sufitu" value={s.ceilingHeight} onChange={(v) => set({ ceilingHeight: v })} min={200} />
      <NumberField label="Cokół" value={s.plinthHeight} onChange={(v) => set({ plinthHeight: v })} min={0} />
      <NumberField label="Korpus dolny – wysokość" value={s.baseCarcassHeight} onChange={(v) => set({ baseCarcassHeight: v })} min={40} />
      <NumberField label="Korpus dolny – głębokość" value={s.baseCarcassDepth} onChange={(v) => set({ baseCarcassDepth: v })} min={20} />
      <NumberField label="Blat – głębokość" value={s.counterDepth} onChange={(v) => set({ counterDepth: v })} min={30} />
      <NumberField label="Słupek z piekarnikiem – głębokość korpusu" value={s.ovenColumnDepth} onChange={(v) => set({ ovenColumnDepth: v })} min={40} step={0.1} />
      <NumberField label="Front węższy z boku (na stronę)" value={s.frontSideGap} onChange={(v) => set({ frontSideGap: v })} min={0} step={0.05} />
      <NumberField label="Blat przed frontem" value={s.counterOverhang} onChange={(v) => set({ counterOverhang: v })} min={0} step={0.5} />
      <p className="derived">
        Blat na wysokości <b>{fmt(counterTop(s))} cm</b>, luz za szafką dolną <b>{fmt(baseWallGap(s))} cm</b>
      </p>
      <NumberField label="Szafki górne – dół frontu od podłogi" value={s.wallCabinetBottom} onChange={(v) => set({ wallCabinetBottom: v })} min={100} />
      <NumberField label="Szafki górne – głębokość" value={s.wallCabinetDepth} onChange={(v) => set({ wallCabinetDepth: v })} min={15} />
      <NumberField label="Szafki górne – płyta cofnięta za front" value={s.wallGripGap} onChange={(v) => set({ wallGripGap: v })} min={0} step={0.5} />
      <p className="derived">
        Spód szafek górnych <b>{fmt(s.wallCabinetBottom - counterTop(s))} cm</b> nad blatem
      </p>
      <NumberField label="Płytkie słupki – dolny front" value={s.shallowLowerFront} onChange={(v) => set({ shallowLowerFront: v })} min={30} step={0.1} />
      <NumberField label="Płytkie słupki – blenda pod sufitem" value={s.shallowTopBlend} onChange={(v) => set({ shallowTopBlend: v })} min={0} step={0.5} />
      <NumberField label="Płytkie słupki – szczelina nad podłogą" value={s.shallowFloorGap} onChange={(v) => set({ shallowFloorGap: v })} min={0} step={0.1} />
      <NumberField label="Płytkie słupki – zapas od ściany" value={s.shallowWallGap} onChange={(v) => set({ shallowWallGap: v })} min={0} step={0.1} />
      <NumberField label="TIP-ON – luz między frontem a korpusem" value={s.tipOnGap} onChange={(v) => set({ tipOnGap: v })} min={0} step={0.05} />
      <p className="derived">
        Dolny front od {fmt(s.shallowFloorGap)} do <b>{fmt(s.shallowFloorGap + s.shallowLowerFront)} cm</b> od podłogi
      </p>
      <NumberField label="Szafka podwieszana – góra od podłogi" value={s.vanityTop} onChange={(v) => set({ vanityTop: v })} min={30} />
      <NumberField label="Maskownica pod sufitem" value={s.ceilingGap} onChange={(v) => set({ ceilingGap: v })} min={0} step={0.5} />

      <label className="field">
        <span>Szafki dolne – fronty</span>
        <BoardSelect value={s.baseFrontMaterial} onChange={(v) => set({ baseFrontMaterial: v })} />
      </label>
      <label className="field">
        <span>Szafki dolne – korpusy</span>
        <BoardSelect value={s.baseCarcassMaterial} onChange={(v) => set({ baseCarcassMaterial: v })} />
      </label>
      <label className="field">
        <span>Słupki i szafki górne – fronty, płyty boczne</span>
        <BoardSelect value={s.frontMaterial} onChange={(v) => set({ frontMaterial: v })} />
      </label>
      <label className="field">
        <span>Słupki i szafki górne – korpusy</span>
        <BoardSelect value={s.carcassMaterial} onChange={(v) => set({ carcassMaterial: v })} />
      </label>
      <label className="field">
        <span>Blat (konglomerat)</span>
        <select value={s.stoneColor} onChange={(e) => set({ stoneColor: e.target.value as StoneColor })}>
          {Object.entries(STONE_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Uchwyty</span>
        <select value={s.handleColor} onChange={(e) => set({ handleColor: e.target.value as HandleColor })}>
          {Object.entries(HANDLE_LABEL).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input type="checkbox" checked={s.wallsTransparent} onChange={(e) => set({ wallsTransparent: e.target.checked })} />
        Ściany półprzezroczyste w 3D
      </label>
      <label className="check">
        <input type="checkbox" checked={s.showDims} onChange={(e) => set({ showDims: e.target.checked })} />
        Pokaż wymiary mebli (szer × gł × wys)
      </label>
    </section>
  )
}

function BoardSelect({ value, onChange }: { value: BoardMaterial; onChange: (v: BoardMaterial) => void }) {
  return (
    <span className="board-select">
      <i style={{ background: BOARD_SWATCH[value] }} />
      <select value={value} onChange={(e) => onChange(e.target.value as BoardMaterial)}>
        {Object.entries(BOARD_LABEL).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
    </span>
  )
}

/** Zapis, wczytanie i przykład – w górnym pasku po prawej. */
export function ProjectMenu() {
  const fileRef = useRef<HTMLInputElement>(null)
  const exportJson = () => {
    const { walls, items, settings } = useStore.getState()
    const blob = new Blob([JSON.stringify({ walls, items, settings }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'kuchnia-projekt.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const importJson = async (file: File) => {
    try {
      const p = JSON.parse(await file.text()) as Project
      if (!Array.isArray(p.walls) || !Array.isArray(p.items)) throw new Error('brak ścian lub mebli')
      useStore.getState().loadProject(p)
      afterLoad()
    } catch (err) {
      alert(`Nie udało się wczytać pliku: ${(err as Error).message}`)
    }
  }
  return (
    <div className="tool-group" title="Projekt zapisuje się automatycznie w przeglądarce">
      <button onClick={exportJson} title="Pobierz projekt jako plik JSON">
        <Icon name="save" size={16} />
        Zapisz
      </button>
      <button onClick={() => fileRef.current?.click()} title="Wczytaj projekt z pliku JSON">
        <Icon name="open" size={16} />
        Wczytaj
      </button>
      <button
        title="Wczytaj przykładową kuchnię (Z)"
        onClick={() => {
          if (!confirm('Wczytać przykładową kuchnię? Obecny projekt zostanie zastąpiony (można cofnąć Ctrl+Z).')) return
          useStore.getState().loadProject(exampleProject())
          afterLoad()
        }}
      >
        <Icon name="home" size={16} />
        Przykład
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
    </div>
  )
}
