import { useEffect } from 'react'
import { PlanView } from './plan/PlanView'
import { useStore } from './store'
import { Scene3D } from './three/Scene3D'
import { Properties } from './ui/Properties'
import { Icon } from './ui/icons'
import { ProjectMenu, SideRail, WallTools } from './ui/Sidebar'

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

/** Rzut i 3D zawsze obok siebie; ikona w rogu powiększa widok na całe okno i przywraca połowę. */
function ViewPane({ mode, label, children }: { mode: 'plan' | '3d'; label: string; children: React.ReactNode }) {
  const viewMode = useStore((s) => s.viewMode)
  const maximized = viewMode === mode
  return (
    <div className="view">
      {children}
      <button
        className="view-toggle"
        title={maximized ? `${label}: zmniejsz do połowy okna` : `${label}: powiększ na całe okno`}
        aria-label={maximized ? `Zmniejsz ${label}` : `Powiększ ${label}`}
        onClick={() => useStore.getState().setViewMode(maximized ? 'split' : mode)}
      >
        <Icon name={maximized ? 'restore' : 'maximize'} size={16} />
      </button>
    </div>
  )
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
        <WallTools />
        <div className="tool-group">
          <button disabled={!canUndo} onClick={() => useStore.getState().undo()} title="Cofnij (Ctrl+Z)" aria-label="Cofnij">
            <Icon name="undo" size={16} />
          </button>
          <button disabled={!canRedo} onClick={() => useStore.getState().redo()} title="Ponów (Ctrl+Shift+Z)" aria-label="Ponów">
            <Icon name="redo" size={16} />
          </button>
        </div>
        <span className="spacer" />
        <span className="muted counts">
          {wallCount} ścian · {itemCount} elementów
        </span>
        <ProjectMenu />
      </header>
      <div className="main">
        <SideRail />
        <div className={`views views-${viewMode}`}>
          {viewMode !== '3d' && (
            <ViewPane mode="plan" label="rzut">
              <PlanView />
            </ViewPane>
          )}
          {viewMode !== 'plan' && (
            <ViewPane mode="3d" label="widok 3D">
              <Scene3D />
            </ViewPane>
          )}
        </div>
        <Properties />
      </div>
    </div>
  )
}
