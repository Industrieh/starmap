/**
 * Checking a universe.
 *
 * Two ways in:
 *
 * 1. {@link createGalaxy} always checks what it just built, so you cannot end up
 *    with a structurally broken `Galaxy`;
 * 2. {@link validateGalaxy} runs on a galaxy you read back — `JSON.parse` of a
 *    save file, a server response, a content file edited by hand. TypeScript's
 *    guarantees do not survive serialization; these checks do.
 *
 * ## What is checked
 *
 * Structural and referential integrity:
 *
 * - the format: a galaxy built for another `FORMAT_VERSION` is reported as such,
 *   and nothing else is checked — migrate it first;
 * - runtime types (`x` really is a finite number, `name` a non-empty string, a
 *   planet an object, a collection an array);
 * - ids are unique across the whole galaxy — local routes and hyperlanes
 *   included;
 * - documented ranges: `security` and `density` in `[0, 1]`, `arcSweep` in
 *   `[0, 360]`, radii and orbits strictly positive;
 * - every reference by id resolves to an object that exists and has the right
 *   kind;
 * - a link never loops back: no hyperlane from a system to itself, no local
 *   route from an object to itself, no gate reaching its own system;
 * - the counters in `meta` match the real contents.
 *
 * ## What is not checked
 *
 * Whether the world makes sense. Orbits that shrink outward, overlapping
 * planets, a gate inside its star, a network split in two — all accepted. Those
 * are design choices, and they are yours to make.
 *
 * The one you most likely care about is connectivity: use
 * {@link connectedComponents} and decide for yourself whether an unreachable
 * system is an error.
 */

import { FORMAT_VERSION } from './format'
import type { AsteroidField, Galaxy, Hyperlane, ObjectKind, ObjectRef, StarSystem } from './types'

/** One problem, located by its path in the structure. */
export interface GalaxyIssue {
  /** Path of the offending value, e.g. `systems[3].planets[0].orbit`. */
  path: string
  message: string
}

/** Thrown by {@link createGalaxy} and {@link assertValidGalaxy}. */
export class GalaxyValidationError extends Error {
  readonly issues: readonly GalaxyIssue[]

  constructor(issues: readonly GalaxyIssue[]) {
    const detail = issues.map((i) => `  • ${i.path}: ${i.message}`).join('\n')
    super(`Invalid universe (${issues.length} problem(s)):\n${detail}`)
    this.name = 'GalaxyValidationError'
    this.issues = issues
  }
}

/** Object kinds an {@link ObjectRef} may point at. */
const OBJECT_KINDS = new Set<ObjectKind>(['system', 'star', 'planet', 'station', 'gate', 'field'])

/**
 * Check a galaxy and return the list of its problems, empty if there are none.
 * Never throws, whatever you pass it — which is why it takes `unknown`: hand it
 * `JSON.parse(...)` straight away.
 *
 * @example Loading a save file
 * ```ts
 * const data: unknown = JSON.parse(json)
 * const issues = validateGalaxy(data)
 * if (issues.length) console.error(issues)
 * ```
 */
export function validateGalaxy(galaxy: unknown): GalaxyIssue[] {
  const issues: GalaxyIssue[] = []
  const add: Add = (path, message) => void issues.push({ path, message })

  if (!isObject(galaxy)) {
    add('', 'expected an object')
    return issues
  }
  const g = galaxy as Partial<Galaxy>

  // --- 0. The format. A galaxy built for another version of the contract is
  //        expected to break every rule below, and listing those breaks would
  //        only bury the one message that matters.
  const version: unknown = isObject(g.meta) ? g.meta.formatVersion : undefined
  if (typeof version === 'number' && Number.isFinite(version) && version !== FORMAT_VERSION) {
    add(
      'meta.formatVersion',
      `built for format ${version}, but this library reads format ${FORMAT_VERSION} — migrate it first`,
    )
    return issues
  }

  if (!Array.isArray(g.systems)) {
    add('systems', 'expected an array')
    return issues
  }
  const systems: readonly StarSystem[] = g.systems
  let lanes: readonly Hyperlane[] = []
  if (Array.isArray(g.lanes)) lanes = g.lanes
  else add('lanes', 'expected an array')

  // --- 1. Index every object, reporting duplicate ids along the way. The index
  //        is what later steps use to resolve references by id.
  const owners = new Map<string, { kind: ObjectKind; systemId: string }>()
  const claim = (path: string, id: unknown, kind: ObjectKind, systemId: string): void => {
    if (!isId(id)) return add(`${path}.id`, 'missing or empty id')
    if (owners.has(id)) add(`${path}.id`, `duplicate id: "${id}"`)
    else owners.set(id, { kind, systemId })
  }

  systems.forEach((s, i) => {
    const p = `systems[${i}]`
    if (!isObject(s)) return add(p, 'expected an object')
    claim(p, s.id, 'system', s.id)
    if (isObject(s.star)) claim(`${p}.star`, s.star.id, 'star', s.id)
    each(s.planets).forEach((pl, j) => {
      if (!isObject(pl)) return
      claim(`${p}.planets[${j}]`, pl.id, 'planet', s.id)
      each(pl.stations).forEach((st, k) => {
        if (isObject(st)) claim(`${p}.planets[${j}].stations[${k}]`, st.id, 'station', s.id)
      })
    })
    each(s.gates).forEach((gate, j) => {
      if (isObject(gate)) claim(`${p}.gates[${j}]`, gate.id, 'gate', s.id)
    })
    each(s.asteroidFields).forEach((f, j) => {
      if (isObject(f)) claim(`${p}.asteroidFields[${j}]`, f.id, 'field', s.id)
    })
  })

  // Local routes and hyperlanes carry ids that count towards global
  // uniqueness but are not referenceable objects, so they stay out of
  // `owners` — otherwise a gate could "reach" a hyperlane.
  const links = new Set<string>()
  const claimLink: ClaimLink = (path, id) => {
    if (!isId(id)) return add(`${path}.id`, 'missing or empty id')
    if (owners.has(id) || links.has(id)) add(`${path}.id`, `duplicate id: "${id}"`)
    else links.add(id)
  }

  // --- 2. Contents of each system.
  systems.forEach((s, i) => {
    if (isObject(s)) checkSystem(s, `systems[${i}]`, owners, add, claimLink)
  })

  // --- 3. The inter-system network.
  const seenPairs = new Set<string>()
  lanes.forEach((l, i) => {
    const p = `lanes[${i}]`
    if (!isObject(l)) return add(p, 'expected an object')
    claimLink(p, l.id)

    for (const end of ['from', 'to'] as const) {
      const ref = l[end]
      if (owners.get(ref)?.kind !== 'system') {
        add(`${p}.${end}`, `unknown system: "${String(ref)}"`)
      }
    }
    if (l.from === l.to) add(p, 'a hyperlane cannot link a system to itself')

    // Undirected: the pair is the same whichever end comes first. JSON keeps the
    // key unambiguous whatever characters the ids contain.
    const [from, to] = [String(l.from), String(l.to)]
    const [a, b] = from < to ? [from, to] : [to, from]
    const pair = JSON.stringify([a, b])
    if (seenPairs.has(pair)) add(p, `these two systems are already linked: "${a}" and "${b}"`)
    else seenPairs.add(pair)

    number(`${p}.length`, l.length, add, { min: 0 })
  })

  // --- 4. Metadata.
  checkMeta(g, systems, lanes, add)

  return issues
}

/**
 * Same as {@link validateGalaxy}, but throws a {@link GalaxyValidationError}.
 * Once it returns, TypeScript knows the value is a `Galaxy`.
 *
 * @example
 * ```ts
 * const data: unknown = JSON.parse(json)
 * assertValidGalaxy(data)
 * data.systems   // typed: data is a Galaxy from here on
 * ```
 */
export function assertValidGalaxy(galaxy: unknown): asserts galaxy is Galaxy {
  const issues = validateGalaxy(galaxy)
  if (issues.length) throw new GalaxyValidationError(issues)
}

/** The counters of {@link GalaxyMeta}, as computed from the contents. */
export interface ContentCounts {
  systemCount: number
  laneCount: number
  planetCount: number
  stationCount: number
  gateCount: number
  asteroidFieldCount: number
}

/**
 * Count what a galaxy holds. `createGalaxy()` writes these counters and
 * `validateGalaxy()` checks them, both through this one function — so the two
 * can never disagree, malformed entries included.
 *
 * @internal Not part of the public API.
 */
export function countContents(
  systems: readonly StarSystem[],
  lanes: readonly Hyperlane[],
): ContentCounts {
  const planets = systems.flatMap((s) => each(s?.planets))
  return {
    systemCount: systems.length,
    laneCount: each(lanes).length,
    planetCount: planets.length,
    stationCount: planets.reduce((n, p) => n + each(p?.stations).length, 0),
    gateCount: systems.reduce((n, s) => n + each(s?.gates).length, 0),
    asteroidFieldCount: systems.reduce((n, s) => n + each(s?.asteroidFields).length, 0),
  }
}

// ---------------------------------------------------------------- internals

type Add = (path: string, message: string) => void
type ClaimLink = (path: string, id: unknown) => void
type Owners = ReadonlyMap<string, { kind: ObjectKind; systemId: string }>

const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0

/** A plain object: not `null`, and not an array where an object was expected. */
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Tolerates `undefined`, `null` and non-arrays: the mistake is reported elsewhere. */
function each<T>(v: readonly T[] | null | undefined): readonly T[] {
  return Array.isArray(v) ? v : []
}

interface NumberRule {
  min?: number
  max?: number
  /** Rejects zero on top of the `min` bound. */
  positive?: boolean
}

function number(path: string, v: unknown, add: Add, rule: NumberRule = {}): void {
  if (typeof v !== 'number' || !Number.isFinite(v)) return add(path, 'expected a finite number')
  if (rule.positive && v <= 0) add(path, 'must be strictly positive')
  if (rule.min !== undefined && v < rule.min) add(path, `must be >= ${rule.min}`)
  if (rule.max !== undefined && v > rule.max) add(path, `must be <= ${rule.max}`)
}

function optionalNumber(path: string, v: unknown, add: Add, rule: NumberRule = {}): void {
  if (v !== undefined) number(path, v, add, rule)
}

function text(path: string, v: unknown, add: Add): void {
  if (typeof v !== 'string' || v.length === 0) add(path, 'expected a non-empty string')
}

function checkSystem(
  s: StarSystem,
  p: string,
  owners: Owners,
  add: Add,
  claimLink: ClaimLink,
): void {
  text(`${p}.name`, s.name, add)
  number(`${p}.x`, s.x, add)
  number(`${p}.y`, s.y, add)
  number(`${p}.outerLimit`, s.outerLimit, add, { min: 0 })
  optionalNumber(`${p}.security`, s.security, add, { min: 0, max: 1 })
  if (s.faction !== undefined) {
    if (!isObject(s.faction)) add(`${p}.faction`, 'expected an object')
    else {
      text(`${p}.faction.id`, s.faction.id, add)
      text(`${p}.faction.name`, s.faction.name, add)
    }
  }

  if (!isObject(s.star)) add(`${p}.star`, 'missing star')
  else {
    text(`${p}.star.name`, s.star.name, add)
    number(`${p}.star.radius`, s.star.radius, add, { positive: true })
  }

  for (const key of ['planets', 'gates', 'asteroidFields', 'localRoutes'] as const) {
    if (!Array.isArray(s[key])) add(`${p}.${key}`, 'expected an array')
  }

  each(s.planets).forEach((pl, j) => {
    const pp = `${p}.planets[${j}]`
    if (!isObject(pl)) return add(pp, 'expected an object')
    text(`${pp}.name`, pl.name, add)
    number(`${pp}.index`, pl.index, add, { min: 0 })
    if (pl.index !== j) add(`${pp}.index`, `must be ${j}, its rank in the array`)
    number(`${pp}.radius`, pl.radius, add, { positive: true })
    number(`${pp}.orbit`, pl.orbit, add, { positive: true })
    number(`${pp}.angle`, pl.angle, add)
    number(`${pp}.period`, pl.period, add, { min: 0 })
    optionalNumber(`${pp}.moons`, pl.moons, add, { min: 0 })

    if (!Array.isArray(pl.stations)) return add(`${pp}.stations`, 'expected an array')
    pl.stations.forEach((st, k) => {
      const sp = `${pp}.stations[${k}]`
      if (!isObject(st)) return add(sp, 'expected an object')
      text(`${sp}.name`, st.name, add)
      number(`${sp}.orbit`, st.orbit, add, { positive: true })
      number(`${sp}.angle`, st.angle, add)
      number(`${sp}.period`, st.period, add, { min: 0 })
      optionalNumber(`${sp}.docks`, st.docks, add, { min: 0 })
      if (st.planetId !== pl.id) {
        add(`${sp}.planetId`, `must point at its parent planet ("${String(pl.id)}")`)
      }
    })
  })

  each(s.gates).forEach((g, j) => {
    const gp = `${p}.gates[${j}]`
    if (!isObject(g)) return add(gp, 'expected an object')
    text(`${gp}.name`, g.name, add)
    number(`${gp}.orbit`, g.orbit, add, { positive: true })
    number(`${gp}.angle`, g.angle, add)
    if (!Array.isArray(g.links)) return add(`${gp}.links`, 'expected an array')
    g.links.forEach((link, k) => {
      if (owners.get(link)?.kind !== 'system') {
        add(`${gp}.links[${k}]`, `unknown system: "${String(link)}"`)
      } else if (link === s.id) {
        add(`${gp}.links[${k}]`, 'a gate cannot reach its own system')
      }
    })
  })

  each(s.asteroidFields).forEach((f, j) => checkField(f, `${p}.asteroidFields[${j}]`, add))

  each(s.localRoutes).forEach((r, j) => {
    const rp = `${p}.localRoutes[${j}]`
    if (!isObject(r)) return add(rp, 'expected an object')
    claimLink(rp, r.id)
    for (const end of ['from', 'to'] as const) checkRef(r[end], `${rp}.${end}`, s.id, owners, add)
    // Ids are unique across the galaxy, so one id on both ends is one object.
    if (isObject(r.from) && isObject(r.to) && isId(r.from.id) && r.from.id === r.to.id) {
      add(rp, 'a local route cannot link an object to itself')
    }
  })
}

function checkField(f: AsteroidField, p: string, add: Add): void {
  if (!isObject(f)) return add(p, 'expected an object')
  text(`${p}.name`, f.name, add)
  optionalNumber(`${p}.density`, f.density, add, { min: 0, max: 1 })

  if (f.kind === 'belt') {
    number(`${p}.orbit`, f.orbit, add, { positive: true })
    number(`${p}.width`, f.width, add, { min: 0 })
    number(`${p}.arcStart`, f.arcStart, add)
    number(`${p}.arcSweep`, f.arcSweep, add, { min: 0, max: 360 })
  } else if (f.kind === 'cluster') {
    number(`${p}.x`, f.x, add)
    number(`${p}.y`, f.y, add)
    number(`${p}.radius`, f.radius, add, { positive: true })
  } else {
    add(`${p}.kind`, `must be 'belt' or 'cluster'`)
  }

  if (!Array.isArray(f.rocks)) return add(`${p}.rocks`, 'expected an array')
  f.rocks.forEach((rock, k) => {
    if (!Array.isArray(rock) || rock.length !== 3 || rock.some((n) => !Number.isFinite(n))) {
      add(`${p}.rocks[${k}]`, 'expected a [x, y, radius] tuple of finite numbers')
    }
  })
}

function checkRef(ref: ObjectRef, p: string, systemId: string, owners: Owners, add: Add): void {
  if (!isObject(ref)) return add(p, 'expected a { kind, id } reference')
  if (!OBJECT_KINDS.has(ref.kind)) {
    return add(`${p}.kind`, `unknown kind: "${String(ref.kind)}"`)
  }
  const owner = owners.get(ref.id)
  if (!owner) return add(`${p}.id`, `unknown object: "${String(ref.id)}"`)
  if (owner.kind !== ref.kind) {
    add(`${p}.kind`, `"${ref.id}" is a ${owner.kind}, not a ${ref.kind}`)
  }
  if (owner.systemId !== systemId) {
    add(`${p}.id`, `"${ref.id}" belongs to ${owner.systemId}, not to ${systemId}`)
  }
}

function checkMeta(
  galaxy: Partial<Galaxy>,
  systems: readonly StarSystem[],
  lanes: readonly Hyperlane[],
  add: Add,
): void {
  const { meta } = galaxy
  if (!isObject(meta)) return add('meta', 'missing metadata')

  const expected = countContents(systems, lanes)
  for (const [key, value] of Object.entries(expected)) {
    if (meta[key as keyof ContentCounts] !== value) {
      add(`meta.${key}`, `does not match the contents: expected ${value}`)
    }
  }
  number('meta.formatVersion', meta.formatVersion, add, { min: 0 })
  number('meta.galaxyRadius', meta.galaxyRadius, add, { min: 0 })
}
