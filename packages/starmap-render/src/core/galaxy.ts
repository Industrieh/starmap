/**
 * Drawing a whole galaxy: systems as points, hyperlanes as the network between
 * them.
 *
 * Nothing here moves. Orbits are a system-scale concern, and at galaxy scale a
 * planet is smaller than a rounding error, so this drawing takes no `t`.
 *
 * Sizes are fractions of the view rather than world units. A galaxy may be 200
 * units across or 200 000, and a system dot has to stay a dot in both.
 *
 * @example
 * ```ts
 * const route = findRoute(galaxy, 'sol', 'kepler')
 * const svg = renderGalaxy(galaxy, { highlight: route?.systemIds })
 * ```
 */

import type { Galaxy, StarSystem } from '@industrieh/starmap'

import { backdropStars, GALAXY_MARGIN, galaxyViewBox, type ViewBox } from './geometry'
import { svgDocument, type DocumentOptions } from './root'
import { background, dash, el, group, num, text } from './svg'
import { pickColor, resolveTheme, type Theme, type ThemeInput } from './theme'

/** Options of {@link renderGalaxy} and {@link renderGalaxyContent}. */
export interface RenderGalaxyOptions extends DocumentOptions {
  /** Colours. Anything left out comes from `DEFAULT_THEME`. */
  theme?: ThemeInput
  /**
   * Empty space around the systems, as a fraction of the galaxy's largest
   * dimension.
   * @default 0.12
   */
  margin?: number
  /**
   * Draw the name of each system.
   * @default true
   */
  labels?: boolean
  /**
   * How many decorative background stars. `0` draws none.
   * @default 400
   */
  backdrop?: number
  /**
   * Prefix of the ids this drawing generates, for its one gradient. Give each
   * drawing on a page its own.
   * @default 'starmap'
   */
  idPrefix?: string
  /**
   * A path to bring forward, as an ordered list of system ids — exactly what
   * `findRoute()` returns in `systemIds`.
   *
   * Every listed system is emphasised, and so is every lane between two
   * consecutive entries. Order matters: `['a', 'b']` lights the lane between
   * them, `['a', 'z']` lights nothing if they are not neighbours.
   */
  highlight?: readonly string[]
}

/**
 * Draw a galaxy as a standalone SVG document.
 *
 * @returns a complete `<svg>…</svg>` string
 */
export function renderGalaxy(galaxy: Galaxy, options: RenderGalaxyOptions = {}): string {
  const view = galaxyViewBox(galaxy, options.margin ?? GALAXY_MARGIN)
  return svgDocument(view, renderGalaxyContent(galaxy, options), options)
}

/**
 * Draw a galaxy's layers, without the `<svg>` element around them.
 *
 * Pair it with {@link galaxyViewBox} when your application owns the root
 * element — which is what pan and zoom need.
 */
export function renderGalaxyContent(galaxy: Galaxy, options: RenderGalaxyOptions = {}): string {
  const {
    labels = true,
    backdrop = 400,
    idPrefix = 'starmap',
    margin = GALAXY_MARGIN,
    highlight,
  } = options

  const theme = resolveTheme(options.theme)
  const view = galaxyViewBox(galaxy, margin)
  const scale = scaleOf(view)
  const lit = new Set(highlight ?? [])
  const litLanes = pathPairs(highlight)

  return [
    defs(idPrefix, theme),
    background(view, theme.background),
    drawBackdrop(galaxy, view, theme, backdrop, scale),
    drawLanes(galaxy, theme, scale, litLanes),
    drawSystems(galaxy, theme, scale, labels, idPrefix, lit),
  ]
    .filter((layer) => layer !== '')
    .join('\n')
}

// ---------------------------------------------------------------- internals

/** Every size in this drawing, as a fraction of the view. */
interface Scale {
  /** Radius of a system's dot. */
  dot: number
  /** Radius of the faction ring around it. */
  ring: number
  /** Radius of its halo. */
  glow: number
  /** Stroke unit. */
  k: number
  /** Label size. */
  font: number
}

function scaleOf(view: ViewBox): Scale {
  const span = Math.max(view.w, view.h)
  return {
    dot: span * 0.004,
    ring: span * 0.011,
    glow: span * 0.022,
    k: span * 0.0005,
    font: span * 0.0133,
  }
}

/** Consecutive pairs of a path, as the `a|b` keys used to match lanes. */
function pathPairs(path: readonly string[] | undefined): Set<string> {
  const pairs = new Set<string>()
  if (!path) return pairs
  for (let i = 1; i < path.length; i++) pairs.add(laneKey(path[i - 1], path[i]))
  return pairs
}

/** A lane is undirected, so its key must not depend on which end comes first. */
function laneKey(a: string, b: string): string {
  return [a, b].toSorted().join('|')
}

/** One gradient: the halo shared by every system dot. */
function defs(prefix: string, theme: Theme): string {
  return el(
    'defs',
    {},
    el(
      'radialGradient',
      { id: `${prefix}-sysglow` },
      [
        el('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': 0.9 }),
        el('stop', { offset: '45%', 'stop-color': theme.backdropStar, 'stop-opacity': 0.28 }),
        el('stop', { offset: '100%', 'stop-color': theme.backdropStar, 'stop-opacity': 0 }),
      ].join(''),
    ),
  )
}

function drawBackdrop(
  galaxy: Galaxy,
  view: ViewBox,
  theme: Theme,
  count: number,
  scale: Scale,
): string {
  // Seeded with the galaxy's own seed when it has one, so a saved universe
  // always redraws with the same sky.
  const stars = backdropStars(count, view.w * 0.55, galaxy.meta.seed ?? 'starmap', scale.dot / 2)
  return group(
    { 'data-layer': 'backdrop', fill: theme.backdropStar },
    stars.map((s) => el('circle', { cx: s.x, cy: s.y, r: s.r, opacity: s.o })),
  )
}

function drawLanes(galaxy: Galaxy, theme: Theme, scale: Scale, lit: ReadonlySet<string>): string {
  const byId = new Map(galaxy.systems.map((s) => [s.id, s]))
  return group(
    { 'data-layer': 'lanes' },
    galaxy.lanes.map((lane) => {
      const a = byId.get(lane.from)
      const b = byId.get(lane.to)
      // A lane to a system that does not exist cannot be validated away here:
      // this function also runs on galaxies parsed from disk.
      if (!a || !b) return ''
      const on = lit.has(laneKey(lane.from, lane.to))
      return el('line', {
        'data-id': lane.id,
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        stroke: on ? theme.highlight : theme.lane,
        'stroke-width': scale.k * (on ? 5 : 2.4),
        'stroke-dasharray': on ? undefined : dash(scale.k * 14, scale.k * 14),
        opacity: on ? 0.95 : 0.55,
      })
    }),
  )
}

function drawSystems(
  galaxy: Galaxy,
  theme: Theme,
  scale: Scale,
  labels: boolean,
  prefix: string,
  lit: ReadonlySet<string>,
): string {
  return group(
    { 'data-layer': 'systems', 'font-family': theme.font, 'font-size': scale.font },
    galaxy.systems.map((system) => drawSystem(system, theme, scale, labels, prefix, lit)),
  )
}

function drawSystem(
  system: StarSystem,
  theme: Theme,
  scale: Scale,
  labels: boolean,
  prefix: string,
  lit: ReadonlySet<string>,
): string {
  const on = lit.has(system.id)
  const parts = [
    el('circle', { r: scale.glow, fill: `url(#${prefix}-sysglow)`, opacity: on ? 0.9 : 0.5 }),
    // The faction ring is dashed until the system is on the highlighted path,
    // where it becomes solid — the difference reads even in greyscale.
    el('circle', {
      r: scale.ring,
      fill: 'none',
      stroke: on ? theme.highlight : pickColor(theme.factions, system.faction?.id),
      'stroke-width': scale.k * (on ? 4.5 : 2),
      'stroke-dasharray': on ? undefined : dash(scale.k * 6, scale.k * 10),
      opacity: on ? 0.95 : 0.4,
    }),
    el('circle', { r: scale.dot, fill: pickColor(theme.stars, system.star.class) }),
    labels
      ? text(system.name, {
          y: -(scale.ring + scale.font * 0.6),
          'text-anchor': 'middle',
          fill: theme.label,
        })
      : '',
  ]
  return el(
    'g',
    {
      'data-kind': 'system',
      'data-id': system.id,
      transform: `translate(${num(system.x)} ${num(system.y)})`,
    },
    parts.filter((part) => part !== '').join('\n'),
  )
}
