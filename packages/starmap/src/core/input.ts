/**
 * The input schema — what you pass to {@link createGalaxy}.
 *
 * The library does not generate universes. You describe one, it checks it, fills
 * in what can be computed, and hands back a {@link Galaxy}. If your game needs
 * procedural universes, write the script that builds this object. `createRng()`
 * is there to make that script deterministic.
 *
 * ## What you must provide
 *
 * | object    | required fields                                  |
 * | --------- | ------------------------------------------------ |
 * | system    | `id`, `name`, `x`, `y`, `star`                   |
 * | star      | `radius`                                         |
 * | planet    | `name`, `orbit`, `radius`                        |
 * | station   | `name`, `orbit`                                  |
 * | gate      | `name`, `orbit`                                  |
 * | belt      | `name`, `orbit`, `width`, `arcStart`, `arcSweep` |
 * | cluster   | `name`, `x`, `y`, `radius`                       |
 * | hyperlane | `from`, `to`                                     |
 *
 * ## What the library fills in
 *
 * - **ids** you left out, built from the parent id and the array position
 *   (`sol-p2-st0`);
 * - **collections** you left out, which become empty arrays;
 * - `Planet.index`, `Station.planetId`, `Hyperlane.length`, `outerLimit`, and
 *   every counter in `meta`;
 * - `angle` and `period`, which default to `0` — "sits still at its starting
 *   position".
 *
 * Everything else — `type`, `class`, `faction`, `security`, `resources`,
 * `richness`, `docks`, `moons`, `habitable`, `density` — stays `undefined` if
 * you leave it out.
 */

import type {
  FactionId,
  GateStatus,
  ObjectRef,
  PlanetType,
  Richness,
  Rock,
  RouteType,
  StarClass,
  StationType,
} from './types'

/** The root of the schema: the object you pass to {@link createGalaxy}. */
export interface GalaxyInput {
  /**
   * A free-form label, copied to `meta.seed`. The library never reads it. Use it
   * to store your own generator's seed, so you can rebuild this universe later.
   */
  seed?: string
  /** A free-form timestamp, copied to `meta.generatedAt`. */
  generatedAt?: string
  systems: SystemInput[]
  /** The inter-system network. Empty by default: you decide what connects. */
  lanes?: LaneInput[]
}

export interface FactionInput {
  id: FactionId
  name: string
}

export interface SystemInput {
  /** Must be unique across the whole galaxy. */
  id: string
  name: string
  /** Position in the galaxy, in world units. */
  x: number
  y: number
  faction?: FactionInput
  /** `0` (lawless) to `1` (safe). */
  security?: number
  star: StarInput
  /** In orbital order: the array position becomes `Planet.index`. */
  planets?: PlanetInput[]
  asteroidFields?: AsteroidFieldInput[]
  gates?: GateInput[]
  /**
   * Radius of the system's edge. Defaults to the reach of its own contents —
   * star, planets, gates, asteroid fields — with no margin added.
   */
  outerLimit?: number
  localRoutes?: LocalRouteInput[]
}

export interface StarInput {
  /** Defaults to `<systemId>-star`. */
  id?: string
  /** Defaults to the system name. */
  name?: string
  class?: StarClass
  /** Radius in world units. */
  radius: number
}

export interface PlanetInput {
  /** Defaults to `<systemId>-p<rank>`. */
  id?: string
  name: string
  type?: PlanetType
  radius: number
  /** Orbit radius, measured from the center of the star. */
  orbit: number
  /** Starting angle in degrees, at t = 0. @default 0 */
  angle?: number
  /** Simulation seconds per full orbit. @default 0 (the planet never moves) */
  period?: number
  moons?: number
  habitable?: boolean
  resources?: string
  stations?: StationInput[]
}

export interface StationInput {
  /** Defaults to `<planetId>-st<rank>`. */
  id?: string
  name: string
  type?: StationType
  /** Orbit radius, measured from the center of the planet. */
  orbit: number
  /** @default 0 */
  angle?: number
  /** @default 0 (the station holds its position relative to its planet) */
  period?: number
  docks?: number
}

export interface GateInput {
  /** Defaults to `<systemId>-gate<rank>`. */
  id?: string
  name: string
  /** Orbit radius around the star. */
  orbit: number
  /** @default 0 */
  angle?: number
  /**
   * Ids of the systems this gate reaches. Empty by default — a dead gate is
   * allowed, but every id you do list must match an existing system.
   */
  links?: string[]
  /** @default 'nominal' */
  status?: GateStatus
}

interface AsteroidFieldInputBase {
  /** Defaults to `<systemId>-ast<rank>`. */
  id?: string
  name: string
  /** `0` to `1`. */
  density?: number
  /** Pre-placed rocks. Empty by default — the library never generates any. */
  rocks?: Rock[]
  richness?: Richness
}

export interface AsteroidBeltInput extends AsteroidFieldInputBase {
  kind: 'belt'
  orbit: number
  /** Radial thickness of the ring. */
  width: number
  /** Where the arc starts, in degrees. */
  arcStart: number
  /** How far the arc spans, in degrees. `360` is a full ring. */
  arcSweep: number
}

export interface AsteroidClusterInput extends AsteroidFieldInputBase {
  kind: 'cluster'
  x: number
  y: number
  radius: number
}

/** Discriminated by `kind`, same as the output type. */
export type AsteroidFieldInput = AsteroidBeltInput | AsteroidClusterInput

export interface LocalRouteInput {
  /** Defaults to `<fromId>><toId>`. */
  id?: string
  /** Both ends must belong to the **same** system. */
  from: ObjectRef
  to: ObjectRef
  type?: RouteType
}

export interface LaneInput {
  /** Defaults to `lane-<from>-<to>`. */
  id?: string
  /** System ids. Undirected: the order does not matter. */
  from: string
  to: string
  /** Defaults to the straight-line distance between the two systems. */
  length?: number
}
