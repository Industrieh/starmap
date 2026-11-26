/**
 * The galaxy map — **step 4 of the tour**.
 *
 * Systems, the hyperlanes between them, and the route from where you are to
 * whatever the pointer is over. Click to select, double-click to enter.
 *
 * It shows the composition path of the renderer: instead of calling
 * `renderGalaxy()` and taking the picture as it comes, it asks for the layers
 * (`renderGalaxyContent`), adds a layer of its own, and wraps the result in a
 * document (`svgDocument`). The marker around your current system is drawn with
 * the same `el()` and `group()` helpers the renderer uses internally, in the
 * same coordinate system — world units, straight out of `system.x` / `system.y`.
 */

import { findRoute, type Galaxy, type HyperlaneNetwork, type Route } from '@industrieh/starmap'
import {
  el,
  galaxyScale,
  galaxyViewBox,
  group,
  renderGalaxyContent,
  resolveTheme,
  svgDocument,
  type ThemeInput,
} from '@industrieh/starmap-render'
import { useMemo, type JSX } from 'react'

import { SvgStage, type Hit } from './SvgStage'

export interface GalaxyViewProps {
  galaxy: Galaxy
  /** The lanes indexed by system, from `indexNetwork(galaxy)` — built once, reused by every route. */
  network: HyperlaneNetwork
  theme: ThemeInput
  /** Where the ship is. Marked, and the origin of every route shown. */
  locationId: string
  selectedId: string | null
  /** The system under the pointer, if any. */
  hoveredId: string | null
  backdrop: number
  onSelect: (hit: Hit) => void
  onEnter: (systemId: string) => void
  onHover: (hit: Hit | null) => void
}

export function GalaxyView(props: GalaxyViewProps): JSX.Element {
  const { galaxy, network, theme, locationId, selectedId, hoveredId, backdrop } = props

  // Preview the route to the system the pointer is over, and fall back to the
  // selection when it is over none. The selection may be any object — a
  // planet seen in the system view, say — and an id that is not a system
  // simply finds no route, which is the right outcome.
  //
  // `network` rather than `galaxy`: the lanes are already indexed, so each
  // route costs one search and no rebuild. Memoized all the same, because this
  // component also re-renders for reasons that leave the route alone — a theme
  // change, say.
  const target = hoveredId ?? selectedId ?? locationId
  const route = useMemo(() => findRoute(network, locationId, target), [network, locationId, target])

  const svg = useMemo(
    () => drawGalaxy(galaxy, theme, locationId, route, backdrop),
    [galaxy, theme, locationId, route, backdrop],
  )

  return (
    <SvgStage
      className="galaxy"
      svg={svg}
      onPick={props.onSelect}
      // Only a system previews a route. A lane is a hit too (`kind: 'lane'`),
      // and counts as being over nothing: the selection's route stays lit.
      onHover={(hit) => props.onHover(hit?.kind === 'system' ? hit : null)}
      onEnter={(hit) => hit.kind === 'system' && props.onEnter(hit.id)}
    />
  )
}

/**
 * The drawing: the renderer's layers, plus one of ours on top.
 *
 * Everything the app adds goes in its own `data-layer`, the same way the
 * renderer names its own. It costs nothing and it makes the output readable in
 * a devtools inspector — which is most of what a playground is for.
 */
function drawGalaxy(
  galaxy: Galaxy,
  theme: ThemeInput,
  locationId: string,
  route: Route | null,
  backdrop: number,
): string {
  const view = galaxyViewBox(galaxy)
  // Resolved once for the two uses below; the renderer takes a resolved theme
  // as is, with no second merge.
  const resolved = resolveTheme(theme)
  const layers = renderGalaxyContent(galaxy, {
    theme: resolved,
    backdrop,
    idPrefix: 'galaxy',
    highlight: route?.systemIds,
  })

  const here = galaxy.systems.find((s) => s.id === locationId)

  // The sizes the renderer itself uses for this view — the same `galaxyViewBox`
  // framing, so the same numbers. The marker is built from them: a ring at the
  // edge of a system's halo and a fainter one past it, with the renderer's own
  // stroke unit. Change the framing and it follows.
  const scale = galaxyScale(view)

  // The ring takes the theme's label colour: light on the dark theme, ink on
  // the light one — readable on either background, and distinct from the
  // highlight colour the route is drawn in.
  const stroke = resolved.label

  // A ring around the system the ship is in. `el()` writes one element and
  // rounds every number; `group()` drops the layer entirely if it is empty,
  // which is what happens on a galaxy with no systems at all.
  const marker = group(
    { 'data-layer': 'ship' },
    here
      ? [
          el('circle', {
            cx: here.x,
            cy: here.y,
            r: scale.glow,
            fill: 'none',
            stroke,
            'stroke-width': scale.k * 3,
            opacity: 0.9,
          }),
          el('circle', {
            cx: here.x,
            cy: here.y,
            r: scale.glow * 1.4,
            fill: 'none',
            stroke,
            'stroke-width': scale.k * 1.5,
            opacity: 0.35,
          }),
        ]
      : [],
  )

  // `role: false`: the default `role="img"` would present the map as one flat
  // picture and hide the systems inside it from assistive technology. The
  // title still names it, and the navigation panel makes every system
  // reachable from the keyboard.
  return svgDocument(view, `${layers}\n${marker}`, { title: 'Galaxy map', role: false })
}
