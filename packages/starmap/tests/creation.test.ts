/**
 * Normalization: what `createGalaxy()` fills in, and what it leaves alone.
 *
 * These tests cover the rule that defines the library — **compute what is
 * derivable, never invent a value that carries meaning**. Each test pins down
 * one side of that line.
 */

import { describe, expect, test } from 'vitest'

import { createGalaxy, FORMAT_VERSION, stationsOf, type GalaxyInput } from '../src/index'
import { universe } from './fixture'

const galaxy = createGalaxy(universe)
const [sol, vega, kepler] = galaxy.systems

describe('derived ids', () => {
  test('the star takes its id and name from the system', () => {
    expect(sol.star.id).toBe('sol-star')
    expect(sol.star.name).toBe('Sol')
  })

  test('planets are numbered by their rank', () => {
    expect(sol.planets.map((p) => p.id)).toEqual(['sol-p0', 'earth'])
    expect(sol.planets.map((p) => p.index)).toEqual([0, 1])
  })

  test('stations derive from their planet and point back at it', () => {
    const [anchorage, shipyard] = sol.planets[1].stations
    expect(anchorage.id).toBe('earth-st0')
    expect(shipyard.id).toBe('shipyard')
    expect(stationsOf(sol).map((s) => s.planetId)).toEqual(['earth', 'earth'])
  })

  test('gates, fields and hyperlanes get a readable id', () => {
    expect(sol.gates[0].id).toBe('sol-gate0')
    expect(sol.asteroidFields[0].id).toBe('sol-ast0')
    expect(galaxy.lanes[0].id).toBe('lane-sol-vega')
  })

  test('a local route with no id is named after its endpoints', () => {
    expect(sol.localRoutes[0].id).toBe('sol-star>sol-p0')
  })

  test('an id you provide is always kept', () => {
    expect(sol.planets[1].id).toBe('earth')
  })
})

describe('derived values', () => {
  test('a hyperlane length is the distance between the two systems', () => {
    expect(galaxy.lanes[0].length).toBe(500) // hypot(400, 300)
  })

  test('a length you provide is kept as is', () => {
    expect(galaxy.lanes[1].length).toBe(1000)
  })

  test('outerLimit reaches the furthest object in the system', () => {
    // Sol's gate (orbit 300) reaches further than the belt (210 + 15).
    expect(sol.outerLimit).toBe(300)
    // Vega: the gate at 400 beats the gas giant at 260 + 14.
    expect(vega.outerLimit).toBe(400)
    // Kepler only has its star and its gate.
    expect(kepler.outerLimit).toBe(180)
  })

  test('outerLimit reaches the stations around the outermost planet', () => {
    const g = createGalaxy({
      systems: [
        {
          id: 's',
          name: 'S',
          x: 0,
          y: 0,
          star: { radius: 5 },
          planets: [{ name: 'P', orbit: 100, radius: 5, stations: [{ name: 'St', orbit: 40 }] }],
        },
      ],
    })
    // The planet alone reaches 105; its station swings out to 100 + 40.
    expect(g.systems[0].outerLimit).toBe(140)
  })

  test('outerLimit reaches a rock placed outside its field', () => {
    const g = createGalaxy({
      systems: [
        {
          id: 's',
          name: 'S',
          x: 0,
          y: 0,
          star: { radius: 5 },
          asteroidFields: [
            { kind: 'cluster', name: 'C', x: 0, y: 50, radius: 10, rocks: [[0, 90, 2]] },
          ],
        },
      ],
    })
    // The cluster reaches 60; the rock at distance 90, radius 2, reaches 92.
    expect(g.systems[0].outerLimit).toBe(92)
  })

  test('a system with nothing but a star gets that star radius', () => {
    const solo = createGalaxy({
      systems: [{ id: 'a', name: 'A', x: 0, y: 0, star: { radius: 9 } }],
    })
    expect(solo.systems[0].outerLimit).toBe(9)
  })

  test('meta counters and radius match the real contents', () => {
    expect(galaxy.meta).toMatchObject({
      seed: 'test',
      generatedAt: '2026-01-01T00:00:00.000Z',
      formatVersion: FORMAT_VERSION,
      systemCount: 3,
      laneCount: 2,
      planetCount: 3,
      stationCount: 2,
      gateCount: 3,
      asteroidFieldCount: 2,
    })
    // Kepler is the furthest from the origin: hypot(-250, 600).
    expect(galaxy.meta.galaxyRadius).toBe(650)
  })
})

describe('defaults', () => {
  test('omitted collections become empty arrays', () => {
    expect(kepler.planets).toEqual([])
    expect(kepler.asteroidFields).toEqual([])
    expect(kepler.localRoutes).toEqual([])
    expect(sol.gates[0].links).toEqual(['vega'])
  })

  test('angle and period default to zero: the object never moves', () => {
    expect(sol.planets[0]).toMatchObject({ angle: 0, period: 0 })
    expect(vega.gates[0].angle).toBe(0)
  })

  test("a gate is 'nominal' unless told otherwise", () => {
    expect(sol.gates[0].status).toBe('nominal')
  })

  test('rocks default to an empty array, never generated', () => {
    expect(vega.asteroidFields[0].rocks).toEqual([])
  })
})

describe('nothing is invented', () => {
  test('meaningful fields left out stay undefined', () => {
    expect(kepler.faction).toBeUndefined()
    expect(kepler.security).toBeUndefined()
    expect(kepler.star.class).toBeUndefined()

    const giant = vega.planets[0]
    expect(giant.moons).toBeUndefined()
    expect(giant.habitable).toBeUndefined()
    expect(giant.resources).toBeUndefined()
    expect(vega.asteroidFields[0].richness).toBeUndefined()
    expect(sol.planets[1].stations[1].docks).toBeUndefined()
  })

  test('no color and no display label anywhere in the output', () => {
    const serialized = JSON.stringify(galaxy)
    for (const field of ['color', 'typeName', 'style', 'label']) {
      expect(serialized).not.toContain(`"${field}"`)
    }
  })

  test('the galaxy shares no object or array with its description', () => {
    const input: GalaxyInput = JSON.parse(JSON.stringify(universe))
    const built = createGalaxy(input)
    const rocks = input.systems[0].asteroidFields?.[0].rocks
    const links = input.systems[0].gates?.[0].links
    if (!rocks || !links) throw new Error('fixture changed: Sol needs rocks and a linked gate')

    rocks[0][0] = 999
    rocks.push([1, 1, 1])
    links.push('kepler')

    expect(built.systems[0].asteroidFields[0].rocks).toEqual([
      [200, 10, 2],
      [-190, 40, 3],
    ])
    expect(built.systems[0].gates[0].links).toEqual(['vega'])
  })

  test('the input is never mutated', () => {
    const before = JSON.stringify(universe)
    createGalaxy(universe)
    expect(JSON.stringify(universe)).toBe(before)
  })
})

describe('edge cases', () => {
  test('an empty galaxy is valid', () => {
    const empty = createGalaxy({ systems: [] })
    expect(empty.systems).toEqual([])
    expect(empty.meta).toMatchObject({ systemCount: 0, laneCount: 0, galaxyRadius: 0 })
  })

  test('input that is not a { systems } object is rejected clearly', () => {
    // @ts-expect-error — testing the runtime guard, not the types.
    expect(() => createGalaxy(null)).toThrow(TypeError)
    // @ts-expect-error — same.
    expect(() => createGalaxy({})).toThrow(/systems/)
  })

  test('the built galaxy survives a JSON round trip', () => {
    expect(JSON.parse(JSON.stringify(galaxy))).toEqual(galaxy)
  })
})
