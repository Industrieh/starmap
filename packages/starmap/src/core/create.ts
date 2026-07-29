/**
 * Building a universe from a description.
 *
 * `createGalaxy()` is the entry point of the library. It takes the object you
 * give it (see {@link GalaxyInput}), fills in what can be computed, checks the
 * result, and returns a {@link Galaxy} ready to query, serialize or render.
 *
 * One rule explains every default in this file:
 *
 * > Compute what is derivable. Never invent a value that carries meaning.
 *
 * An id, a counter, a lane length or a system's edge all follow from what you
 * provided, so the library fills them in. A planet's type, a system's faction or
 * a field's richness do not, so they stay `undefined`.
 *
 * @example A minimal universe
 * ```ts
 * const galaxy = createGalaxy({
 *   systems: [
 *     { id: 'sol', name: 'Sol', x: 0, y: 0, star: { radius: 18 },
 *       planets: [{ name: 'Earth', orbit: 120, radius: 6, period: 20 }] },
 *     { id: 'alpha', name: 'Alpha', x: 300, y: 80, star: { radius: 14 } },
 *   ],
 *   lanes: [{ from: 'sol', to: 'alpha' }],
 * })
 *
 * galaxy.systems[0].planets[0].id  // 'sol-p0'  — derived
 * galaxy.lanes[0].length           // 310.48    — derived from the positions
 * galaxy.meta.planetCount          // 1
 * ```
 */

import { round } from './geometry'
import type {
  AsteroidFieldInput,
  GalaxyInput,
  GateInput,
  LaneInput,
  LocalRouteInput,
  PlanetInput,
  StationInput,
  SystemInput,
} from './input'
import type {
  AsteroidField,
  Galaxy,
  Gate,
  Hyperlane,
  LocalRoute,
  Planet,
  StarSystem,
  Station,
} from './types'
import { assertValidGalaxy } from './validate'

/**
 * Version of the data contract. Bump it on every breaking change. A game can
 * compare it to `save.formatVersion` to detect that an old save no longer
 * matches the current shape.
 */
export const FORMAT_VERSION = 2

export interface CreateGalaxyOptions {
  /**
   * Check the finished galaxy and throw a {@link GalaxyValidationError} on the
   * first problem found. Only turn this off on a hot path whose input you have
   * already validated.
   * @default true
   */
  validate?: boolean
}

/**
 * Build a complete universe from its description.
 *
 * @throws {GalaxyValidationError} when the finished galaxy is inconsistent —
 * duplicate id, dangling reference, value out of range. `error.issues` holds
 * **every** problem found, not just the first one.
 */
export function createGalaxy(input: GalaxyInput, options: CreateGalaxyOptions = {}): Galaxy {
  if (!input || typeof input !== 'object' || !Array.isArray(input.systems)) {
    throw new TypeError('createGalaxy expects an object of the form { systems: SystemInput[] }')
  }

  const systems = input.systems.map(normalizeSystem)
  const byId = new Map(systems.map((s) => [s.id, s]))
  const lanes = (input.lanes ?? []).map((l) => normalizeLane(l, byId))

  const planets = systems.flatMap((s) => s.planets)
  const galaxy: Galaxy = {
    meta: {
      seed: input.seed,
      generatedAt: input.generatedAt,
      formatVersion: FORMAT_VERSION,
      systemCount: systems.length,
      laneCount: lanes.length,
      planetCount: planets.length,
      stationCount: planets.reduce((n, p) => n + p.stations.length, 0),
      gateCount: systems.reduce((n, s) => n + s.gates.length, 0),
      asteroidFieldCount: systems.reduce((n, s) => n + s.asteroidFields.length, 0),
      galaxyRadius: round(systems.reduce((r, s) => Math.max(r, Math.hypot(s.x, s.y)), 0)),
    },
    systems,
    lanes,
  }

  if (options.validate !== false) assertValidGalaxy(galaxy)
  return galaxy
}

// ---------------------------------------------------------------- internals

function normalizeSystem(input: SystemInput): StarSystem {
  const id = input.id
  const planets = (input.planets ?? []).map((p, i) => normalizePlanet(p, id, i))
  const gates = (input.gates ?? []).map((g, i) => normalizeGate(g, id, i))
  const fields = (input.asteroidFields ?? []).map((f, i) => normalizeField(f, id, i))

  return {
    id,
    name: input.name,
    x: input.x,
    y: input.y,
    faction: input.faction ? { id: input.faction.id, name: input.faction.name } : undefined,
    security: input.security,
    star: {
      id: input.star?.id ?? `${id}-star`,
      name: input.star?.name ?? input.name,
      class: input.star?.class,
      radius: input.star?.radius,
    },
    planets,
    asteroidFields: fields,
    gates,
    outerLimit: input.outerLimit ?? outerLimitOf(input.star?.radius, planets, gates, fields),
    localRoutes: (input.localRoutes ?? []).map(normalizeLocalRoute),
  }
}

function normalizePlanet(input: PlanetInput, systemId: string, index: number): Planet {
  const id = input.id ?? `${systemId}-p${index}`
  return {
    id,
    name: input.name,
    index,
    type: input.type,
    radius: input.radius,
    orbit: input.orbit,
    angle: input.angle ?? 0,
    period: input.period ?? 0,
    moons: input.moons,
    habitable: input.habitable,
    resources: input.resources,
    stations: (input.stations ?? []).map((s, i) => normalizeStation(s, id, i)),
  }
}

function normalizeStation(input: StationInput, planetId: string, index: number): Station {
  return {
    id: input.id ?? `${planetId}-st${index}`,
    name: input.name,
    type: input.type,
    planetId,
    orbit: input.orbit,
    angle: input.angle ?? 0,
    period: input.period ?? 0,
    docks: input.docks,
  }
}

function normalizeGate(input: GateInput, systemId: string, index: number): Gate {
  return {
    id: input.id ?? `${systemId}-gate${index}`,
    name: input.name,
    orbit: input.orbit,
    angle: input.angle ?? 0,
    links: [...(input.links ?? [])],
    status: input.status ?? 'nominal',
  }
}

function normalizeField(input: AsteroidFieldInput, systemId: string, index: number): AsteroidField {
  const common = {
    id: input.id ?? `${systemId}-ast${index}`,
    name: input.name,
    density: input.density,
    rocks: input.rocks ?? [],
    richness: input.richness,
  }
  return input.kind === 'belt'
    ? {
        ...common,
        kind: 'belt',
        orbit: input.orbit,
        width: input.width,
        arcStart: input.arcStart,
        arcSweep: input.arcSweep,
      }
    : { ...common, kind: 'cluster', x: input.x, y: input.y, radius: input.radius }
}

function normalizeLocalRoute(input: LocalRouteInput): LocalRoute {
  return {
    id: input.id ?? `${input.from?.id}>${input.to?.id}`,
    from: { kind: input.from?.kind, id: input.from?.id },
    to: { kind: input.to?.kind, id: input.to?.id },
    type: input.type,
  }
}

function normalizeLane(input: LaneInput, byId: ReadonlyMap<string, StarSystem>): Hyperlane {
  let length = input.length
  if (length === undefined) {
    const a = byId.get(input.from)
    const b = byId.get(input.to)
    // Unknown endpoint: validation reports it, so don't fail here.
    length = a && b ? round(Math.hypot(b.x - a.x, b.y - a.y)) : 0
  }
  return {
    id: input.id ?? `lane-${input.from}-${input.to}`,
    from: input.from,
    to: input.to,
    length,
  }
}

/**
 * A system's edge: how far its contents reach, with no margin added. Pass
 * `outerLimit` yourself if you want empty space past the outermost object.
 */
function outerLimitOf(
  starRadius: number,
  planets: readonly Planet[],
  gates: readonly Gate[],
  fields: readonly AsteroidField[],
): number {
  const reaches = [
    starRadius,
    ...planets.map((p) => p.orbit + p.radius),
    ...gates.map((g) => g.orbit),
    ...fields.map((f) =>
      f.kind === 'belt' ? f.orbit + f.width / 2 : Math.hypot(f.x, f.y) + f.radius,
    ),
  ].filter((n) => Number.isFinite(n))

  return reaches.length ? round(Math.max(...reaches)) : 0
}
