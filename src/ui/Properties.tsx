import {
  HOB,
  OVEN,
  OVEN_COLUMN_WIDTH,
  SINK,
  TYPE_LABEL,
  baseDepth,
  baseWallGap,
  baseTop,
  counterTop,
  doorCount,
  drawerFronts,
  FRIDGE,
  fmt,
  footprint,
  hasWidth,
  ovenNicheTop,
  shallowSplit,
  columnUpperSpec,
  vanityRange,
  sidePanelPieces,
  wallCarcassBottom,
  wallPanelDepth,
  uid,
} from '../catalog'
import { itemBox, wallLength } from '../geometry'
import { useSelectedItem, useSelectedWall, useStore } from '../store'
import type { Item, Settings, UpperOf, Wall, WallWindow } from '../types'
import { itemWarnings } from '../validation'
import { counterItemClearances } from '../clearances'
import { NumberField } from './NumberField'

const BASE_WIDTHS = [30, 40, 45, 50, 60, 80, 90, 100]

const change = (id: string, patch: Partial<Item>) => {
  useStore.getState().checkpoint()
  useStore.getState().updateItem(id, patch)
}

export function Properties() {
  const item = useSelectedItem()
  const wall = useSelectedWall()
  return (
    <aside className="properties">
      {item ? <ItemProps item={item} /> : wall ? <WallProps wall={wall} /> : <Help />}
    </aside>
  )
}

function ItemProps({ item }: { item: Item }) {
  const s = useStore((st) => st.settings)
  const items = useStore((st) => st.items)
  const box = itemBox(item, s)
  const { hx, hy } = { hx: (box.maxX - box.minX) / 2, hy: (box.maxY - box.minY) / 2 }
  const warnings = itemWarnings(item, items, s)
  const front = useStore((st) => st.selectedFront)
  const clearance = counterItemClearances(item, items, s)
  const store = useStore.getState()

  return (
    <section>
      <h3>{TYPE_LABEL[item.type]}</h3>
      <div className="row">
        <button onClick={() => store.rotateSelected(-1)} title="Obróć w lewo (Shift+R)">
          ⟲ 90°
        </button>
        <button onClick={() => store.rotateSelected(1)} title="Obróć w prawo (R)">
          ⟳ 90°
        </button>
        <button onClick={() => store.duplicateSelected()} title="Ctrl+D">
          Duplikuj
        </button>
        <button className="danger" onClick={() => store.removeSelected()} title="Delete">
          Usuń
        </button>
      </div>

      {front && (
        <p className="front-selected">
          Zaznaczony front: <b>{fmt(front.w)} × {fmt(front.h)} × {fmt(front.t)} cm</b>
        </p>
      )}
      <NumberField label="Lewa krawędź (x)" value={box.minX} onChange={(v) => change(item.id, { x: v + hx })} />
      <NumberField label="Górna krawędź (y)" value={box.minY} onChange={(v) => change(item.id, { y: v + hy })} />
      {hasWidth(item.type) && (
        <NumberField
          label={item.type === 'base_corner' ? 'Wymiar ramion' : 'Szerokość'}
          value={item.width}
          // blenda bywa wąska (np. 2 cm przy ścianie), reszta mebli od 10 cm
          min={item.type === 'filler' ? 0.5 : 10}
          step={item.type === 'filler' ? 0.1 : 1}
          options={
            item.type === 'shallow_column'
              ? [30, 35, 40, 45, 50, 60]
              : item.type === 'dishwasher'
                ? [45, 60]
                : item.type === 'base_blind_corner'
                  ? [100, 105, 110, 120]
                  : item.type === 'filler'
                    ? [2, 3, 5, 7, 10]
                : item.type === 'countertop' || item.type === 'fridge'
                  ? undefined
                  : BASE_WIDTHS
          }
          onChange={(v) => change(item.id, { width: v })}
        />
      )}
      {item.type === 'side_panel' && (
        <>
          <NumberField label="Głębokość" value={item.depth} min={5} onChange={(v) => change(item.id, { depth: v })} />
          <label className="check">
            <input type="checkbox" checked={!!item.split} onChange={(e) => change(item.id, { split: e.target.checked })} />Z 2 kawałków (linia frontów płytkich słupków)
          </label>
          <label className="check">
            <input type="checkbox" checked={!!item.topBlend} onChange={(e) => change(item.id, { topBlend: e.target.checked })} />
            Niższa, z blendą na górze (jak nad płytkimi słupkami)
          </label>
        </>
      )}
      {(item.type === 'countertop' || item.type === 'shallow_column') && (
        <NumberField label={item.type === 'shallow_column' ? 'Głębokość z frontem' : 'Głębokość'} value={item.depth} min={10} onChange={(v) => change(item.id, { depth: v })} />
      )}
      {item.type === 'fridge' && (
        <NumberField label="Wysokość" value={item.height ?? FRIDGE.h} min={50} onChange={(v) => change(item.id, { height: v })} />
      )}
      {(item.type === 'base_door' || item.type === 'shallow_column' || item.type === 'wall_cabinet') && (
        <label className="field">
          <span>Drzwi</span>
          <select value={doorCount(item)} onChange={(e) => change(item.id, { doors: Number(e.target.value) as 1 | 2 })}>
            <option value={1}>jedno skrzydło</option>
            <option value={2}>dwa skrzydła</option>
          </select>
        </label>
      )}
      {((item.type === 'base_door' || item.type === 'shallow_column' || item.type === 'wall_cabinet') && doorCount(item) === 1) ||
      item.type === 'base_blind_corner' ||
      (item.type === 'oven_column' && item.underOvenDoor) ? (
        <label className="field">
          <span>Zawiasy</span>
          <select value={item.hinge ?? 'L'} onChange={(e) => change(item.id, { hinge: e.target.value as 'L' | 'R' })}>
            <option value="L">lewe</option>
            <option value="R">prawe</option>
          </select>
        </label>
      ) : null}
      {item.type === 'base_blind_corner' && (
        <>
          <label className="field">
            <span>Blenda po stronie</span>
            <select value={item.blindSide ?? 'L'} onChange={(e) => change(item.id, { blindSide: e.target.value as 'L' | 'R' })}>
              <option value="L">lewej</option>
              <option value="R">prawej</option>
            </select>
          </label>
          <NumberField label="Szerokość blendy" value={item.blindWidth ?? 60} min={10} onChange={(v) => change(item.id, { blindWidth: v })} />
        </>
      )}
      {item.type === 'base_drawers' && (
        <label className="field">
          <span>Szuflady</span>
          <select value={item.drawers ?? 3} onChange={(e) => change(item.id, { drawers: Number(e.target.value) as 1 | 2 | 3 })}>
            <option value={3}>3</option>
            <option value={2}>2</option>
            <option value={1}>1 duża (np. pod zlew)</option>
          </select>
        </label>
      )}
      {item.type === 'oven_column' && (
        <label className="field">
          <span>Pod piekarnikiem</span>
          <select
            value={item.underOvenDoor ? 'door' : String(item.drawers ?? 3)}
            onChange={(e) =>
              change(item.id, e.target.value === 'door' ? { underOvenDoor: true } : { underOvenDoor: false, drawers: Number(e.target.value) as 1 | 2 | 3 })
            }
          >
            <option value="door">drzwiczki</option>
            <option value="3">3 szuflady – w liniach szafek dolnych</option>
            <option value="2">2 szuflady</option>
            <option value="1">1 wysoka szuflada</option>
          </select>
        </label>
      )}
      {item.type === 'vanity' && (
        <>
          <NumberField label="Głębokość" value={item.depth} min={20} onChange={(v) => change(item.id, { depth: v })} />
          <NumberField label="Wysokość szafki" value={item.height ?? 40} min={15} onChange={(v) => change(item.id, { height: v })} />
          <label className="field">
            <span>Szuflady</span>
            <select value={item.drawers === 2 ? 2 : 1} onChange={(e) => change(item.id, { drawers: Number(e.target.value) as 1 | 2 })}>
              <option value={1}>1 (wycięcie U na syfon)</option>
              <option value={2}>2</option>
            </select>
          </label>
        </>
      )}
      {item.type === 'column_upper' && (
        <label className="field">
          <span>Położenie</span>
          <select value={item.upperOf ?? 'shallow'} onChange={(e) => change(item.id, { upperOf: e.target.value as UpperOf })}>
            <option value="shallow">nad płytkim słupkiem (z blendą)</option>
            <option value="oven_low">nad piekarnikiem – dolna</option>
            <option value="oven_high">nad piekarnikiem – górna (z maskownicą)</option>
          </select>
        </label>
      )}
      {(item.type === 'oven_column' || item.type === 'shallow_column') && (
        <div className="row">
          <label className="check">
            <input type="checkbox" checked={!!item.panelLeft} onChange={(e) => change(item.id, { panelLeft: e.target.checked })} />
            Płyta boczna lewa
          </label>
          <label className="check">
            <input type="checkbox" checked={!!item.panelRight} onChange={(e) => change(item.id, { panelRight: e.target.checked })} />
            prawa
          </label>
        </div>
      )}
      {item.type === 'oven_column' && (item.panelLeft || item.panelRight) && (
        <div className="row wrap">
          <span className="muted">Płyta z 2 kawałków (linia frontów słupków):</span>
          {item.panelLeft && (
            <label className="check">
              <input type="checkbox" checked={!!item.panelSplitLeft} onChange={(e) => change(item.id, { panelSplitLeft: e.target.checked })} />
              lewa
            </label>
          )}
          {item.panelRight && (
            <label className="check">
              <input type="checkbox" checked={!!item.panelSplitRight} onChange={(e) => change(item.id, { panelSplitRight: e.target.checked })} />
              prawa
            </label>
          )}
        </div>
      )}

      <ul className="specs">
        {specs(item, s).map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      {clearance && clearance.items.length > 0 && (
        <>
          <h4 className="sub">Odległości</h4>
          <ul className="specs clearances">
            {clearance.items.map((c, i) => (
              <li key={i} className={c.kind}>
                {c.kind === 'cabinet' ? (item.type === 'sink' ? 'Rant zlewu' : 'Korpus płyty') : 'Wycięcie'} → {c.label}: <b>{fmt(c.dist)} cm</b>
              </li>
            ))}
          </ul>
        </>
      )}
      {warnings.length > 0 && (
        <ul className="warnings">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Rozpiska wymiarów do zamówienia. */
function specs(item: Item, s: Settings): string[] {
  const P = s.plinthHeight
  const H = s.baseCarcassHeight
  const t = s.boardThickness
  const sg = s.frontSideGap
  const fp = footprint(item, s)
  const fronts = (count: 1 | 2 | 3, h: number) =>
    drawerFronts(count, P, h, s)
      .map((f) => fmt(f.h))
      .reverse()
      .join(' / ')
  switch (item.type) {
    case 'base_drawers':
      return [
        `Korpus ${fmt(item.width)} × ${fmt(H)} × ${fmt(s.baseCarcassDepth)} cm`,
        `Fronty szuflad (od góry): ${fronts(item.drawers ?? 3, H)} cm`,
        `Cokół ${fmt(P)} cm, blat na ${fmt(counterTop(s))} cm`,
      ]
    case 'base_door':
      return [
        `Korpus ${fmt(item.width)} × ${fmt(H)} × ${fmt(s.baseCarcassDepth)} cm`,
        doorCount(item) === 1 ? `Drzwi ${fmt(item.width - 2 * sg)} × ${fmt(H - s.frontGap)} cm` : `Drzwi 2 × ${fmt(item.width / 2 - 2 * sg)} × ${fmt(H - s.frontGap)} cm`,
      ]
    case 'base_blind_corner': {
      const bw = item.blindWidth ?? 60
      return [
        `Korpus ${fmt(item.width)} × ${fmt(H)} × ${fmt(s.baseCarcassDepth)} cm`,
        `Blenda ${fmt(bw - 2 * sg)} × ${fmt(H - s.frontGap)} cm (stała, po ${item.blindSide === 'R' ? 'prawej' : 'lewej'})`,
        `Drzwi ${fmt(item.width - bw - 2 * sg)} × ${fmt(H - s.frontGap)} cm`,
      ]
    }
    case 'filler':
      return [`Blenda ${fmt(item.width - 2 * sg)} × ${fmt(H - s.frontGap)} cm w linii frontów (szczeliny ${fmt(sg * 10)} mm z boków)`]
    case 'base_corner': {
      const door = item.width - baseDepth(s)
      return [`Korpus L ${fmt(item.width)} × ${fmt(item.width)} × ${fmt(H)} cm`, `Drzwi łamane ok. ${fmt(door)} + ${fmt(door + s.frontThickness)} cm`]
    }
    case 'countertop':
      return [`Konglomerat ${fmt(item.width)} × ${fmt(item.depth)} × ${fmt(s.counterThickness)} cm`, `Wysięg przed fronty ${fmt(s.counterOverhang)} cm`]
    case 'hob':
      return [`Amica PC7511FT ${fmt(HOB.w)} × ${fmt(HOB.d)} × ${fmt(HOB.h)} cm`, `Wycięcie ${HOB.cutW} × ${HOB.cutD} cm (sprawdź w instrukcji)`, 'Zasilanie 400 V, 8,7 kW']
    case 'sink':
      return [`Franke BXX 210/110-68 ${fmt(SINK.w)} × ${fmt(SINK.d)} cm`, `Komora ${fmt(SINK.bowlW)} × ${fmt(SINK.bowlD)} × ${SINK.bowlH} cm`, 'Montaż podwieszany – otwór wg szablonu Franke']
    case 'oven_column': {
      const nTop = ovenNicheTop(s)
      return [
        `Korpus ${OVEN_COLUMN_WIDTH} × ${fmt(nTop + t - P)} × ${fmt(s.ovenColumnDepth)} cm (do góry wnęki piekarnika)`,
        `Plecy wycięte w strefie piekarnika, za korpusem ${fmt(baseWallGap(s))} cm luzu – wnęka razem z luzem ${fmt(s.ovenColumnDepth + baseWallGap(s))} cm (piekarnik ~55)`,
        `Wnęka ${fmt(OVEN_COLUMN_WIDTH - 2 * t)} × ${OVEN.nicheH} cm, piekarnik ${fmt(baseTop(s))}–${fmt(baseTop(s) + OVEN.h)} cm od podłogi`,
        item.underOvenDoor
          ? `Drzwi pod piekarnikiem ${fmt(OVEN_COLUMN_WIDTH - 2 * sg)} × ${fmt(H - s.frontGap)} cm, TIP-ON`
          : `Fronty szuflad (od góry): ${fronts(item.drawers ?? 3, H)} cm`,
        item.panelLeft || item.panelRight ? `Płyty boczne ${fmt(t)} × ${fmt(s.ceilingHeight)} × ${fmt(fp.d)} cm` : 'Fronty nakładane; szafki nad piekarnikiem i płyty boczne to osobne elementy',
      ]
    }
    case 'shallow_column': {
      const inner = item.width - ((item.panelLeft ? t : 0) + (item.panelRight ? t : 0))
      const cd = item.depth - s.frontThickness
      const split = shallowSplit(s)
      return [
        `Korpus ${fmt(inner)} × ${fmt(split - P)} × ${fmt(cd)} cm`,
        `Front TIP-ON ${fmt(s.shallowLowerFront)} cm (od ${fmt(s.shallowFloorGap)} do ${fmt(s.shallowFloorGap + s.shallowLowerFront)} cm nad podłogą)`,
        'Szafka górna z blendą to osobny element',
        `Cokół ${fmt(P)} cm schowany za dolnym frontem`,
        'Przykręcić do ściany (wąski i wysoki)',
      ]
    }
    case 'wall_cabinet': {
      const top = s.ceilingHeight - s.ceilingGap
      const carcassDepth = s.wallCabinetDepth - s.frontThickness
      const door = doorCount(item) === 1 ? fmt(item.width - 2 * sg) : `2 × ${fmt(item.width / 2 - 2 * sg)}`
      return [
        `Korpus ${fmt(item.width)} × ${fmt(top - wallCarcassBottom(s))} × ${fmt(carcassDepth)} cm`,
        `Front ${door} × ${fmt(top - s.frontGap - s.wallCabinetBottom)} cm, schodzi do spodu płyty pod szafkami – chwyt za dolną krawędź`,
        `Dół frontu na ${fmt(s.wallCabinetBottom)} cm – ${fmt(s.wallCabinetBottom - counterTop(s))} cm nad blatem`,
      ]
    }
    case 'side_panel': {
      const pieces = sidePanelPieces(item, s)
      const panels = item.topBlend ? pieces.slice(0, -1) : pieces
      const out = [
        `Płyta ${fmt(t)} × ${fmt(item.depth)} cm, w kolorze frontów słupków`,
        panels.length > 1
          ? `Z ${panels.length} kawałków: ${panels.map(([a, b]) => fmt(b - a)).join(' + ')} cm, łączenie na ${fmt(shallowSplit(s))} cm`
          : `Jeden kawałek ${fmt(panels[0][1] - panels[0][0])} cm`,
      ]
      if (item.topBlend) {
        const [a, b] = pieces[pieces.length - 1]
        out.push(`Blenda nad płytą ${fmt(t)} × ${fmt(item.depth)} × ${fmt(b - a)} cm – w linii blendy nad płytkimi słupkami`)
      }
      return out
    }
    case 'vanity': {
      const [bottom, top] = vanityRange(item, s)
      const count = item.drawers === 2 ? 2 : 1
      return [
        `Korpus ${fmt(item.width)} × ${fmt(top - bottom)} × ${fmt(item.depth - s.frontThickness)} cm, podwieszany`,
        `Od ${fmt(bottom)} do ${fmt(top)} cm nad podłogą`,
        `Fronty szuflad (od góry): ${drawerFronts(count, bottom, top - bottom, s)
          .map((f) => fmt(f.h))
          .reverse()
          .join(' / ')} cm, szer. ${fmt(item.width - 2 * sg)} cm`,
        count === 1 ? 'Szuflada z wycięciem U na syfon' : 'Górna szuflada z wycięciem U na syfon',
      ]
    }
    case 'column_upper': {
      const u = columnUpperSpec(item, s)
      const cd = item.depth - s.frontThickness
      const door = doorCount(item) === 1 ? fmt(item.width - 2 * sg) : `2 × ${fmt(item.width / 2 - 2 * sg)}`
      const out = [
        `Korpus ${fmt(item.width)} × ${fmt(u.carcass[1] - u.carcass[0])} × ${fmt(cd)} cm (od ${fmt(u.carcass[0])} cm)`,
        `Front ${door} × ${fmt(u.front[1] - u.front[0])} cm (od ${fmt(u.front[0])} do ${fmt(u.front[1])} cm), TIP-ON`,
      ]
      if (u.mask)
        out.push(`${u.maskSideGap ? 'Maskownica' : 'Blenda'} ${fmt(u.maskSideGap ? item.width - 2 * sg : item.width)} × ${fmt(u.mask[1] - u.mask[0])} cm do sufitu, szczelina ${fmt((u.mask[0] - u.front[1]) * 10)} mm nad frontem`)
      return out
    }
    case 'wall_panel': {
      return [
        `Płyta ${fmt(item.width)} × ${fmt(wallPanelDepth(s))} × ${fmt(t)} cm`,
        `Cofnięta ${fmt(s.wallGripGap)} cm za tył frontów szafek górnych – miejsce na palce`,
        `Spód na ${fmt(s.wallCabinetBottom)} cm, w linii dolnej krawędzi frontów`,
      ]
    }
    case 'dishwasher':
      return [
        `Wnęka ${fmt(item.width)} × ${fmt(H)} cm (pod blatem ${fmt(s.plinthHeight + H)} cm) – zmywarka XXL 86,5–92 cm`,
        `Front ${fmt(item.width - 2 * sg)} × ${fmt(H - s.frontGap)} cm`,
      ]
    case 'fridge':
      return [`Wolnostojąca ${fmt(item.width)} × ${FRIDGE.d} × ${fmt(item.height ?? FRIDGE.h)} cm`, 'Zostaw ok. 5 cm z boku przy ścianie na otwieranie drzwi']
  }
}

function WallProps({ wall }: { wall: Wall }) {
  const store = useStore.getState()
  return (
    <section>
      <h3>Ściana</h3>
      <NumberField label="Długość" value={wallLength(wall)} min={1} onChange={(v) => store.setWallLength(wall.id, v)} />
      <NumberField
        label="Grubość"
        value={wall.thickness}
        min={1}
        onChange={(v) => {
          store.checkpoint()
          store.updateWall(wall.id, { thickness: v })
        }}
      />
      <div className="row">
        <button
          onClick={() => {
            store.checkpoint()
            store.updateWall(wall.id, { side: wall.side === 1 ? -1 : 1 })
          }}
        >
          Grubość na drugą stronę
        </button>
        <button className="danger" onClick={() => store.removeSelected()}>
          Usuń
        </button>
      </div>
      <p className="derived">Zmiana długości przesuwa koniec ściany razem z dołączoną ścianą. Końce można też przeciągać na rzucie.</p>
      <WallWindowsProps wall={wall} />
    </section>
  )
}

function WallWindowsProps({ wall }: { wall: Wall }) {
  const store = useStore.getState()
  const wins = wall.windows ?? []
  const len = wallLength(wall)
  const set = (windows: WallWindow[]) => {
    store.checkpoint()
    store.updateWall(wall.id, { windows })
  }
  const patch = (id: string, p: Partial<WallWindow>) => set(wins.map((w) => (w.id === id ? { ...w, ...p } : w)))
  const add = () => {
    const width = Math.min(100, len)
    set([...wins, { id: uid(), offset: Math.max(0, (len - width) / 2), width, sill: 90, height: 140 }])
  }
  return (
    <>
      <h3>Okna</h3>
      {wins.map((w, i) => (
        <div key={w.id} className="window-props">
          <p className="derived">
            Okno {i + 1} – położenie liczone od początku ściany (wymiary widać na rzucie)
          </p>
          <NumberField label="Od początku ściany" value={w.offset} min={0} step={0.1} onChange={(v) => patch(w.id, { offset: v })} />
          <NumberField label="Szerokość" value={w.width} min={1} step={0.1} onChange={(v) => patch(w.id, { width: v })} />
          <NumberField label="Parapet od podłogi" value={w.sill} min={0} step={0.1} onChange={(v) => patch(w.id, { sill: v })} />
          <NumberField label="Wysokość" value={w.height} min={1} step={0.1} onChange={(v) => patch(w.id, { height: v })} />
          <div className="row">
            <button className="danger" onClick={() => set(wins.filter((o) => o.id !== w.id))}>
              Usuń okno
            </button>
          </div>
        </div>
      ))}
      <div className="row">
        <button onClick={add}>+ Dodaj okno</button>
      </div>
    </>
  )
}

function Help() {
  const gap = useStore((st) => baseWallGap(st.settings))
  return (
    <section className="help">
      <h3>Jak używać</h3>
      <ul>
        <li>
          <b>Rysuj ściany</b>: klikaj kolejne narożniki, wpisz liczbę i Enter, żeby podać dokładną długość.
        </li>
        <li>Narysowana linia to lico ściany od strony kuchni.</li>
        <li>Meble dodasz z panelu „Dodaj meble” (ikona po lewej), a potem przeciągniesz je na rzucie. Przyciągają się do ścian (z luzem {fmt(gap)} cm za szafkami dolnymi) i do siebie nawzajem.</li>
        <li>
          <kbd>R</kbd> / <kbd>Shift+R</kbd> – obrót o 90°, <kbd>Del</kbd> – usuń, <kbd>Ctrl+D</kbd> – duplikuj, strzałki – przesuń o 1 cm (z Shift o 10 cm).
        </li>
        <li>
          <kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Shift+Z</kbd> – cofnij / ponów.
        </li>
        <li>Rzut przesuwasz, ciągnąc puste miejsce, a przybliżasz kółkiem myszy.</li>
      </ul>
    </section>
  )
}
