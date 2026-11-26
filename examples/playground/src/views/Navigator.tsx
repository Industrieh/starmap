/**
 * The keyboard's way in.
 *
 * Everything on the drawings is a pointer gesture, and has to be: a drawing is
 * one string, replaced up to sixty times a second, so nothing inside it can
 * hold the focus. This panel offers the same choices as real buttons — each one
 * reachable with Tab and announced by a screen reader — and calls the very
 * handlers the pointer does. Nothing here knows how to travel or select; it
 * only asks `Explorer` to.
 */

import type { Galaxy, StarSystem, SystemsById } from '@industrieh/starmap'
import { useMemo, type JSX } from 'react'

import { BUTTON, FIELD, LIST_BUTTON } from '../ui'

export interface NavigatorProps {
  galaxy: Galaxy
  /** Every system, to name where a gate leads. */
  systems: SystemsById
  /** Where the ship is. */
  here: StarSystem
  /** Whether the system view is on screen rather than the map. */
  inside: boolean
  selectedId: string | null
  /** Inspect an object — what clicking it does. */
  onSelect: (id: string) => void
  /** Fly to a system and go inside — what double-clicking it does. */
  onTravel: (systemId: string) => void
}

const PANEL =
  'flex max-h-[30vh] shrink-0 flex-col gap-1.5 overflow-y-auto rounded-xl border border-line bg-panel p-3' +
  ' shadow-panel [scrollbar-color:var(--color-line)_transparent] [scrollbar-width:thin] wide:max-h-[45%]'

const HEADING = 'text-[11px] font-semibold tracking-[0.1em] text-accent uppercase'

export function Navigator(props: NavigatorProps): JSX.Element {
  return (
    <nav aria-label="Navigation" className={PANEL}>
      {props.inside ? <InsideSystem {...props} /> : <OnTheMap {...props} />}
    </nav>
  )
}

/**
 * On the map: pick a destination, then fly. Picking already selects it, so the
 * map lights the route and the inspector shows the system before you commit.
 */
function OnTheMap({
  galaxy,
  systems,
  here,
  selectedId,
  onSelect,
  onTravel,
}: NavigatorProps): JSX.Element {
  // By name: sixty systems are only a usable list if you can find one in it.
  const sorted = useMemo(
    () => galaxy.systems.toSorted((a, b) => a.name.localeCompare(b.name)),
    [galaxy],
  )
  const destination = selectedId !== null && systems.has(selectedId) ? selectedId : here.id

  return (
    <>
      <label htmlFor="destination" className={HEADING}>
        destination
      </label>
      <div className="flex gap-1.5">
        <select
          id="destination"
          className={`${FIELD} min-w-0 flex-1`}
          value={destination}
          onChange={(event) => onSelect(event.target.value)}
        >
          {sorted.map((system) => (
            <option key={system.id} value={system.id}>
              {system.id === here.id ? `${system.name} — you are here` : system.name}
            </option>
          ))}
        </select>
        <button type="button" className={BUTTON} onClick={() => onTravel(destination)}>
          {destination === here.id ? 'go inside' : 'fly there'}
        </button>
      </div>
    </>
  )
}

/** Inside a system: every object, to inspect, and every gate, to take. */
function InsideSystem({
  systems,
  here,
  selectedId,
  onSelect,
  onTravel,
}: NavigatorProps): JSX.Element {
  const row = (id: string, name: string): JSX.Element => (
    <ObjectButton id={id} name={name} selectedId={selectedId} onSelect={onSelect} />
  )

  return (
    <>
      <h2 className={HEADING}>in {here.name}</h2>
      <ul className="flex flex-col">
        <li>{row(here.star.id, here.star.name)}</li>
        {here.planets.map((planet) => (
          <li key={planet.id}>
            {row(planet.id, planet.name)}
            {planet.stations.length > 0 ? (
              <ul className="pl-3">
                {planet.stations.map((station) => (
                  <li key={station.id}>{row(station.id, station.name)}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
        {here.asteroidFields.map((field) => (
          <li key={field.id}>{row(field.id, field.name)}</li>
        ))}
      </ul>

      {here.gates.length > 0 ? (
        <>
          <h2 className={`${HEADING} mt-1.5`}>gates</h2>
          <ul className="flex flex-col gap-1">
            {here.gates.map((gate) => {
              // Only an unambiguous gate travels — the same rule as
              // double-clicking it in the drawing.
              const target = gate.links.length === 1 ? systems.get(gate.links[0]) : undefined
              return (
                <li key={gate.id} className="flex items-center gap-1.5">
                  {row(gate.id, gate.name)}
                  {target ? (
                    <button
                      type="button"
                      className={`${BUTTON} shrink-0`}
                      aria-label={`Take ${gate.name} to ${target.name}`}
                      onClick={() => onTravel(target.id)}
                    >
                      → {target.name}
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </>
      ) : null}
    </>
  )
}

interface ObjectButtonProps {
  id: string
  name: string
  selectedId: string | null
  onSelect: (id: string) => void
}

/** One object of the system: pressing it inspects it, like a click on the drawing. */
function ObjectButton({ id, name, selectedId, onSelect }: ObjectButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className={LIST_BUTTON}
      aria-current={id === selectedId ? 'true' : undefined}
      onClick={() => onSelect(id)}
    >
      {name}
    </button>
  )
}
