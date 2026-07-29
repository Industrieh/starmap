/**
 * A procedural generator — **step 1 of the tour**.
 *
 * The core library does not generate universes, and that is deliberate: how
 * many planets a system gets, how a galaxy is shaped, which factions exist are
 * game design decisions. What the library gives you instead is `createRng()`, a
 * seeded random source, plus a typed input schema and a validator to catch your
 * mistakes.
 *
 * So this file is the part **you** would write in a real game. It is about 150
 * lines, and it is what makes the playground worth playing with: change a
 * number here, save, and the whole galaxy is different.
 *
 * The pipeline, in order:
 *
 *     seed → createRng → place systems → link them → fill each one → createGalaxy
 *
 * Two rules to keep in mind if you edit it:
 *
 * - **The order of draws is the contract.** Insert one extra `rng.next()` in
 *   the middle and everything after it shifts, so the same seed produces a
 *   different galaxy. That is fine here; it would not be in a game with saves.
 * - **Never call `Math.random()`.** The whole point of a seed is that the same
 *   text always rebuilds the same universe.
 */

import {
  createGalaxy,
  createRng,
  round,
  type Galaxy,
  type LaneInput,
  type PlanetInput,
  type Rng,
  type StationInput,
  type SystemInput,
} from '@cotontigeh/starmap'

/** How far apart two systems must be. Raise it for a sparser galaxy. */
const MIN_DISTANCE = 260

/**
 * Radius of the disc the systems are sown in.
 *
 * It grows with the square root of the count, so the galaxy keeps a constant
 * density: ask for four times the systems and it is twice as wide. A fixed
 * radius would silently drop systems, because there would be nowhere left to
 * put them that is `MIN_DISTANCE` away from everything else.
 */
const galaxyRadius = (count: number): number => MIN_DISTANCE * Math.sqrt(count) * 1.15

/** Star classes, with the relative weight of each. `w` is what `rng.weighted` reads. */
const STAR_CLASSES = [
  { w: 1, id: 'O', radius: 30 },
  { w: 3, id: 'B', radius: 26 },
  { w: 7, id: 'A', radius: 22 },
  { w: 12, id: 'F', radius: 20 },
  { w: 20, id: 'G', radius: 18 },
  { w: 22, id: 'K', radius: 16 },
  { w: 30, id: 'M', radius: 13 },
]

const FACTIONS = [
  { w: 5, id: 'neutral', name: 'Unclaimed Space' },
  { w: 3, id: 'consortium', name: 'Vega Consortium' },
  { w: 3, id: 'covenant', name: 'Scarlet Covenant' },
  { w: 3, id: 'syndicate', name: 'Free Syndicate' },
  { w: 2, id: 'pilgrims', name: 'Kepler Pilgrims' },
]

/** Planet types by zone. A world's type follows its distance from the star. */
const ZONES = {
  inner: ['lava', 'rocky', 'desert', 'barren'],
  middle: ['terran', 'ocean', 'toxic', 'rocky', 'desert'],
  outer: ['gas', 'ice-giant', 'frozen', 'barren'],
}

const STATION_TYPES = ['trade', 'mining', 'military', 'research', 'shipyard']

const PREFIXES = [
  'Vel',
  'Kor',
  'Ald',
  'Zan',
  'Tal',
  'Mir',
  'Cas',
  'Dra',
  'Nor',
  'Pyx',
  'Ish',
  'Rhe',
]
const SUFFIXES = ['amora', 'ion', 'ara', 'ex', 'ura', 'is', 'ondra', 'ash', 'eth', 'ova']
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']

/**
 * Build a whole galaxy from a text seed.
 *
 * `createGalaxy()` at the end is what turns this description into a checked,
 * queryable universe: it fills in every id, every count, every lane length, and
 * throws if the description contradicts itself. A generator with a bug fails
 * here, loudly, instead of producing a subtly broken world.
 */
export function generateGalaxy(seed: string, systemCount = 14): Galaxy {
  const rng = createRng(seed)
  const points = placeSystems(rng, systemCount)
  const lanes = linkSystems(rng, points)

  // Which systems each system can reach in one jump. Gates are built from this,
  // so a gate always leads somewhere a hyperlane actually goes.
  const neighbours = new Map<string, string[]>(points.map((p) => [p.id, []]))
  for (const lane of lanes) {
    neighbours.get(lane.from)?.push(lane.to)
    neighbours.get(lane.to)?.push(lane.from)
  }

  const systems = points.map((point) => buildSystem(rng, point, neighbours.get(point.id) ?? []))

  return createGalaxy({ seed, systems, lanes })
}

// ------------------------------------------------------------------ placing

interface Point {
  id: string
  name: string
  x: number
  y: number
}

/**
 * Sow the systems in a squashed disc, no two closer than `MIN_DISTANCE`.
 *
 * Rejection sampling: draw a position, keep it if it is far enough from every
 * system already placed, give up after enough failures. Simple, and it never
 * loops forever — which matters, because the caller cannot retry a seed.
 *
 * The `0.6` exponent on the radius pulls systems toward the centre; without it
 * a uniform draw over a disc looks suspiciously like a ring. The `0.72` on `y`
 * flattens the galaxy, which reads as a map rather than a target.
 */
function placeSystems(rng: Rng, count: number): Point[] {
  const points: Point[] = []
  const used = new Set<string>()

  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 60; attempt++) {
      const angle = rng.next() * Math.PI * 2
      const radius = galaxyRadius(count) * Math.pow(rng.next(), 0.6)
      const x = round(Math.cos(angle) * radius)
      const y = round(Math.sin(angle) * radius * 0.72)

      const tooClose = points.some((p) => Math.hypot(p.x - x, p.y - y) < MIN_DISTANCE)
      if (tooClose) continue

      points.push({ id: `sys-${i}`, name: uniqueName(rng, used), x, y })
      break
    }
  }

  return points
}

/** A name no other system carries, falling back to a numbered one. */
function uniqueName(rng: Rng, used: Set<string>): string {
  for (let attempt = 0; attempt < 30; attempt++) {
    const name = `${rng.pick(PREFIXES)}${rng.pick(SUFFIXES)}`
    if (!used.has(name)) {
      used.add(name)
      return name
    }
  }
  return `Sector ${used.size + 1}`
}

// ------------------------------------------------------------------ linking

/**
 * Connect the systems into a network that is guaranteed to hold together.
 *
 * A minimum spanning tree (Prim's algorithm: repeatedly add the shortest edge
 * from the connected part to the rest) reaches every system with no cycles.
 * That guarantee matters — the library validates references, but it never
 * checks that your network is connected, and a system nobody can fly to is a
 * game bug.
 *
 * A tree alone feels like a corridor, so a few short extra links are added on
 * top. They are what makes a route interesting: more than one way round.
 */
function linkSystems(rng: Rng, points: readonly Point[]): LaneInput[] {
  if (points.length < 2) return []

  const lanes: LaneInput[] = []
  const linked = new Set<string>()
  const connected = [points[0]]
  const rest = points.slice(1)

  const add = (a: Point, b: Point): void => {
    linked.add(pairKey(a, b))
    lanes.push({ from: a.id, to: b.id })
  }

  // --- the spanning tree
  while (rest.length) {
    let best = { from: connected[0], to: rest[0], distance: Infinity, index: 0 }
    for (const from of connected) {
      rest.forEach((to, index) => {
        const distance = Math.hypot(to.x - from.x, to.y - from.y)
        if (distance < best.distance) best = { from, to, distance, index }
      })
    }
    add(best.from, best.to)
    connected.push(best.to)
    rest.splice(best.index, 1)
  }

  // --- a few shortcuts, only between systems that are already close
  const maxExtra = MIN_DISTANCE * 2.2
  for (const a of points) {
    for (const b of points) {
      if (a.id >= b.id) continue // each pair once
      if (linked.has(pairKey(a, b))) continue
      if (Math.hypot(b.x - a.x, b.y - a.y) > maxExtra) continue
      if (rng.chance(0.35)) add(a, b)
    }
  }

  return lanes
}

/** A hyperlane is undirected, so its key must not depend on the order. */
function pairKey(a: Point, b: Point): string {
  return [a.id, b.id].toSorted().join('|')
}

// ----------------------------------------------------------------- contents

/**
 * Fill one system: a star, planets, the odd station, an asteroid belt, and one
 * gate per neighbour.
 *
 * Everything derivable is left out — ids, `index`, `planetId`, `outerLimit`.
 * `createGalaxy()` computes them, and doing it here by hand would only be a way
 * to get them wrong.
 */
function buildSystem(rng: Rng, point: Point, neighbours: readonly string[]): SystemInput {
  const star = rng.weighted(STAR_CLASSES)
  const faction = rng.weighted(FACTIONS)
  const planets = buildPlanets(rng, point.name)

  // The outermost thing in the system, used to place the gates past everything
  // else. `0` is possible: a system may have no planets at all.
  const reach = planets.reduce((max, p) => Math.max(max, p.orbit), 0)

  return {
    id: point.id,
    name: point.name,
    x: point.x,
    y: point.y,
    security: round(rng.next(), 2),
    faction: { id: faction.id, name: faction.name },
    star: { class: star.id, radius: star.radius },
    planets,
    asteroidFields:
      planets.length > 1 && rng.chance(0.55)
        ? [buildBelt(rng, point.name, planets[Math.floor(planets.length / 2)].orbit)]
        : [],
    // One gate per neighbour, each sitting in the direction it leads. A ring of
    // gates all facing the same way would look stamped out.
    gates: neighbours.map((id, index) => ({
      name: `${point.name} Gate ${index + 1}`,
      orbit: round(reach + 80),
      angle: round(rng.rand(0, 360)),
      links: [id],
      status: rng.chance(0.12) ? 'unstable' : 'nominal',
    })),
  }
}

function buildPlanets(rng: Rng, systemName: string): PlanetInput[] {
  const count = rng.randInt(0, 6)
  const planets: PlanetInput[] = []
  let orbit = 60

  for (let i = 0; i < count; i++) {
    // Orbits spread out as they go, but not by much: a system whose outer edge
    // is ten times its inner one draws as a star surrounded by empty space,
    // with the planets too small to read.
    orbit += rng.rand(38, 65) * (1 + i * 0.12)
    const zone = i < count * 0.35 ? 'inner' : i < count * 0.75 ? 'middle' : 'outer'
    const type = rng.pick(ZONES[zone])
    const giant = type === 'gas' || type === 'ice-giant'

    planets.push({
      name: `${systemName} ${ROMAN[i] ?? i + 1}`,
      type,
      orbit: round(orbit),
      radius: giant ? rng.randInt(13, 20) : rng.randInt(4, 9),
      angle: round(rng.rand(0, 360)),
      // Kepler, roughly: the period grows with orbit^1.5. The constant is
      // chosen so an inner world takes a few seconds, not a few minutes.
      period: round(6 * Math.pow(orbit / 70, 1.5)),
      moons: giant ? rng.randInt(0, 6) : rng.randInt(0, 2),
      habitable: type === 'terran' || type === 'ocean' ? rng.chance(0.6) : undefined,
      stations: rng.chance(0.35) ? buildStations(rng, systemName, i) : [],
    })
  }

  return planets
}

function buildStations(rng: Rng, systemName: string, planetIndex: number): StationInput[] {
  return Array.from({ length: rng.randInt(1, 2) }, (_, i) => ({
    name: `${systemName} ${ROMAN[planetIndex] ?? planetIndex} Station ${i + 1}`,
    type: rng.pick(STATION_TYPES),
    orbit: rng.randInt(16, 30),
    angle: round(rng.rand(0, 360)),
    period: round(rng.rand(2, 6)),
    docks: rng.randInt(2, 12),
  }))
}

/** An arc of rocks, with the rocks actually placed — the library never invents them. */
function buildBelt(rng: Rng, systemName: string, orbit: number) {
  const arcStart = round(rng.rand(0, 360))
  const arcSweep = round(rng.rand(60, 280))
  const width = round(rng.rand(10, 26))

  return {
    kind: 'belt' as const,
    name: `${systemName} Belt`,
    orbit: round(orbit * 0.82),
    width,
    arcStart,
    arcSweep,
    richness: rng.pick(['poor', 'modest', 'rich', 'exceptional']),
    rocks: Array.from({ length: rng.randInt(10, 26) }, () => {
      const angle = ((arcStart + rng.next() * arcSweep) * Math.PI) / 180
      const radius = orbit * 0.82 + rng.rand(-width / 2, width / 2)
      return [
        round(Math.cos(angle) * radius),
        round(Math.sin(angle) * radius),
        round(rng.rand(1.5, 4)),
      ] as [number, number, number]
    }),
  }
}
