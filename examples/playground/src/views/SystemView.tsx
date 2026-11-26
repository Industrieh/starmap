/**
 * Inside a system — **step 5 of the tour**.
 *
 * The star, its planets, their stations, the gates and the asteroid fields, at
 * simulation time `t`. Click an object to inspect it; double-click a gate to
 * take it.
 *
 * This view owns its `<svg>` element and asks the renderer for *layers* rather
 * than a finished document: `renderSystemContent()` with `layers`. Only two of
 * them depend on `t` — `routes`, and `planets`, which carries the stations. The
 * other seven, the decorative backdrop included, are drawn once per system and
 * theme, and React never touches their DOM again.
 *
 * So a frame re-serializes about 17 elements and 1 KB — the moving part —
 * instead of the whole drawing: about 320 elements and 19 KB for a generated
 * system, four fifths of it backdrop. Building those two layers takes a few
 * hundredths of a millisecond, some twenty times less than the whole drawing,
 * and the browser re-parses only them.
 *
 * The groups below follow the renderer's own order, `SYSTEM_LAYERS`, bottom to
 * top: a route passes under the star and the planets, the gates sit on top.
 */

import type { StarSystem, SystemsById } from '@industrieh/starmap'
import {
  renderSystemContent,
  resolveTheme,
  systemViewBox,
  viewBoxAttr,
  type SystemLayer,
  type ThemeInput,
} from '@industrieh/starmap-render'
import { useMemo, type JSX } from 'react'

import { useSimulationTime } from '../hooks/clock'
import { SvgStage, type Hit } from './SvgStage'

export interface SystemViewProps {
  system: StarSystem
  /** Every system of the galaxy, so a gate label can name where it leads. */
  systems: SystemsById
  theme: ThemeInput
  backdrop: number
  onSelect: (hit: Hit) => void
  /** Double-clicked a gate that leads to exactly one system. */
  onTravel: (systemId: string) => void
}

/** Everything under the routes. None of it moves. */
const BELOW: readonly SystemLayer[] = ['defs', 'background', 'backdrop', 'orbits', 'fields']

/**
 * A `dangerouslySetInnerHTML` value. React rewrites the markup whenever it gets
 * a new object, so the still layers keep theirs from one frame to the next.
 */
const html = (markup: string): { __html: string } => ({ __html: markup })

export function SystemView({
  system,
  systems,
  theme,
  backdrop,
  onSelect,
  onTravel,
}: SystemViewProps): JSX.Element {
  // Resolved once. `renderSystemContent()` hands a resolved theme straight
  // through, so the two calls of every frame skip the merge entirely.
  const resolved = useMemo(() => resolveTheme(theme), [theme])
  const view = useMemo(() => systemViewBox(system), [system])

  // The ids of the gradients are built from the system's id by default, so the
  // `star` and `planets` layers find the ones the `defs` layer declared, even
  // though they come from separate calls.
  const still = useMemo(
    () => ({
      below: html(renderSystemContent(system, { theme: resolved, backdrop, layers: BELOW })),
      star: html(renderSystemContent(system, { theme: resolved, layers: ['star'] })),
      gates: html(renderSystemContent(system, { theme: resolved, systems, layers: ['gates'] })),
    }),
    [system, resolved, backdrop, systems],
  )

  const t = useSimulationTime()
  const routes = html(renderSystemContent(system, { t, theme: resolved, layers: ['routes'] }))
  const planets = html(renderSystemContent(system, { t, theme: resolved, layers: ['planets'] }))

  const travel = (hit: Hit): void => {
    if (hit.kind !== 'gate') return
    const gate = system.gates.find((g) => g.id === hit.id)
    // Only an unambiguous gate travels. One that leads to two systems needs the
    // player to say which, and this app does not ask.
    if (gate?.links.length === 1) onTravel(gate.links[0])
  }

  // No `role="img"`: that would hide the objects inside from assistive
  // technology. The `<title>` still names the drawing, and the navigation
  // panel offers every object as a button.
  return (
    <SvgStage className="system" onPick={onSelect} onEnter={travel}>
      <svg viewBox={viewBoxAttr(view)} preserveAspectRatio="xMidYMid meet">
        <title>{`The ${system.name} system`}</title>
        <g dangerouslySetInnerHTML={still.below} />
        <g dangerouslySetInnerHTML={routes} />
        <g dangerouslySetInnerHTML={still.star} />
        <g dangerouslySetInnerHTML={planets} />
        <g dangerouslySetInnerHTML={still.gates} />
      </svg>
    </SvgStage>
  )
}
