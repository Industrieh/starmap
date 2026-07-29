/**
 * The look of a drawing, passed in as a parameter.
 *
 * `@cotontigeh/starmap` carries no `color` and no display label: mapping
 * `planet.type` to an appearance is a decision of the project that displays it.
 * This is where that decision enters.
 *
 * Two layers, the same way the core splits `GalaxyInput` from `Galaxy`:
 *
 * - {@link ThemeInput} is what you write. Every field is optional, and a table
 *   you pass is merged over the default one, so overriding a single colour does
 *   not mean restating the other twenty.
 * - {@link Theme} is what the drawing functions read. Everything is filled in.
 *
 * {@link resolveTheme} goes from one to the other.
 *
 * @example Two colours changed, the rest inherited
 * ```ts
 * const svg = renderSystem(system, {
 *   theme: { background: '#000', planets: { terran: '#7ee787' } },
 * })
 * ```
 */

/**
 * A colour per key, plus the one to use for a key the table does not list.
 *
 * The core's vocabularies (`PlanetType`, `StarClass`, …) are open unions: a
 * project may invent `'shattered'` and the model accepts it. A table therefore
 * cannot be exhaustive, and `default` is what keeps a drawing complete.
 */
export interface ColorMap {
  /** Used for any key absent from this table. */
  default: string
  [key: string]: string
}

/** How a local route is stroked. */
export interface RouteStyle {
  stroke: string
  /** SVG `stroke-dasharray`. Each route type gets a distinct pattern, so the
   * map stays readable in greyscale and to a colourblind reader. */
  dash: string
  /** Stroke width, in world units. */
  width: number
}

/** A style per route type, plus the one for a type it does not list. */
export interface RouteStyleMap {
  /** Used for any route type absent from this table. */
  default: RouteStyle
  [key: string]: RouteStyle
}

/** A complete look. Every drawing function reads one of these. */
export interface Theme {
  /** Fills the whole viewBox. */
  background: string
  /** The decorative star field behind everything. */
  backdropStar: string
  /** Text colour. */
  label: string
  /** Font stack written on the label groups. */
  font: string
  /** Planet orbit circles. */
  orbit: string
  /** Gate orbit circles, dashed. */
  gateOrbit: string
  /** Hyperlanes on the galaxy map. */
  lane: string
  /** Hyperlanes and systems on the highlighted path. */
  highlight: string
  /** Ring drawn around a planet whose `habitable` is true. */
  habitable: string
  /** Gate body. */
  gate: string
  /** Ring drawn around a gate whose `status` is `'unstable'`. */
  gateUnstable: string
  /** Outline of an asteroid belt or cluster. */
  field: string
  /** The rocks of an asteroid field. */
  rock: string
  /** By `star.class`. */
  stars: ColorMap
  /** By `planet.type`. */
  planets: ColorMap
  /** By `station.type`. */
  stations: ColorMap
  /** By `faction.id`. Drawn as the ring around a system on the galaxy map. */
  factions: ColorMap
  /** By `localRoute.type`. */
  routes: RouteStyleMap
}

/** A partial {@link Theme}. Anything you leave out comes from {@link DEFAULT_THEME}. */
export interface ThemeInput {
  background?: string
  backdropStar?: string
  label?: string
  font?: string
  orbit?: string
  gateOrbit?: string
  lane?: string
  highlight?: string
  habitable?: string
  gate?: string
  gateUnstable?: string
  field?: string
  rock?: string
  stars?: Readonly<Record<string, string>>
  planets?: Readonly<Record<string, string>>
  stations?: Readonly<Record<string, string>>
  factions?: Readonly<Record<string, string>>
  routes?: Readonly<Record<string, RouteStyle>>
}

/**
 * A dark theme, complete and ready to use.
 *
 * The colours are the ones the repo's first renderer used, kept because they are
 * calibrated against each other rather than because they are the only sensible
 * ones. Treat it as a starting point.
 */
export const DEFAULT_THEME: Theme = {
  background: '#070b16',
  backdropStar: '#cdd9ff',
  label: '#dbe4f5',
  font: 'ui-sans-serif, system-ui, sans-serif',
  orbit: '#2b3d63',
  gateOrbit: '#43356e',
  lane: '#39507a',
  highlight: '#9a7bff',
  habitable: '#4fd8a5',
  gate: '#9a7bff',
  gateUnstable: '#ff6b81',
  field: '#6b5a2a',
  rock: '#a89468',
  stars: {
    O: '#9bb0ff',
    B: '#aabfff',
    A: '#cad7ff',
    F: '#f8f7ff',
    G: '#ffe9a8',
    K: '#ffc16f',
    M: '#ff8f5a',
    default: '#ffe9a8',
  },
  planets: {
    lava: '#e2542c',
    rocky: '#a08d7d',
    desert: '#d9a45b',
    barren: '#8b8377',
    terran: '#4fae6a',
    ocean: '#2f8fd8',
    toxic: '#9ac93b',
    gas: '#d8a06a',
    'ice-giant': '#6fb6d9',
    frozen: '#cfe4f0',
    default: '#8b8377',
  },
  stations: {
    trade: '#61d6c4',
    mining: '#c9a227',
    military: '#ff6b81',
    research: '#7fb3ff',
    shipyard: '#d0a6ff',
    default: '#9fb4d8',
  },
  factions: {
    neutral: '#8e9bb3',
    consortium: '#4ea3ff',
    covenant: '#ff5c72',
    syndicate: '#c78bff',
    pilgrims: '#4fd8a5',
    default: '#8e9bb3',
  },
  routes: {
    orbital: { stroke: '#5f7fa8', dash: '6 8', width: 1.1 },
    shortcut: { stroke: '#43607f', dash: '2 10', width: 0.9 },
    docking: { stroke: '#61d6c4', dash: '3 4', width: 0.8 },
    'jump-lane': { stroke: '#9a7bff', dash: '10 6', width: 1.4 },
    mining: { stroke: '#c9a227', dash: '4 6', width: 0.9 },
    default: { stroke: '#5f7fa8', dash: '6 8', width: 1.1 },
  },
}

/**
 * Fill a {@link ThemeInput} in from {@link DEFAULT_THEME}.
 *
 * Tables are merged key by key, so `{ planets: { terran: '#7ee787' } }` keeps
 * every other planet colour. Nothing is merged deeper than that: a `RouteStyle`
 * is replaced whole, because a dash pattern without its width is not a style.
 *
 * Cheap, but not free. Resolve once and pass the result if you render every
 * frame.
 */
export function resolveTheme(input: ThemeInput = {}): Theme {
  return {
    ...DEFAULT_THEME,
    ...stripUndefined(input),
    stars: { ...DEFAULT_THEME.stars, ...input.stars },
    planets: { ...DEFAULT_THEME.planets, ...input.planets },
    stations: { ...DEFAULT_THEME.stations, ...input.stations },
    factions: { ...DEFAULT_THEME.factions, ...input.factions },
    routes: { ...DEFAULT_THEME.routes, ...input.routes },
  }
}

/** Colour for a key, falling back to the table's `default`. */
export function pickColor(table: ColorMap, key: string | undefined): string {
  return (key === undefined ? undefined : table[key]) ?? table.default
}

/** Style for a route type, falling back to the table's `default`. */
export function pickRouteStyle(table: RouteStyleMap, key: string | undefined): RouteStyle {
  return (key === undefined ? undefined : table[key]) ?? table.default
}

// ---------------------------------------------------------------- internals

/**
 * Drop keys explicitly set to `undefined`.
 *
 * `{ ...defaults, ...input }` would otherwise let `{ background: undefined }`
 * erase a colour and leave a hole in the output.
 */
function stripUndefined(input: ThemeInput): ThemeInput {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) out[key] = value
  }
  return out as ThemeInput
}
