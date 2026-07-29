/**
 * Inside a system — **step 5 of the tour**.
 *
 * The star, its planets, their stations, the gates and the asteroid fields, at
 * simulation time `t`. Click an object to inspect it; double-click a gate to
 * take it.
 *
 * The whole string is rebuilt on every frame, and at this size that is fine —
 * a system is a few dozen objects. For a map with hundreds, draw the layers
 * once with `renderSystemContent()` and move the objects yourself with
 * `systemPositions()`; the recipe is in the renderer's `docs/recipes.md`.
 */

import type { StarSystem, SystemsById } from '@cotontigeh/starmap'
import { renderSystem, type ThemeInput } from '@cotontigeh/starmap-render'
import type { JSX } from 'react'

import { SvgStage, type Hit } from './SvgStage'

export interface SystemViewProps {
  system: StarSystem
  /** Every system of the galaxy, so a gate label can name where it leads. */
  systems: SystemsById
  theme: ThemeInput
  /** Simulation time, in seconds. */
  t: number
  backdrop: number
  onSelect: (hit: Hit) => void
  /** Double-clicked a gate that leads to exactly one system. */
  onTravel: (systemId: string) => void
}

export function SystemView({
  system,
  systems,
  theme,
  t,
  backdrop,
  onSelect,
  onTravel,
}: SystemViewProps): JSX.Element {
  const svg = renderSystem(system, {
    t,
    theme,
    systems,
    backdrop,
    // The system's own id: two drawings on one page must not share the ids of
    // their gradients, or the second would wear the first one's star colour.
    idPrefix: system.id,
    title: `The ${system.name} system`,
  })

  const travel = (hit: Hit): void => {
    if (hit.kind !== 'gate') return
    const gate = system.gates.find((g) => g.id === hit.id)
    // Only an unambiguous gate travels. One that leads to two systems needs the
    // player to say which, and this app does not ask.
    if (gate?.links.length === 1) onTravel(gate.links[0])
  }

  return <SvgStage className="system" svg={svg} onPick={onSelect} onEnter={travel} />
}
