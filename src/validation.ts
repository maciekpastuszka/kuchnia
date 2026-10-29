import { HOB, SINK, counterTop, isBaseCabinet } from './catalog'
import { boxContains, boxInside, itemBox } from './geometry'
import type { Item, Settings } from './types'

/** Uwagi montażowe dla zaznaczonego mebla. */
export function itemWarnings(item: Item, items: Item[], s: Settings): string[] {
  const out: string[] = []
  const box = itemBox(item, s)
  const center = { x: item.x, y: item.y }

  if (item.type === 'hob' || item.type === 'sink') {
    const name = item.type === 'hob' ? 'Płyta' : 'Zlew'
    const counter = items.find((o) => o.type === 'countertop' && boxInside(box, itemBox(o, s)))
    if (!counter) out.push(`${name} nie leży w całości na blacie.`)
    const cab = items.find((o) => isBaseCabinet(o.type) && boxContains(itemBox(o, s), center))
    if (!cab) out.push(`${name} nie stoi nad szafką dolną.`)
    else if (cab.width < 80) out.push(`${name} wymaga szafki min. 80 cm (jest ${cab.width} cm).`)
    if (cab && item.type === 'hob' && cab.type === 'base_drawers') {
      const intrusion = HOB.h - 0.4 - s.counterThickness
      out.push(`Płyta wchodzi ok. ${intrusion.toFixed(1).replace('.', ',')} cm w korpus: górna szuflada musi być niska.`)
    }
    if (cab && item.type === 'hob' && cab.width < 90) out.push('Pod płytę 78 cm zalecana szafka 90 cm.')
    if (cab && item.type === 'sink' && cab.type === 'base_drawers') {
      if ((cab.drawers ?? 3) > 1) out.push('Pod zlewem tylko 1 szuflada – wyższe szuflady weszłyby w komorę i syfon.')
      else {
        const bowlBottom = counterTop(s) - s.counterThickness - SINK.bowlH
        out.push(`Szuflada zlewowa: skrzynka z wycięciem U na syfon, z tyłu niższa – dno komory na ${bowlBottom} cm od podłogi.`)
      }
    }
  }

  if (item.type === 'filler' && item.width < 5)
    out.push('Blenda węższa niż 5 cm: przy narożniku uchwyty szuflad mogą uderzać w prostopadłe fronty – przy ścianie nie ma to znaczenia.')
  if (item.type === 'base_door' && item.width > 100) out.push('Szafka szersza niż 100 cm – rozważ podział na dwie.')
  if (item.type === 'base_drawers' && item.width > 100) out.push('Szuflady szersze niż 100 cm – sprawdź nośność prowadnic.')
  if (item.type === 'shallow_column' && item.width > 60) out.push('Płytki słupek szerszy niż 60 cm – półki 18 mm mogą się uginać.')
  return out
}
