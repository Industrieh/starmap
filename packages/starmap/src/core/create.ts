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
 * A second rule keeps the errors useful: **normalization never guesses at a
 * shape.** An entry that is not an object, or a collection that is not an
 * array, is passed through untouched, and validation then reports it with its
 * path. A description read from a JSON file therefore fails with a
 * `GalaxyValidationError` naming every problem, not with the first `TypeError`
 * the normalization would have tripped on.
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

import { FORMAT_VERSION } from './format'
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
  ObjectRef,
  Planet,
  Rock,
  Star,
  StarSystem,
  Station,
} from './types'
import { assertValidGalaxy, countContents } from './validate'

export interface CreateGalaxyOptions {
  /**
   * Check the finished galaxy and throw a {@link GalaxyValidationError} listing
   * every problem found. Only turn this off on a hot path whose input you have
   * already validated: without it, a malformed description comes back as a
   * malformed galaxy.
   * @default true
   */
  validate?: boolean
}

/**
 * Build a complete universe from its description.
 *
 * The result shares nothing with `input`: every object and array is a copy, so
 * changing your description afterwards never changes the galaxy.
 *
 * @throws {GalaxyValidationError} when the finished galaxy is inconsistent —
 * duplicate id, dangling reference, value out of range, an entry of the wrong
 * shape. `error.issues` holds **every** problem found, not just the first one.
 */
export function createGalaxy(input: GalaxyInput, options: CreateGalaxyOptions = {}): Galaxy {
  if (!input || typeof input !== 'object' || !Array.isArray(input.systems)) {
    throw new TypeError('createGalaxy expects an object of the form { systems: SystemInput[] }')
  }

  const systems = normalizeList(input.systems, normalizeSystem)
  const byId = new Map(systems.filter(isRecord).map((s) => [s.id, s]))
  const lanes = normalizeList(input.lanes, (l) => normalizeLane(l, byId))

  const galaxy: Galaxy = {
    meta: {
      seed: input.seed,
      generatedAt: input.generatedAt,
      formatVersion: FORMAT_VERSION,
      ...countContents(systems, lanes),
      galaxyRadius: galaxyRadiusOf(systems),
    },
    systems,
    lanes,
  }

  if (options.validate !== false) assertValidGalaxy(galaxy)
  return galaxy
}

// ---------------------------------------------------------------- internals

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Normalize an optional collection, entry by entry.
 *
 * - left out (`undefined`, or `null` from JSON) → an empty array;
 * - not an array → returned untouched, for validation to report;
 * - an entry that is not an object → kept as is, for the same reason.
 */
function normalizeList<In, Out>(
  value: readonly In[] | null | undefined,
  normalize: (entry: In, index: number) => Out,
): Out[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) return value as unknown as Out[]
  return value.map((entry: In, index: number) =>
    isRecord(entry) ? normalize(entry, index) : (entry as unknown as Out),
  )
}

/** A copy of an optional array — same pass-through rules as {@link normalizeList}. */
function copyList<T>(value: readonly T[] | null | undefined): T[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) return value as unknown as T[]
  return [...value]
}

function normalizeSystem(input: SystemInput): StarSystem {
  const id = input.id
  const planets = normalizeList(input.planets, (p, i) => normalizePlanet(p, id, i))
  const gates = normalizeList(input.gates, (g, i) => normalizeGate(g, id, i))
  const fields = normalizeList(input.asteroidFields, (f, i) => normalizeField(f, id, i))
  const star = input.star

  return {
    id,
    name: input.name,
    x: input.x,
    y: input.y,
    faction: isRecord(input.faction)
      ? { id: input.faction.id, name: input.faction.name }
      : (input.faction ?? undefined),
    security: input.security,
    // A missing star stays missing, so that validation says exactly that.
    star: isRecord(star)
      ? {
          id: star.id ?? `${id}-star`,
          name: star.name ?? input.name,
          class: star.class,
          radius: star.radius,
        }
      : (star as unknown as Star),
    planets,
    asteroidFields: fields,
    gates,
    outerLimit: input.outerLimit ?? outerLimitOf(star?.radius, planets, gates, fields),
    localRoutes: normalizeList(input.localRoutes, normalizeLocalRoute),
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
    stations: normalizeList(input.stations, (s, i) => normalizeStation(s, id, i)),
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
    links: copyList(input.links),
    status: input.status ?? 'nominal',
  }
}

function normalizeField(input: AsteroidFieldInput, systemId: string, index: number): AsteroidField {
  const common = {
    id: input.id ?? `${systemId}-ast${index}`,
    name: input.name,
    density: input.density,
    rocks: copyRocks(input.rocks),
    richness: input.richness,
  }
  if (input.kind === 'belt') {
    return {
      ...common,
      kind: 'belt',
      orbit: input.orbit,
      width: input.width,
      arcStart: input.arcStart,
      arcSweep: input.arcSweep,
    }
  }
  if (input.kind === 'cluster') {
    return { ...common, kind: 'cluster', x: input.x, y: input.y, radius: input.radius }
  }
  // An unknown kind is not quietly turned into a cluster: everything is kept,
  // and validation reports the kind itself.
  return { ...(input as object), ...common } as AsteroidField
}

/** Each rock is a tuple, so it is copied too. */
function copyRocks(rocks: readonly Rock[] | null | undefined): Rock[] {
  if (!Array.isArray(rocks)) return copyList(rocks)
  return rocks.map((rock: unknown) => (Array.isArray(rock) ? ([...rock] as Rock) : (rock as Rock)))
}

function normalizeLocalRoute(input: LocalRouteInput): LocalRoute {
  return {
    id: input.id ?? `${input.from?.id}>${input.to?.id}`,
    from: copyRef(input.from),
    to: copyRef(input.to),
    type: input.type,
  }
}

function copyRef(ref: ObjectRef): ObjectRef {
  return isRecord(ref) ? { kind: ref.kind, id: ref.id } : ref
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
 * Radius of the disc enclosing every system, from the origin. A position that
 * is not a finite number is skipped: validation reports it on its own, and a
 * `NaN` radius would only add a second, misleading problem.
 */
function galaxyRadiusOf(systems: readonly StarSystem[]): number {
  let radius = 0
  for (const s of systems) {
    const d = isRecord(s) ? Math.hypot(s.x, s.y) : Number.NaN
    if (Number.isFinite(d) && d > radius) radius = d
  }
  return round(radius)
}

/** The entries of a collection that are objects. Anything else is validation's business. */
function records<T>(list: readonly T[]): T[] {
  return Array.isArray(list) ? list.filter((entry: T) => isRecord(entry)) : []
}

/**
 * A system's edge: how far its contents reach, with no margin added — the
 * star, every planet **and the stations around it**, every gate, every
 * asteroid field **and its rocks**. Pass `outerLimit` yourself if you want
 * empty space past the outermost object.
 */
function outerLimitOf(
  starRadius: unknown,
  planets: readonly Planet[],
  gates: readonly Gate[],
  fields: readonly AsteroidField[],
): number {
  let reach = typeof starRadius === 'number' && Number.isFinite(starRadius) ? starRadius : 0
  const consider = (n: number): void => {
    if (Number.isFinite(n) && n > reach) reach = n
  }

  for (const p of records(planets)) {
    consider(p.orbit + p.radius)
    // A station circles its planet, so at its farthest it sits a full station
    // orbit beyond the planet's.
    for (const st of records(p.stations)) consider(p.orbit + st.orbit)
  }
  for (const g of records(gates)) consider(g.orbit)
  for (const f of records(fields)) {
    consider(f.kind === 'belt' ? f.orbit + f.width / 2 : Math.hypot(f.x, f.y) + f.radius)
    for (const rock of Array.isArray(f.rocks) ? f.rocks : []) {
      if (Array.isArray(rock)) consider(Math.hypot(rock[0], rock[1]) + rock[2])
    }
  }

  return round(reach)
}
