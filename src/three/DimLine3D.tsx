import { Html, Line } from '@react-three/drei'
import { fmt } from '../catalog'

type V3 = [number, number, number]

const RED = '#e11d48'
/** Fronty, blendy i płyty boczne – zielone, żeby odróżniały się od wymiarów korpusu. */
const GREEN = '#16a34a'
/** Kolejność warstw etykiet HTML w 3D: wymiary zaznaczenia zawsze nad etykietami frontów i gabarytów. */
export const Z_DIMS: [number, number] = [2_000_000_000, 1_999_000_000]
export const Z_FRONTS: [number, number] = [1_000_000, 500_000]
export const Z_LABELS: [number, number] = [100_000, 0]
/** Linie wymiarowe rysowane na końcu, nad całą sceną. */
const ON_TOP = 10_000

/**
 * Odcinek wymiarowy w 3D: linia od–do, kreski na końcach (w kierunku `tick`) i liczba na środku.
 * Czerwony dla korpusu, zielony (`front`) dla frontów, blend i płyt bocznych.
 * Rysowany bez testu głębokości, żeby był widoczny także przez blat i fronty.
 */
export function DimLine3D({ from, to, tick, value, front }: { from: V3; to: V3; tick: V3; value: number; front?: boolean }) {
  const color = front ? GREEN : RED
  const ends = [from, to].map((p) => [
    [p[0] - tick[0], p[1] - tick[1], p[2] - tick[2]] as V3,
    [p[0] + tick[0], p[1] + tick[1], p[2] + tick[2]] as V3,
  ])
  const mid: V3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]
  return (
    <group>
      <Line points={[from, to]} color={color} lineWidth={2.5} depthTest={false} depthWrite={false} transparent renderOrder={ON_TOP} raycast={() => null} />
      {ends.map((pts, i) => (
        <Line key={i} points={pts} color={color} lineWidth={2.5} depthTest={false} depthWrite={false} transparent renderOrder={ON_TOP} raycast={() => null} />
      ))}
      <Html position={mid} center zIndexRange={Z_DIMS}>
        <div className={`dim3d-label${front ? ' front' : ''}`}>{fmt(value)}</div>
      </Html>
    </group>
  )
}
