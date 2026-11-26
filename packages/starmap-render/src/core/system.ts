/**
 * Drawing one star system: the star, its orbits, planets, stations, gates and
 * asteroid fields, at a given moment.
 *
 * Everything is drawn in the **system's own frame** — the star at `(0, 0)`,
 * distances in world units — and the `viewBox` does the scaling. No coordinate
 * is ever converted to pixels, which is what lets the same string be a 32-pixel
 * thumbnail and a full-screen map.
 *
 * Positions come from `systemPositions(system, t)` in the core. Nothing is
 * stored between calls: render at `t`, render again at `t + dt`, and the planets
 * have moved.
 *
 * @example
 * ```ts
 * const svg = renderSystem(galaxy.systems[0], { t: 12.5 })
 * ```
 */

import {
  systemPositions,
  type StarSystem,
  type Station,
  type SystemsById,
  type Vec2,
} from '@industrieh/starmap'

import {
  arcPath,
  backdropStars,
  systemScale,
  systemViewBox,
  SYSTEM_MARGIN,
  type SystemScale,
  type ViewBox,
} from './geometry'
import { svgDocument, type DocumentOptions } from './root'
import { background, dash, el, group, idPrefixOf, num, text } from './svg'
import { pickColor, pickRouteStyle, resolveTheme, type Theme, type ThemeInput } from './theme'

/** The layers of a system drawing. */
export type SystemLayer =
  | 'defs'
  | 'background'
  | 'backdrop'
  | 'orbits'
  | 'fields'
  | 'routes'
  | 'star'
  | 'planets'
  | 'gates'

/**
 * Every layer of a system drawing, bottom to top — the order they are always
 * drawn in.
 *
 * Only `routes` and `planets` (stations ride with their planet) depend on `t`.
 * An animation can draw the others once and redraw just those two each frame.
 */
export const SYSTEM_LAYERS: readonly SystemLayer[] = [
  'defs',
  'background',
  'backdrop',
  'orbits',
  'fields',
  'routes',
  'star',
  'planets',
  'gates',
]

/** Options of {@link renderSystem} and {@link renderSystemContent}. */
export interface RenderSystemOptions extends DocumentOptions {
  /**
   * Simulation time, in seconds. Compared against each object's `period`, the
   * same way `systemPositions()` does it.
   * @default 0
   */
  t?: number
  /**
   * Colours. Anything left out comes from `DEFAULT_THEME`. A theme returned by
   * `resolveTheme()` is used as is, with no merge — resolve it once when you
   * render every frame.
   */
  theme?: ThemeInput
  /**
   * Empty space around the system's edge, as a fraction of `outerLimit`.
   * @default 0.45
   */
  margin?: number
  /**
   * Draw the names of planets and gates.
   * @default true
   */
  labels?: boolean
  /**
   * How many decorative background stars. `0` draws none.
   * @default 260
   */
  backdrop?: number
  /**
   * Prefix of the ids this drawing generates, for its three gradients.
   *
   * Two SVGs sharing a page share one id namespace, and the gradients carry the
   * star's colour — so two drawings with one prefix would both wear the first
   * one's. The default is built from the system's id, so two systems never
   * collide; pass your own only to draw the same system twice on one page, with
   * two themes. Characters an XML id cannot hold are replaced by `_`.
   * @default `starmap-<system id>`
   */
  idPrefix?: string
  /**
   * Index of the galaxy's systems, from `indexSystems(galaxy)`. When given, a
   * gate label names where it leads.
   */
  systems?: SystemsById
  /**
   * Draw only these layers — always in their usual order, whatever order you
   * list them in. All of {@link SYSTEM_LAYERS} by default.
   *
   * @example Redraw only what moves
   * ```ts
   * const still = renderSystemContent(system, { layers: ['defs', 'background', 'backdrop', 'orbits', 'fields'] })
   * const moving = renderSystemContent(system, { t, layers: ['routes', 'planets'] })
   * ```
   */
  layers?: readonly SystemLayer[]
}

/**
 * Draw a system as a standalone SVG document.
 *
 * @returns a complete `<svg>…</svg>` string — write it to a file, inline it in a
 * page, or put it in a `data:` URI
 */
export function renderSystem(system: StarSystem, options: RenderSystemOptions = {}): string {
  const view = systemViewBox(system, options.margin ?? SYSTEM_MARGIN)
  return svgDocument(view, renderSystemContent(system, options), options)
}

/**
 * Draw a system's layers, without the `<svg>` element around them.
 *
 * This is what an interactive application wants: it owns the root element, so it
 * owns the `viewBox`, and pan and zoom are then nothing more than changing it.
 * Use {@link systemViewBox} to get the same framing this package would have
 * used.
 *
 * @example
 * ```ts
 * const body = renderSystemContent(system, { t })
 * const box = systemViewBox(system)
 * container.innerHTML = `<svg viewBox="${viewBoxAttr(box)}">${body}</svg>`
 * ```
 */
export function renderSystemContent(system: StarSystem, options: RenderSystemOptions = {}): string {
  const { t = 0, labels = true, backdrop = 260, margin = SYSTEM_MARGIN, systems } = options

  const prefix = idPrefixOf(options.idPrefix ?? `starmap-${system.id}`)
  const theme = resolveTheme(options.theme)
  const view = systemViewBox(system, margin)
  const scale = systemScale(view)
  const starColor = pickColor(theme.stars, system.star.class)

  // Positions are only worked out if a layer that needs them is drawn.
  let positions: ReadonlyMap<string, Vec2> | undefined
  const pos = (): ReadonlyMap<string, Vec2> => (positions ??= systemPositions(system, t))

  const draw: Record<SystemLayer, () => string> = {
    defs: () => defs(prefix, starColor, theme),
    background: () => background(view, theme.background),
    backdrop: () => drawBackdrop(system, view, theme, backdrop, scale),
    orbits: () => drawOrbits(system, theme, scale),
    fields: () => drawFields(system, theme, scale),
    routes: () => drawRoutes(system, pos(), theme, scale),
    star: () => drawStar(system, prefix),
    planets: () => drawPlanets(system, pos(), theme, scale, labels, prefix),
    gates: () => drawGates(system, pos(), theme, scale, labels, systems),
  }
  const wanted = new Set(options.layers ?? SYSTEM_LAYERS)

  return SYSTEM_LAYERS.filter((layer) => wanted.has(layer))
    .map((layer) => draw[layer]())
    .filter((layer) => layer !== '')
    .join('\n')
}

// ---------------------------------------------------------------- internals

/**
 * The three radial gradients that give the drawing its volume.
 *
 * Declared once and referenced by every object that needs them. They replace
 * blur filters, which are the expensive part of an SVG to rasterize.
 *
 * - `glow` — the star's halo: its colour, fading to nothing.
 * - `core` — the stellar disc: the theme's light at the centre, its colour at
 *   the edge.
 * - `shade` — planet volume, from the theme's light to its shade. Off-centre on
 *   purpose, so the lit side is up and to the left. The light does **not**
 *   follow the star: at these sizes the difference is invisible, and a fixed
 *   gradient is shared by every planet instead of one gradient each.
 */
function defs(prefix: string, starColor: string, theme: Theme): string {
  return el(
    'defs',
    {},
    [
      el(
        'radialGradient',
        { id: `${prefix}-glow` },
        [
          stop('0%', starColor, 0.85),
          stop('35%', starColor, 0.22),
          stop('100%', starColor, 0),
        ].join(''),
      ),
      el(
        'radialGradient',
        { id: `${prefix}-core` },
        [stop('0%', theme.light), stop('60%', starColor), stop('100%', starColor, 0.85)].join(''),
      ),
      el(
        'radialGradient',
        { id: `${prefix}-shade`, cx: '0.32', cy: '0.3', r: '0.85' },
        [
          stop('0%', theme.light, 0.28),
          stop('45%', theme.shade, 0),
          stop('100%', theme.shade, 0.6),
        ].join(''),
      ),
    ].join('\n'),
  )
}

/** One `<stop>` of a gradient. */
function stop(offset: string, color: string, opacity?: number): string {
  return el('stop', { offset, 'stop-color': color, 'stop-opacity': opacity })
}

function drawBackdrop(
  system: StarSystem,
  view: ViewBox,
  theme: Theme,
  count: number,
  scale: SystemScale,
): string {
  // Seeded with the system's id: the same system always gets the same sky, and
  // two systems never get the same one. A system's view is centred on its star,
  // which is where the stars are sown.
  const stars = backdropStars(count, view.w * 0.55, system.id, scale.u / 2)
  return group(
    { 'data-layer': 'backdrop', fill: theme.backdropStar },
    stars.map((s) => el('circle', { cx: s.x, cy: s.y, r: s.r, opacity: s.o })),
  )
}

function drawOrbits(system: StarSystem, theme: Theme, scale: SystemScale): string {
  return group({ 'data-layer': 'orbits', fill: 'none' }, [
    ...system.planets.map((p) =>
      el('circle', {
        r: p.orbit,
        stroke: theme.orbit,
        'stroke-width': scale.k * 0.7,
        opacity: 0.75,
      }),
    ),
    ...system.gates.map((g) =>
      el('circle', {
        r: g.orbit,
        stroke: theme.gateOrbit,
        'stroke-width': scale.k * 0.6,
        'stroke-dasharray': dash(scale.u * 0.75, scale.u * 2.25),
        opacity: 0.7,
      }),
    ),
  ])
}

function drawFields(system: StarSystem, theme: Theme, scale: SystemScale): string {
  return group(
    { 'data-layer': 'fields' },
    system.asteroidFields.map((f) => {
      // A belt is one thick stroke along its arc; a cluster is a dashed circle.
      // Both are then filled with whatever rocks the model carries.
      const shape =
        f.kind === 'belt'
          ? el('path', {
              d: arcPath(f.orbit, f.arcStart, f.arcSweep),
              fill: 'none',
              stroke: theme.field,
              'stroke-width': f.width + scale.u * 2,
              'stroke-opacity': 0.22,
            })
          : el('circle', {
              cx: f.x,
              cy: f.y,
              r: f.radius + scale.u * 1.5,
              fill: theme.field,
              'fill-opacity': 0.05,
              stroke: theme.field,
              'stroke-width': scale.k * 0.8,
              'stroke-dasharray': dash(scale.u, scale.u * 1.5),
            })
      const rocks = f.rocks.map((r) =>
        el('circle', { cx: r[0], cy: r[1], r: r[2], fill: theme.rock, opacity: 0.85 }),
      )
      return el(
        'g',
        { 'data-kind': 'field', 'data-id': f.id },
        [shape, ...rocks].filter((part) => part !== '').join('\n'),
      )
    }),
  )
}

/**
 * Local routes, drawn before every object so they pass underneath.
 *
 * A route points at two objects by id, and both ends are looked up in the
 * positions of this very frame — so a route to a station follows it around its
 * planet.
 */
function drawRoutes(
  system: StarSystem,
  pos: ReadonlyMap<string, Vec2>,
  theme: Theme,
  scale: SystemScale,
): string {
  return group(
    { 'data-layer': 'routes' },
    system.localRoutes.map((route) => {
      const a = pos.get(route.from.id)
      const b = pos.get(route.to.id)
      // A route to the system itself has no position: the core allows it, and
      // there is nothing to draw.
      if (!a || !b) return ''
      const style = pickRouteStyle(theme.routes, route.type)
      return el('line', {
        'data-kind': 'route',
        'data-id': route.id,
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        stroke: style.stroke,
        'stroke-width': style.width * scale.k,
        'stroke-dasharray': scaledDash(style.dash, scale.k),
        opacity: 0.55,
      })
    }),
  )
}

/**
 * A theme's dash pattern, scaled to the view.
 *
 * It follows the `stroke-dasharray` syntax: lengths separated by spaces, commas,
 * or both. An empty pattern, `none`, or anything that is not a list of
 * non-negative numbers draws a solid line.
 */
function scaledDash(pattern: string, k: number): string | undefined {
  const parts = pattern
    .trim()
    .split(/[\s,]+/)
    .filter((part) => part !== '')
  if (parts.length === 0) return undefined
  const lengths = parts.map(Number)
  if (lengths.some((n) => !Number.isFinite(n) || n < 0)) return undefined
  return dash(...lengths.map((n) => n * k))
}

function drawStar(system: StarSystem, prefix: string): string {
  const { star } = system
  return el(
    'g',
    { 'data-kind': 'star', 'data-id': star.id },
    [
      // Two circles: the halo, six times the disc — it is what reads as
      // brightness — and the disc itself, white-hot at its core.
      el('circle', { r: star.radius * 6, fill: `url(#${prefix}-glow)` }),
      el('circle', { r: star.radius, fill: `url(#${prefix}-core)` }),
    ].join('\n'),
  )
}

function drawPlanets(
  system: StarSystem,
  pos: ReadonlyMap<string, Vec2>,
  theme: Theme,
  scale: SystemScale,
  labels: boolean,
  prefix: string,
): string {
  return group(
    { 'data-layer': 'planets', 'font-family': theme.font, 'font-size': scale.font },
    system.planets.map((planet) => {
      const at = pos.get(planet.id)
      if (!at) return ''
      const color = pickColor(theme.planets, planet.type)
      const r = planet.radius

      const parts = [
        // A ring, drawn *before* the disc so the disc hides its near half —
        // which is the whole trick that reads as perspective. The theme lists
        // the types that get one (gas and ice giants by default), for planets
        // with three moons or more: `moons` is only used as a hint that the
        // planet is big, moons themselves are never drawn.
        isRinged(planet.type, theme) && (planet.moons ?? 0) >= 3
          ? el('ellipse', {
              rx: r * 1.9,
              ry: r * 0.55,
              fill: 'none',
              stroke: color,
              'stroke-opacity': 0.45,
              'stroke-width': r * 0.28,
              transform: 'rotate(-18)',
            })
          : '',
        el('circle', { r, fill: color }),
        // The shading gradient, plain on top of the colour disc.
        el('circle', { r, fill: `url(#${prefix}-shade)` }),
        planet.habitable === true
          ? el('circle', {
              r: r + scale.u * 0.9,
              fill: 'none',
              stroke: theme.habitable,
              'stroke-width': scale.k * 0.8,
              opacity: 0.8,
            })
          : '',
        labels
          ? text(planet.name, {
              y: -(r + scale.u * 1.5),
              'text-anchor': 'middle',
              fill: theme.label,
            })
          : '',
        ...planet.stations.map((station) => drawStation(station, at, pos, theme, scale)),
      ]

      return el(
        'g',
        { 'data-kind': 'planet', 'data-id': planet.id, transform: translate(at) },
        parts.filter((part) => part !== '').join('\n'),
      )
    }),
  )
}

/**
 * A station: a small diamond, positioned **relative to its planet** because the
 * enclosing group already carries the planet's translation.
 */
function drawStation(
  station: Station,
  planetAt: Vec2,
  pos: ReadonlyMap<string, Vec2>,
  theme: Theme,
  scale: SystemScale,
): string {
  const at = pos.get(station.id)
  if (!at) return ''
  const half = scale.u * 0.55
  return el(
    'g',
    {
      'data-kind': 'station',
      'data-id': station.id,
      transform: translate({ x: at.x - planetAt.x, y: at.y - planetAt.y }),
    },
    el('rect', {
      x: -half,
      y: -half,
      width: half * 2,
      height: half * 2,
      fill: pickColor(theme.stations, station.type),
      transform: 'rotate(45)',
    }),
  )
}

function drawGates(
  system: StarSystem,
  pos: ReadonlyMap<string, Vec2>,
  theme: Theme,
  scale: SystemScale,
  labels: boolean,
  systems: SystemsById | undefined,
): string {
  return group(
    { 'data-layer': 'gates', 'font-family': theme.font, 'font-size': scale.font },
    system.gates.map((gate) => {
      const at = pos.get(gate.id)
      if (!at) return ''
      const parts = [
        el('circle', {
          r: scale.u * 2.8,
          fill: theme.gate,
          'fill-opacity': 0.1,
          stroke: theme.gate,
          'stroke-width': scale.k,
        }),
        // The square is turned with the gate, so a ring of gates does not look
        // stamped from one mould.
        el('rect', {
          x: -scale.u,
          y: -scale.u,
          width: scale.u * 2,
          height: scale.u * 2,
          fill: theme.gate,
          transform: `rotate(${num(45 + gate.angle)})`,
        }),
        gate.status === 'unstable'
          ? el('circle', {
              r: scale.u * 3.5,
              fill: 'none',
              stroke: theme.gateUnstable,
              'stroke-width': scale.k * 0.7,
              'stroke-dasharray': dash(scale.u * 0.5, scale.u * 0.75),
            })
          : '',
        labels
          ? text(gateLabel(gate.name, gate.links, systems), {
              y: -(scale.u * 4.5),
              'text-anchor': 'middle',
              fill: theme.label,
            })
          : '',
      ]
      return el(
        'g',
        { 'data-kind': 'gate', 'data-id': gate.id, transform: translate(at) },
        parts.filter((part) => part !== '').join('\n'),
      )
    }),
  )
}

/** `Sol Gate` on its own, or `Sol Gate → Vega` when the systems are known. */
function gateLabel(
  name: string,
  links: readonly string[],
  systems: SystemsById | undefined,
): string {
  if (!systems) return name
  const destinations = links.map((id) => systems.get(id)?.name).filter((n) => n !== undefined)
  return destinations.length ? `${name} → ${destinations.join(', ')}` : name
}

const isRinged = (type: string | undefined, theme: Theme): boolean =>
  type !== undefined && theme.ringed.includes(type)

/** `translate(x y)`, rounded like every other coordinate. */
function translate(at: Vec2): string {
  return `translate(${num(at.x)} ${num(at.y)})`
}
