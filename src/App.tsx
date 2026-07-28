import { useCallback, useEffect, useMemo, useState } from 'react'

import GalaxyMap from './components/GalaxyMap'
import InfoPanel from './components/InfoPanel'
import SystemView from './components/SystemView'
import { galaxy } from './data'
import type { IndexEntry, Selection, StarSystem, ViewMode } from './types/galaxy'

const SPEEDS = [0, 1, 4, 16] as const

export default function App() {
  const [mode, setMode] = useState<ViewMode>('galaxy')
  const [currentId, setCurrentId] = useState<string>(galaxy.systems[0].id)
  const [selected, setSelected] = useState<Selection | null>(null)
  const [speed, setSpeed] = useState<number>(1)

  const systemsById = useMemo(
    () => new Map<string, StarSystem>(galaxy.systems.map((s) => [s.id, s])),
    [],
  )

  /** id -> { kind, obj, systemId } pour tout objet de la galaxie */
  const index = useMemo(() => {
    const m = new Map<string, IndexEntry>()
    for (const s of galaxy.systems) {
      m.set(s.id, { kind: 'system', obj: s, systemId: s.id })
      m.set(s.star.id, { kind: 'star', obj: s.star, systemId: s.id })
      for (const p of s.planets) {
        m.set(p.id, { kind: 'planet', obj: p, systemId: s.id })
        for (const st of p.stations) m.set(st.id, { kind: 'station', obj: st, systemId: s.id })
      }
      for (const g of s.gates) m.set(g.id, { kind: 'gate', obj: g, systemId: s.id })
      for (const f of s.asteroidFields) m.set(f.id, { kind: 'field', obj: f, systemId: s.id })
    }
    return m
  }, [])

  const current = systemsById.get(currentId)
  const entry = selected ? (index.get(selected.id) ?? null) : null

  const enter = useCallback((id: string) => {
    setCurrentId(id)
    setMode('system')
    setSelected({ kind: 'system', id })
  }, [])

  const toGalaxy = useCallback(() => {
    setMode('galaxy')
    setSelected({ kind: 'system', id: currentId })
  }, [currentId])

  const select = useCallback(
    (sel: Selection) => {
      const found = index.get(sel.id)
      if (found && mode === 'system' && found.systemId !== currentId && found.kind !== 'system')
        return
      setSelected(sel)
    },
    [index, mode, currentId],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode === 'system') toGalaxy()
        else setSelected(null)
      }
      if (e.key === ' ') {
        e.preventDefault()
        setSpeed((s) => (s === 0 ? 1 : 0))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, toGalaxy])

  const neighbours = useMemo(
    () =>
      galaxy.lanes
        .filter((l) => l.from === currentId || l.to === currentId)
        .map((l) => systemsById.get(l.from === currentId ? l.to : l.from))
        .filter((s) => s !== undefined),
    [currentId, systemsById],
  )

  if (!current) return null

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">✦</span>
          <div>
            <h1>Star Map</h1>
            <span className="muted small">
              seed <code>{galaxy.meta.seed}</code> · {galaxy.meta.systemCount} systèmes ·{' '}
              {galaxy.meta.planetCount} planètes
            </span>
          </div>
        </div>

        <nav className="breadcrumb">
          <button className={mode === 'galaxy' ? 'crumb active' : 'crumb'} onClick={toGalaxy}>
            Galaxie
          </button>
          {mode === 'system' && (
            <>
              <span className="sep">/</span>
              <span className="crumb active">{current.name}</span>
            </>
          )}
        </nav>

        <div className="tools">
          {mode === 'system' && (
            <>
              <span className="muted small">temps</span>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  className={speed === s ? 'chip active' : 'chip'}
                  onClick={() => setSpeed(s)}
                >
                  {s === 0 ? '⏸' : `×${s}`}
                </button>
              ))}
            </>
          )}
        </div>
      </header>

      <main className="stage">
        {mode === 'galaxy' ? (
          <GalaxyMap galaxy={galaxy} selected={selected} onSelect={select} onEnter={enter} />
        ) : (
          <SystemView
            key={currentId}
            system={current}
            systemsById={systemsById}
            selected={selected}
            onSelect={select}
            onTravel={enter}
            speed={speed}
            paused={speed === 0}
          />
        )}

        <InfoPanel
          entry={entry}
          galaxy={galaxy}
          index={index}
          systemsById={systemsById}
          mode={mode}
          onSelect={select}
          onEnter={enter}
          onTravel={enter}
        />
      </main>

      {mode === 'system' && (
        <footer className="jumpbar">
          <span className="muted small">Systèmes voisins :</span>
          {neighbours.map((s) => (
            <button key={s.id} className="chip" onClick={() => enter(s.id)}>
              {s.name}
            </button>
          ))}
          <button className="chip ghost" onClick={toGalaxy}>
            ⤺ Vue galaxie (Échap)
          </button>
        </footer>
      )}
    </div>
  )
}
