/** Proste ikony liniowe 20×20, kolor z `currentColor`. */
const paths = {
  cabinet: 'M4 3h12v14H4zM4 10h12M8 6.5h4M8 13.5h4',
  plus: 'M10 4v12M4 10h12',
  settings:
    'M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM10 2v2.2M10 15.8V18M4.3 4.3l1.6 1.6M14.1 14.1l1.6 1.6M2 10h2.2M15.8 10H18M4.3 15.7l1.6-1.6M14.1 5.9l1.6-1.6',
  pointer: 'M5 3l10 6.5-4.6 1.1L8.5 15z',
  wall: 'M3 16V4h4v8h10v4z',
  ruler: 'M2.5 13.5l11-11 4 4-11 11zM6 10l1.5 1.5M8.5 7.5l1.5 1.5M11 5l1.5 1.5',
  room: 'M3 3h14v14H3zM3 3l3 3M17 3l-3 3M17 17l-3-3M3 17l3-3',
  undo: 'M7 5L3 9l4 4M3 9h9a5 5 0 0 1 0 10h-2',
  redo: 'M13 5l4 4-4 4M17 9H8a5 5 0 0 0 0 10h2',
  save: 'M10 3v9M6 8l4 4 4-4M4 15h12',
  open: 'M10 13V4M6 8l4-4 4 4M4 15h12',
  home: 'M3 9.5L10 4l7 5.5M5 8v8h10V8',
  maximize: 'M12 3h5v5M8 17H3v-5M17 3l-6 6M3 17l6-6',
  restore: 'M16 4l-5 5M11 5v4h4M4 16l5-5M9 15v-4H5',
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}
