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
 * - `objects` — id → anything, for the inspector (`indexGalaxy`);
 * - `network` — the systems and the lanes touching each one (`indexNetwork`).
 *   Every route and the connectivity check read it instead of the galaxy, so
 *   none of them rebuilds the graph; its `systems` map also says where a gate
 *   leads.
 *
 * The clock is not here. `Explorer` holds the *speed*, which changes when you
 * press a button; the time itself changes sixty times a second, and lives in
 * `<Clock>` so that only what depends on it re-renders — see `hooks/clock.tsx`.
 */

import {
  connectedComponents,
  findRoute,
  indexGalaxy,
  indexNetwork,
  type Galaxy,
  type IndexEntry,
} from '@industrieh/starmap'
import type { ThemeInput } from '@industrieh/starmap-render'
import { useEffect, useMemo, useState, type JSX } from 'react'

import { Clock, ClockLabel } from './hooks/clock'
import { BUTTON, BUTTON_ON } from './ui'
import { Details } from './views/Details'
import { GalaxyView } from './views/GalaxyView'
import { Navigator } from './views/Navigator'
import { Notice } from './views/Notice'
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

export function Explorer(props: ExplorerProps): JSX.Element {
  // A galaxy with no system has nowhere to put the ship. This generator never
  // builds one, but an edited one can — say so rather than crash on
  // `galaxy.systems[0]`.
  if (props.galaxy.systems.length === 0) {
    return (
      <Notice role="status" title="This galaxy is empty">
        <p className="text-muted">
          The generator returned no system at all, so there is nowhere to put the ship. Ask for more
          systems, or check <code>placeSystems()</code> in <code>generate.ts</code>.
        </p>
      </Notice>
    )
  }
  return <Navigation {...props} />
}

/**
 * Interactive elements the space bar belongs to: it types a space in a field
 * and presses a button. The pause shortcut must leave them alone.
 */
const TYPING_OR_PRESSING = 'input, textarea, select, button, [contenteditable]'

function claimsSpace(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.closest(TYPING_OR_PRESSING) !== null
}

/**
 * What a press can select: the kinds `indexGalaxy()` indexes, so that the
 * inspector always finds what was selected. Lanes and local routes are hits
 * too (`kind: 'lane'`, `'route'`), but they are not objects of that index — a
 * press on one leaves the selection as it was.
 */
const INSPECTABLE: ReadonlySet<string> = new Set<IndexEntry['kind']>([
  'system',
  'star',
  'planet',
  'station',
  'gate',
  'field',
])

function Navigation({ galaxy, theme, backdrop }: ExplorerProps): JSX.Element {
  const objects = useMemo(() => indexGalaxy(galaxy), [galaxy])
  const network = useMemo(() => indexNetwork(galaxy), [galaxy])
  const systems = network.systems

  const [storedLocationId, setLocationId] = useState(galaxy.systems[0].id)
  const [inside, setInside] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [speed, setSpeed] = useState(1)

  // The stored id can outlive its system: Fast Refresh keeps this state when
  // `generate.ts` is edited, and the new galaxy may not have that system any
  // more. Fall back to the first one rather than crash on a missing id.
  // `galaxy.systems[0]` exists — `Explorer` only renders this with systems.
  const here = systems.get(storedLocationId) ?? galaxy.systems[0]
  const locationId = here.id

  /** Back to the map. The pointer is over nothing there yet. */
  const leave = (): void => {
    setInside(false)
    setHoveredId(null)
  }

  // Keyboard: escape backs out of a system, space pauses. Bound on the window
  // rather than on an element, because the drawing is not focusable — but the
  // space bar is left to whatever already uses it: a field, a button.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (event.key === 'Escape') {
        setInside(false)
        setHoveredId(null)
      }
      if (event.key === ' ' && !event.repeat && !claimsSpace(event.target)) {
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
    // The map goes away, and with it whatever the pointer was over. A stale
    // hover would light a route from the old place the moment you came back.
    setHoveredId(null)
  }

  const select = (hit: Hit): void => {
    if (INSPECTABLE.has(hit.kind)) setSelectedId(hit.id)
  }

  // The library validates references, never that the network holds together —
  // so an application that cares has to ask. This generator always produces a
  // connected galaxy; the check is here because a hand-written one might not.
  const stranded = useMemo(() => connectedComponents(network).slice(1).flat(), [network])

  // Memoized: a route is a search through the network, and this component
  // re-renders on every hover.
  const route = useMemo(() => {
    if (selectedId === null || !systems.has(selectedId)) return undefined
    const found = findRoute(network, locationId, selectedId)
    return found
      ? {
          jumps: found.jumps,
          distance: found.distance,
          path: found.systemIds.map((id) => systems.get(id)?.name ?? id),
        }
      : undefined
  }, [network, systems, locationId, selectedId])

  return (
    <Clock speed={speed}>
      <header className="col-span-full flex flex-wrap items-center gap-2.5">
        <button className={BUTTON} type="button" onClick={leave} disabled={!inside}>
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
          {' · or use the panel'}
          {stranded.length ? ` · ⚠ ${stranded.length} stranded systems` : ''}
        </p>

        <div className="ml-auto flex items-center gap-1.5">
          <ClockLabel />
          {SPEEDS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={option.value === speed ? `${BUTTON} ${BUTTON_ON}` : BUTTON}
              aria-pressed={option.value === speed}
              aria-label={option.value === 0 ? 'pause' : `speed ${option.label}`}
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
          backdrop={backdrop ? 260 : 0}
          onSelect={select}
          onTravel={travelTo}
        />
      ) : (
        <GalaxyView
          galaxy={galaxy}
          network={network}
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

      {/* One grid cell, two panels: the way to move without a mouse, and the
          inspector below it, which takes whatever height is left. */}
      <div className="flex min-h-0 flex-col gap-2.5">
        <Navigator
          galaxy={galaxy}
          systems={systems}
          here={here}
          inside={inside}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onTravel={travelTo}
        />
        <Details index={objects} id={selectedId} route={route} />
      </div>
    </Clock>
  )
}
