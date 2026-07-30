/**
 * Navigation — **step 7 of the tour**, and the last one.
 *
 * Everything about *where you are* lives here: which system the ship sits in,
 * which view is on screen, what is selected, how fast time runs. The galaxy
 * itself is a prop, and it is never mutated — the model is frozen terrain, and
 * application state is a separate object keyed by the same ids. `locationId`
 * below is exactly that: one string that means "the ship is here".
 *
 * Two indexes are built once per galaxy, because each one walks the whole
 * universe:
 *
 * - `objects` — id → anything, for the inspector;
 * - `systems` — id → system, to look up where a gate leads.
 */

import {
  connectedComponents,
  findRoute,
  indexGalaxy,
  indexSystems,
  type Galaxy,
  type StarSystem,
} from '@industrieh/starmap'
import type { ThemeInput } from '@industrieh/starmap-render'
import { useEffect, useMemo, useState, type JSX } from 'react'

import { useAnimationTime } from './hooks/useAnimationTime'
import { BUTTON, BUTTON_ON } from './ui'
import { Details } from './views/Details'
import { GalaxyView } from './views/GalaxyView'
import type { Hit } from './views/SvgStage'
import { SystemView } from './views/SystemView'

const SPEEDS = [
  { label: '⏸', value: 0 },
  { label: '×1', value: 1 },
  { label: '×4', value: 4 },
  { label: '×16', value: 16 },
]

export interface ExplorerProps {
  galaxy: Galaxy
  theme: ThemeInput
  backdrop: boolean
}

export function Explorer({ galaxy, theme, backdrop }: ExplorerProps): JSX.Element {
  const objects = useMemo(() => indexGalaxy(galaxy), [galaxy])
  const systems = useMemo(() => indexSystems(galaxy), [galaxy])

  const [locationId, setLocationId] = useState(galaxy.systems[0].id)
  const [inside, setInside] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [speed, setSpeed] = useState(1)

  const t = useAnimationTime(speed)
  // The id always exists: it starts on a real system and only ever moves to
  // another one. The cast is the price of a `Map#get` that cannot know that.
  const here = systems.get(locationId) as StarSystem

  // Keyboard: escape backs out of a system, space pauses. Bound on the window
  // rather than on an element, because the drawing is not focusable.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setInside(false)
      if (event.key === ' ') {
        event.preventDefault()
        setSpeed((current) => (current === 0 ? 1 : 0))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /** Fly to a system and look at it. */
  const travelTo = (systemId: string): void => {
    if (!systems.has(systemId)) return
    setLocationId(systemId)
    setSelectedId(systemId)
    setInside(true)
  }

  const select = (hit: Hit): void => setSelectedId(hit.id)

  // The library validates references, never that the network holds together —
  // so an application that cares has to ask. This generator always produces a
  // connected galaxy; the check is here because a hand-written one might not.
  const stranded = useMemo(() => connectedComponents(galaxy).slice(1).flat(), [galaxy])

  const selectedRoute =
    selectedId && systems.has(selectedId) ? findRoute(galaxy, locationId, selectedId) : null

  return (
    <>
      <header className="col-span-full flex flex-wrap items-center gap-2.5">
        <button
          className={BUTTON}
          type="button"
          onClick={() => setInside(false)}
          disabled={!inside}
        >
          ← galaxy
        </button>
        <h1 className="text-base font-semibold">
          {here.name}
          <span className="font-normal text-muted">
            {' '}
            · {inside ? 'system view' : 'galaxy view'}
          </span>
        </h1>
        <p className="text-muted">
          {inside
            ? 'double-click a gate to travel · esc to back out'
            : 'double-click a system to fly there'}
          {stranded.length ? ` · ⚠ ${stranded.length} stranded systems` : ''}
        </p>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-muted">t = {t.toFixed(1)}s</span>
          {SPEEDS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={option.value === speed ? `${BUTTON} ${BUTTON_ON}` : BUTTON}
              onClick={() => setSpeed(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {inside ? (
        <SystemView
          system={here}
          systems={systems}
          theme={theme}
          t={t}
          backdrop={backdrop ? 260 : 0}
          onSelect={select}
          onTravel={travelTo}
        />
      ) : (
        <GalaxyView
          galaxy={galaxy}
          theme={theme}
          locationId={locationId}
          selectedId={selectedId}
          hoveredId={hoveredId}
          backdrop={backdrop ? 400 : 0}
          onSelect={select}
          onEnter={travelTo}
          onHover={(hit) => setHoveredId(hit?.id ?? null)}
        />
      )}

      <Details
        index={objects}
        id={selectedId}
        route={
          selectedRoute
            ? {
                jumps: selectedRoute.jumps,
                distance: selectedRoute.distance,
                path: selectedRoute.systemIds.map((id) => systems.get(id)?.name ?? id),
              }
            : undefined
        }
      />
    </>
  )
}
