/**
 * Reading a universe: indexes, neighbours, connectivity, routes, positions.
 *
 * These are the helpers a game reaches for constantly once the terrain is built.
 * They all work on an already-validated `Galaxy`.
 */

import { describe, expect, test } from 'vitest'

import {
  connectedComponents,
  createGalaxy,
  createRng,
  fieldCenter,
  findRoute,
  indexGalaxy,
  indexNetwork,
  indexSystems,
  lanesOf,
  neighboursOf,
  orbitPos,
  stationsOf,
  systemOf,
  systemPositions,
  type Galaxy,
  type LaneInput,
  type SystemInput,
  type Vec2,
} from '../src/index'
import { universe } from './fixture'

const galaxy = createGalaxy(universe)
const [sol, , kepler] = galaxy.systems

/** Strict position lookup: a missing id is a failure, not an `undefined`. */
function at(positions: Map<string, Vec2>, id: string): Vec2 {
  const p = positions.get(id)
  if (!p) throw new Error(`no position for ${id}`)
  return p
}

describe('indexes', () => {
  test('every object is indexed, under a unique id', () => {
    const index = indexGalaxy(galaxy)
    // 3 systems + 3 stars + 3 planets + 2 stations + 3 gates + 2 fields
    expect(index.size).toBe(16)
  })

  test('an entry carries its kind and its system', () => {
    const entry = indexGalaxy(galaxy).get('shipyard')
    expect(entry?.kind).toBe('station')
    if (entry?.kind === 'station') {
      expect(entry.obj.docks).toBeUndefined()
      expect(entry.systemId).toBe('sol')
    }
  })

  test('indexSystems only keeps systems', () => {
    expect([...indexSystems(galaxy).keys()]).toEqual(['sol', 'vega', 'kepler'])
  })

  test('stationsOf gathers stations across all planets', () => {
    expect(stationsOf(sol).map((s) => s.id)).toEqual(['earth-st0', 'shipyard'])
    expect(stationsOf(kepler)).toEqual([])
  })
})

describe('ownership', () => {
  test('a planet reaches every gate of its own system', () => {
    expect(systemOf(galaxy, 'earth')?.gates.map((g) => g.id)).toEqual(['sol-gate0'])
  })

  test('any kind of object finds its system', () => {
    for (const id of ['earth', 'sol-p0', 'shipyard', 'sol-gate0', 'sol-ast0', 'sol-star']) {
      expect(systemOf(galaxy, id)).toBe(sol)
    }
  })

  test('a system id returns that same system', () => {
    expect(systemOf(galaxy, 'vega')).toBe(galaxy.systems[1])
  })

  test('an unknown id returns null', () => {
    expect(systemOf(galaxy, 'nowhere')).toBeNull()
  })

  test('a prebuilt index gives the same answer as the galaxy', () => {
    const index = indexGalaxy(galaxy)
    expect(systemOf(index, 'earth')).toBe(systemOf(galaxy, 'earth'))
    expect(systemOf(index, 'nowhere')).toBeNull()
  })
})

describe('network', () => {
  test('lanes touching a system are found in both directions', () => {
    expect(lanesOf(galaxy, 'vega').map((l) => l.id)).toEqual(['lane-sol-vega', 'lane-vega-kepler'])
  })

  test('neighbours are returned as systems, not ids', () => {
    expect(neighboursOf(galaxy, 'vega').map((s) => s.name)).toEqual(['Sol', 'Kepler'])
    expect(neighboursOf(galaxy, 'sol').map((s) => s.id)).toEqual(['vega'])
  })

  test('a connected network is one component', () => {
    expect(connectedComponents(galaxy)).toEqual([['sol', 'vega', 'kepler']])
  })

  test('a split network is broken up, largest component first', () => {
    const split = createGalaxy({
      systems: ['a', 'b', 'c', 'd'].map((id, i) => ({
        id,
        name: id,
        x: i * 100,
        y: 0,
        star: { radius: 10 },
      })),
      lanes: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
      ],
    })
    expect(connectedComponents(split).map((c) => c.length)).toEqual([3, 1])
    expect(connectedComponents(split)[1]).toEqual(['d'])
  })
})

describe('routes', () => {
  test('the shortest path goes through the systems in between', () => {
    const route = findRoute(galaxy, 'sol', 'kepler')
    expect(route).toEqual({ systemIds: ['sol', 'vega', 'kepler'], distance: 1500, jumps: 2 })
  })

  test('staying put costs zero jumps', () => {
    expect(findRoute(galaxy, 'sol', 'sol')).toEqual({ systemIds: ['sol'], distance: 0, jumps: 0 })
  })

  test('an unknown system returns null', () => {
    expect(findRoute(galaxy, 'sol', 'ghost')).toBeNull()
  })

  test('two disconnected components never join up', () => {
    const split = createGalaxy({
      systems: [
        { id: 'a', name: 'A', x: 0, y: 0, star: { radius: 10 } },
        { id: 'b', name: 'B', x: 500, y: 0, star: { radius: 10 } },
      ],
    })
    expect(findRoute(split, 'a', 'b')).toBeNull()
  })

  test('shortest distance wins over fewest jumps', () => {
    const line = createGalaxy({
      systems: [
        { id: 'a', name: 'A', x: 0, y: 0, star: { radius: 10 } },
        { id: 'b', name: 'B', x: 10, y: 0, star: { radius: 10 } },
        { id: 'c', name: 'C', x: 20, y: 0, star: { radius: 10 } },
      ],
      // Two short jumps (20) against one long one (900).
      lanes: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'a', to: 'c', length: 900 },
      ],
    })
    expect(findRoute(line, 'a', 'c')?.systemIds).toEqual(['a', 'b', 'c'])
  })
})

describe('a prebuilt network', () => {
  const network = indexNetwork(galaxy)

  test('gives exactly the answers the galaxy gives', () => {
    for (const a of galaxy.systems) {
      expect(lanesOf(network, a.id)).toEqual(lanesOf(galaxy, a.id))
      expect(neighboursOf(network, a.id)).toEqual(neighboursOf(galaxy, a.id))
      for (const b of galaxy.systems) {
        expect(findRoute(network, a.id, b.id)).toEqual(findRoute(galaxy, a.id, b.id))
      }
    }
    expect(connectedComponents(network)).toEqual(connectedComponents(galaxy))
  })

  test('lists every lane of a system once, in the galaxy order', () => {
    expect(network.lanes.get('vega')?.map((l) => l.id)).toEqual(galaxy.lanes.map((l) => l.id))
    expect(network.systems.get('kepler')).toBe(kepler)
  })
})

describe('routes on generated networks', () => {
  test('always the shortest distance, checked against Floyd–Warshall', () => {
    const rng = createRng('routes')
    for (let run = 0; run < 25; run++) {
      const g = randomGalaxy(rng, rng.randInt(2, 30))
      const best = allPairs(g)
      const network = indexNetwork(g)
      for (const a of g.systems) {
        for (const b of g.systems) {
          const route = findRoute(network, a.id, b.id)
          const expected = best.get(`${a.id}>${b.id}`) ?? Infinity
          if (expected === Infinity) {
            expect(route).toBeNull()
            continue
          }
          expect(route?.distance).toBeCloseTo(expected, 9)
          // And the route is a real path whose lanes add up to that distance.
          const ids = route?.systemIds ?? []
          let walked = 0
          for (let i = 1; i < ids.length; i++) walked += laneLength(g, ids[i - 1], ids[i])
          expect(walked).toBeCloseTo(expected, 9)
        }
      }
    }
  })

  test('among equally short routes, the galaxy order decides — never chance', () => {
    expect(findRoute(diamond(['a', 'b', 'c', 'd']), 'a', 'd')?.systemIds).toEqual(['a', 'b', 'd'])
    expect(findRoute(diamond(['a', 'c', 'b', 'd']), 'a', 'd')?.systemIds).toEqual(['a', 'c', 'd'])
  })
})

/** Two routes of the same length from `a` to `d`, systems listed in `order`. */
function diamond(order: string[]): Galaxy {
  return createGalaxy({
    systems: order.map((id, i) => ({ id, name: id, x: i, y: 0, star: { radius: 1 } })),
    lanes: [
      { from: 'a', to: 'b', length: 1 },
      { from: 'a', to: 'c', length: 1 },
      { from: 'b', to: 'd', length: 1 },
      { from: 'c', to: 'd', length: 1 },
    ],
  })
}

/** A random universe: positions, and lanes between random pairs, some of them overridden in length. */
function randomGalaxy(rng: ReturnType<typeof createRng>, count: number): Galaxy {
  const systems: SystemInput[] = Array.from({ length: count }, (_, i) => ({
    id: `s${i}`,
    name: `S${i}`,
    x: rng.randInt(0, 1000),
    y: rng.randInt(0, 1000),
    star: { radius: 5 },
  }))
  const lanes: LaneInput[] = []
  const linked = new Set<string>()
  for (let n = rng.randInt(0, count * 2); n > 0; n--) {
    const a = rng.randInt(0, count - 1)
    const b = rng.randInt(0, count - 1)
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (a === b || linked.has(key)) continue
    linked.add(key)
    lanes.push({
      from: `s${a}`,
      to: `s${b}`,
      length: rng.chance(0.3) ? rng.randInt(0, 50) : undefined,
    })
  }
  return createGalaxy({ systems, lanes })
}

/** Every shortest distance, by Floyd–Warshall: slow, obvious, and independent of findRoute. */
function allPairs(g: Galaxy): Map<string, number> {
  const ids = g.systems.map((s) => s.id)
  const d = new Map<string, number>()
  for (const a of ids) for (const b of ids) d.set(`${a}>${b}`, a === b ? 0 : Infinity)
  for (const l of g.lanes) {
    d.set(`${l.from}>${l.to}`, Math.min(d.get(`${l.from}>${l.to}`) ?? Infinity, l.length))
    d.set(`${l.to}>${l.from}`, Math.min(d.get(`${l.to}>${l.from}`) ?? Infinity, l.length))
  }
  for (const k of ids) {
    for (const a of ids) {
      for (const b of ids) {
        const through = (d.get(`${a}>${k}`) ?? Infinity) + (d.get(`${k}>${b}`) ?? Infinity)
        if (through < (d.get(`${a}>${b}`) ?? Infinity)) d.set(`${a}>${b}`, through)
      }
    }
  }
  return d
}

function laneLength(g: Galaxy, a: string, b: string): number {
  const lane = g.lanes.find((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a))
  if (!lane) throw new Error(`no lane between ${a} and ${b}`)
  return lane.length
}

describe('geometry', () => {
  test('an orbit with period zero never moves', () => {
    expect(orbitPos(100, 0, 0, 999)).toEqual({ x: 100, y: 0 })
  })

  test('half an orbit lands on the opposite side', () => {
    const { x, y } = orbitPos(100, 0, 10, 5)
    expect(x).toBeCloseTo(-100)
    expect(y).toBeCloseTo(0)
  })

  test('systemPositions puts the star at the origin and covers everything', () => {
    const pos = systemPositions(sol, 0)
    expect(pos.get('sol-star')).toEqual({ x: 0, y: 0 })
    expect([...pos.keys()]).toEqual([
      'sol-star',
      'sol-p0',
      'earth',
      'earth-st0',
      'shipyard',
      'sol-gate0',
      'sol-ast0',
    ])
  })

  test('a station follows its planet', () => {
    const pos = systemPositions(sol, 6)
    const earth = at(pos, 'earth')
    const station = at(pos, 'earth-st0')
    // The station stays on its own orbit, measured from the planet's center.
    expect(Math.hypot(station.x - earth.x, station.y - earth.y)).toBeCloseTo(14)
    // And the planet itself has moved: period 24 s, starting angle 30 degrees.
    expect(Math.atan2(earth.y, earth.x) * (180 / Math.PI)).toBeCloseTo(30 + 90)
  })

  test('the center of a field depends on its shape', () => {
    // A full ring: the middle of the arc sits at 180 degrees.
    const belt = fieldCenter(sol.asteroidFields[0])
    expect(belt.x).toBeCloseTo(-210)
    expect(belt.y).toBeCloseTo(0)

    expect(fieldCenter(galaxy.systems[1].asteroidFields[0])).toEqual({ x: -180, y: -120 })
  })
})
