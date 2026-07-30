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

import { findRoute, type Galaxy, type Route } from '@industrieh/starmap'
import {
  el,
  galaxyViewBox,
  group,
  renderGalaxyContent,
  svgDocument,
  type ThemeInput,
} from '@industrieh/starmap-render'
import { useMemo, type JSX } from 'react'

import { SvgStage, type Hit } from './SvgStage'

export interface GalaxyViewProps {
  galaxy: Galaxy
  theme: ThemeInput
  /** Where the ship is. Marked, and the origin of every route shown. */
  locationId: string
  selectedId: string | null
  hoveredId: string | null
  backdrop: number
  onSelect: (hit: Hit) => void
  onEnter: (systemId: string) => void
  onHover: (hit: Hit | null) => void
}

export function GalaxyView(props: GalaxyViewProps): JSX.Element {
  const { galaxy, theme, locationId, selectedId, hoveredId, backdrop } = props

  // Preview the route to whatever the pointer is over, and fall back to the
  // selection when it is over nothing. Both are ids of *anything* clickable, so
  // a lane id simply finds no route — which is the right outcome.
  const target = hoveredId ?? selectedId ?? locationId
  const route = findRoute(galaxy, locationId, target)

  const svg = useMemo(
    () => drawGalaxy(galaxy, theme, locationId, route, backdrop),
    [galaxy, theme, locationId, route?.systemIds.join(), backdrop],
  )

  return (
    <SvgStage
      className="galaxy"
      svg={svg}
      onPick={props.onSelect}
      onHover={props.onHover}
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
  const layers = renderGalaxyContent(galaxy, {
    theme,
    backdrop,
    idPrefix: 'galaxy',
    highlight: route?.systemIds,
  })

  const here = galaxy.systems.find((s) => s.id === locationId)
  const size = Math.max(view.w, view.h)

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
            r: size * 0.02,
            fill: 'none',
            stroke: '#ffffff',
            'stroke-width': size * 0.0016,
            opacity: 0.9,
          }),
          el('circle', {
            cx: here.x,
            cy: here.y,
            r: size * 0.03,
            fill: 'none',
            stroke: '#ffffff',
            'stroke-width': size * 0.0008,
            opacity: 0.35,
          }),
        ]
      : [],
  )

  return svgDocument(view, `${layers}\n${marker}`, { title: 'Galaxy map' })
}
