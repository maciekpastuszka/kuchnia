import { useEffect } from 'react'
import { PlanView } from './plan/PlanView'
import { useStore, type ViewMode } from './store'
import { Scene3D } from './three/Scene3D'
import { Properties } from './ui/Properties'
import { Sidebar } from './ui/Sidebar'

const VIEWS: { mode: ViewMode; label: string }[] = [
  { mode: 'split', label: 'Rzut + 3D' },
  { mode: 'plan', label: 'Rzut' },
  { mode: '3d', label: '3D' },
]

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return
      const st = useStore.getState()
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) st.redo()
        else st.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        st.redo()
        return
      }
      // M – miarka (włącz / wyłącz)
      if (e.key.toLowerCase() === 'm' && !mod && st.tool !== 'wall') {
        st.setTool(st.tool === 'measure' ? 'select' : 'measure')
        return
      }
      if (st.tool === 'wall' || st.tool === 'measure') return
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        st.duplicateSelected()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        st.removeSelected()
      } else if (e.key.toLowerCase() === 'r' && !mod) {
        st.rotateSelected(e.shiftKey ? -1 : 1)
      } else if (e.key === 'Escape') {
        st.select(null)
      } else if (e.key.startsWith('Arrow') && st.selection?.kind === 'item') {
        e.preventDefault()
        const item = st.items.find((i) => i.id === st.selection!.id)
        if (!item) return
        const step = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        if (!e.repeat) st.checkpoint()
        st.updateItem(item.id, { x: item.x + dx, y: item.y + dy })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export default function App() {
  useShortcuts()
  const viewMode = useStore((s) => s.viewMode)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)
  const itemCount = useStore((s) => s.items.length)
  const wallCount = useStore((s) => s.walls.length)

  return (
    <div className="app">
      <header className="toolbar">
        <strong className="brand">Edytor kuchni</strong>
        <div className="segmented">
          {VIEWS.map((v) => (
            <button key={v.mode} className={viewMode === v.mode ? 'active' : ''} onClick={() => useStore.getState().setViewMode(v.mode)}>
              {v.label}
            </button>
          ))}
        </div>
        <button disabled={!canUndo} onClick={() => useStore.getState().undo()} title="Ctrl+Z">
          ↶ Cofnij
        </button>
        <button disabled={!canRedo} onClick={() => useStore.getState().redo()} title="Ctrl+Shift+Z">
          ↷ Ponów
        </button>
        {viewMode !== '3d' && <button onClick={() => window.dispatchEvent(new Event('plan:fit'))}>Dopasuj rzut</button>}
        {viewMode !== 'plan' && <button onClick={() => window.dispatchEvent(new Event('3d:reset'))}>Kamera 3D</button>}
        <span className="spacer" />
        <span className="muted">
          {wallCount} ścian · {itemCount} elementów
        </span>
      </header>
      <div className="main">
        <Sidebar />
        <div className={`views views-${viewMode}`}>
          {viewMode !== '3d' && (
            <div className="view">
              <PlanView />
            </div>
          )}
          {viewMode !== 'plan' && (
            <div className="view">
              <Scene3D />
            </div>
          )}
        </div>
        <Properties />
      </div>
    </div>
  )
}
