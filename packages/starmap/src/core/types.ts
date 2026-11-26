/**
 * The data contract — what the library gives back.
 *
 * `createGalaxy()` returns a {@link Galaxy} made of these types. They describe
 * **frozen terrain**: nothing here represents a game in progress. Never mutate a
 * `Galaxy` — keep your game state in a separate object, keyed by the same ids.
 *
 * For what you pass *in*, see `input.ts`. Input types are more forgiving: ids,
 * counts and empty collections can be left out.
 *
 * Fields you did not provide, and that cannot be computed, stay `undefined` —
 * hence the `?` on `type`, `class`, `faction`, `security` and friends. The
 * library never invents a meaningful value for you.
 *
 * Nothing here is about rendering: no colors, no display labels, no styling.
 * Map `planet.type` to an appearance in your own code.
 */

/** A point in the plane, in world units. */
export interface Vec2 {
  x: number
  y: number
}

/**
 * An open union. The listed values show up in autocomplete; any other string is
 * still accepted. `(string & {})` is what stops TypeScript from collapsing the
 * whole union down to `string`.
 */
type Known<T extends string> = T | (string & {})

// ------------------------------------------------------------------ factions

/** Autocomplete suggestions. The library imposes no vocabulary. */
export type FactionId = Known<'neutral' | 'consortium' | 'covenant' | 'syndicate' | 'pilgrims'>

export interface Faction {
  id: FactionId
  name: string
}

// --------------------------------------------------------------------- stars

/** Spectral class. Autocomplete suggestions. */
export type StarClass = Known<'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M'>

export interface Star {
  id: string
  name: string
  class?: StarClass
  /** Radius in world units. */
  radius: number
}

// --------------------------------------------------------- planets, stations

/** Autocomplete suggestions. */
export type PlanetType = Known<
  | 'lava'
  | 'rocky'
  | 'desert'
  | 'barren'
  | 'terran'
  | 'ocean'
  | 'toxic'
  | 'gas'
  | 'ice-giant'
  | 'frozen'
>

/** Autocomplete suggestions. */
export type StationType = Known<'trade' | 'mining' | 'military' | 'research' | 'shipyard'>

export interface Station {
  id: string
  name: string
  type?: StationType
  /** The planet this station orbits. Always filled in by `createGalaxy()`. */
  planetId: string
  /** Orbit radius, measured from the center of the planet. */
  orbit: number
  /** Starting angle in degrees, at t = 0. */
  angle: number
  /** Simulation seconds per full orbit. `0` means the station never moves. */
  period: number
  /** Free-form. The library never reads it. */
  docks?: number
}

export interface Planet {
  id: string
  name: string
  /** Orbital rank. `0` is the first planet in the array. */
  index: number
  type?: PlanetType
  radius: number
  /** Orbit radius, measured from the center of the star. */
  orbit: number
  /** Starting angle in degrees, at t = 0. */
  angle: number
  /** Simulation seconds per full orbit. `0` means the planet never moves. */
  period: number
  moons?: number
  habitable?: boolean
  resources?: string
  stations: Station[]
}

// ------------------------------------------------------------ asteroid fields

/**
 * One asteroid: `[x, y, radius]`, in system coordinates.
 *
 * A tuple rather than an object, on purpose. A field can hold hundreds of rocks,
 * and `{"x":1,"y":2,"r":3}` is four times the size of `[1,2,3]` in JSON.
 */
export type Rock = [x: number, y: number, r: number]

/** Autocomplete suggestions. */
export type Richness = Known<'poor' | 'modest' | 'rich' | 'exceptional'>

interface AsteroidFieldBase {
  id: string
  name: string
  /** `0` to `1`. A hint for your game logic: mining yield, danger, and so on. */
  density?: number
  /** Pre-placed rocks. May be empty — the library never generates any. */
  rocks: Rock[]
  richness?: Richness
}

/** An arc of a ring, somewhere between two planetary orbits. */
export interface AsteroidBelt extends AsteroidFieldBase {
  kind: 'belt'
  orbit: number
  /** Radial thickness of the ring. */
  width: number
  /** Where the arc starts, in degrees. */
  arcStart: number
  /** How far the arc spans, in degrees. `360` is a full ring. */
  arcSweep: number
}

/** A local pocket of asteroids, anywhere in the system. */
export interface AsteroidCluster extends AsteroidFieldBase {
  kind: 'cluster'
  x: number
  y: number
  radius: number
}

/** Discriminated by `kind`: `'belt'` or `'cluster'`. */
export type AsteroidField = AsteroidBelt | AsteroidCluster

// --------------------------------------------------------------------- gates

export type GateStatus = Known<'nominal' | 'unstable'>

/** A jump point to one or more neighbouring systems. */
export interface Gate {
  id: string
  name: string
  /** Orbit radius around the star. */
  orbit: number
  angle: number
  /** Ids of the systems this gate reaches. An empty list means a dead gate. */
  links: string[]
  status: GateStatus
}

// -------------------------------------------------------------- local routes

export type RouteType = Known<'orbital' | 'shortcut' | 'docking' | 'jump-lane' | 'mining'>

/** What an object is. Discriminates references and index entries. */
export type ObjectKind = 'system' | 'star' | 'planet' | 'station' | 'gate' | 'field'

/** A pointer to an object: enough to look it up in the index. */
export interface ObjectRef {
  kind: ObjectKind
  id: string
}

/** A link between two objects inside the same system. */
export interface LocalRoute {
  id: string
  from: ObjectRef
  to: ObjectRef
  type?: RouteType
}

// -------------------------------------------------------------------- galaxy

export interface StarSystem {
  id: string
  name: string
  /** Position in the galaxy, in world units. */
  x: number
  y: number
  faction?: Faction
  /** `0` (lawless) to `1` (safe). */
  security?: number
  star: Star
  planets: Planet[]
  asteroidFields: AsteroidField[]
  gates: Gate[]
  /**
   * Radius of the system's edge. When computed — you did not provide it — it is
   * exactly how far the contents reach: the star, every planet and the stations
   * around it, every gate, every asteroid field and its rocks. No margin.
   */
  outerLimit: number
  localRoutes: LocalRoute[]
}

/** A link between two systems. Undirected: `from` and `to` are interchangeable. */
export interface Hyperlane {
  id: string
  from: string
  to: string
  /** Distance in world units. Computed from the two positions if you omit it. */
  length: number
}

export interface GalaxyMeta {
  /**
   * A free-form label, copied straight from your input. The library never reads
   * it. If a script generates your universe, put its seed here so you can
   * rebuild the same galaxy later.
   */
  seed?: string
  /** A free-form timestamp, copied straight from your input. */
  generatedAt?: string
  /**
   * The library's `FORMAT_VERSION` at the time this galaxy was built. Compare it
   * to the current `FORMAT_VERSION` when loading a save, to detect that the data
   * contract has moved on.
   */
  formatVersion: number
  systemCount: number
  laneCount: number
  planetCount: number
  stationCount: number
  gateCount: number
  asteroidFieldCount: number
  /** Radius of the disc enclosing every system, measured from the origin. */
  galaxyRadius: number
}

/** A complete universe. Treat it as immutable. */
export interface Galaxy {
  meta: GalaxyMeta
  systems: StarSystem[]
  lanes: Hyperlane[]
}

// ------------------------------------------------------------------- queries

/**
 * One entry of the global index. `kind` discriminates `obj`, so a `switch` on it
 * is fully typed with no casting.
 */
export type IndexEntry =
  | { kind: 'system'; obj: StarSystem; systemId: string }
  | { kind: 'star'; obj: Star; systemId: string }
  | { kind: 'planet'; obj: Planet; systemId: string }
  | { kind: 'station'; obj: Station; systemId: string }
  | { kind: 'gate'; obj: Gate; systemId: string }
  | { kind: 'field'; obj: AsteroidField; systemId: string }

/** id → object, every kind mixed together. Built by `indexGalaxy()`. */
export type GalaxyIndex = ReadonlyMap<string, IndexEntry>

/** id → system. Built by `indexSystems()`. */
export type SystemsById = ReadonlyMap<string, StarSystem>

/**
 * The hyperlane network, indexed for traversal. Built by `indexNetwork()`, and
 * accepted in place of a `Galaxy` by `findRoute()`, `neighboursOf()`,
 * `lanesOf()` and `connectedComponents()`.
 */
export interface HyperlaneNetwork {
  /** id → system, in the galaxy's order. */
  readonly systems: SystemsById
  /** system id → every lane touching it, in the galaxy's order. */
  readonly lanes: ReadonlyMap<string, readonly Hyperlane[]>
}
