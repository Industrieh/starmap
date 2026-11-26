/**
 * `@industrieh/starmap` — a star-system model for JS/TS games.
 *
 * The library is **pure logic**: no dependencies, no DOM, nothing about
 * rendering. The same code runs in a browser, in Node or Bun, in a worker, on a
 * server, under React Native, or inside a game engine. How you draw it — SVG,
 * Canvas, WebGL, a terminal — is entirely up to you.
 *
 * It does not generate universes either. You describe yours with a typed object
 * ({@link GalaxyInput}); `createGalaxy()` checks it and fills in the derivable
 * parts. If you want procedural generation, write the script that builds that
 * object — `createRng()` is there to keep it deterministic.
 *
 * @example Describe, build, query
 * ```ts
 * import { createGalaxy, findRoute, indexGalaxy } from '@industrieh/starmap'
 *
 * const galaxy = createGalaxy({
 *   systems: [
 *     { id: 'sol', name: 'Sol', x: 0, y: 0, star: { radius: 18, class: 'G' },
 *       planets: [{ name: 'Earth', orbit: 120, radius: 6, period: 20, habitable: true }] },
 *     { id: 'alpha', name: 'Alpha', x: 300, y: 80, star: { radius: 14 } },
 *   ],
 *   lanes: [{ from: 'sol', to: 'alpha' }],
 * })
 *
 * indexGalaxy(galaxy).get('sol-p0')?.kind   // 'planet'
 * findRoute(galaxy, 'sol', 'alpha')         // { systemIds, distance, jumps }
 * ```
 *
 * @packageDocumentation
 */

// --- building
export { createGalaxy, type CreateGalaxyOptions } from './core/create'
export { FORMAT_VERSION } from './core/format'

// --- the input schema
export type {
  AsteroidBeltInput,
  AsteroidClusterInput,
  AsteroidFieldInput,
  FactionInput,
  GalaxyInput,
  GateInput,
  LaneInput,
  LocalRouteInput,
  PlanetInput,
  StarInput,
  StationInput,
  SystemInput,
} from './core/input'

// --- checking
export {
  assertValidGalaxy,
  GalaxyValidationError,
  validateGalaxy,
  type GalaxyIssue,
} from './core/validate'

// --- deterministic randomness, for writing your own generator
export { createRng, hashSeed, mulberry32, type Rng, type Weighted } from './core/rng'

// --- orbital geometry
export { fieldCenter, orbitPos, round, systemPositions, toRad } from './core/geometry'

// --- reading a galaxy
export {
  connectedComponents,
  findRoute,
  indexGalaxy,
  indexNetwork,
  indexSystems,
  lanesOf,
  neighboursOf,
  stationsOf,
  systemOf,
  type Route,
} from './core/query'

// --- the data contract
export type {
  AsteroidBelt,
  AsteroidCluster,
  AsteroidField,
  Faction,
  FactionId,
  Galaxy,
  GalaxyIndex,
  GalaxyMeta,
  Gate,
  GateStatus,
  Hyperlane,
  HyperlaneNetwork,
  IndexEntry,
  LocalRoute,
  ObjectKind,
  ObjectRef,
  Planet,
  PlanetType,
  Richness,
  Rock,
  RouteType,
  Star,
  StarClass,
  StarSystem,
  Station,
  StationType,
  SystemsById,
  Vec2,
} from './core/types'
