/**
 * Validation: what the library rejects, and what it lets through.
 *
 * The line is deliberate. It rejects anything that makes the universe unusable —
 * a duplicate id breaks indexing, a dangling reference breaks navigation. It
 * accepts anything that is merely implausible: that is your world, not its own.
 */

import { describe, expect, test } from 'vitest'

import {
  createGalaxy,
  GalaxyValidationError,
  validateGalaxy,
  type Galaxy,
  type GalaxyInput,
} from '../src/index'
import { universe } from './fixture'

/** Build with validation off, so a test can trigger it by hand. */
const raw = (input: GalaxyInput): Galaxy => createGalaxy(input, { validate: false })

/** Just the paths of the reported problems, for readable assertions. */
const paths = (galaxy: Galaxy): string[] => validateGalaxy(galaxy).map((i) => i.path)

const system = (id: string, x = 0, y = 0) => ({ id, name: id, x, y, star: { radius: 10 } })

describe('a healthy universe reports nothing', () => {
  test('the fixture passes', () => {
    expect(validateGalaxy(createGalaxy(universe))).toEqual([])
  })
})

describe('reported problems', () => {
  test('duplicate system id', () => {
    expect(paths(raw({ systems: [system('a'), system('a', 50)] }))).toContain('systems[1].id')
  })

  test('a provided id collides with a derived one', () => {
    const galaxy = raw({
      systems: [
        {
          ...system('a'),
          // The first planet derives to `a-p0`, which the second one then claims.
          planets: [
            { name: 'P1', orbit: 50, radius: 2 },
            { id: 'a-p0', name: 'P2', orbit: 80, radius: 2 },
          ],
        },
      ],
    })
    expect(paths(galaxy)).toContain('systems[0].planets[1].id')
  })

  test('hyperlane pointing at a system that does not exist', () => {
    const galaxy = raw({ systems: [system('a')], lanes: [{ from: 'a', to: 'ghost' }] })
    expect(paths(galaxy)).toContain('lanes[0].to')
  })

  test('hyperlane looping on itself, or duplicated', () => {
    const loop = raw({ systems: [system('a')], lanes: [{ from: 'a', to: 'a' }] })
    expect(validateGalaxy(loop).some((i) => /link a system to itself/.test(i.message))).toBe(true)

    const duplicate = raw({
      systems: [system('a'), system('b', 100)],
      // Direction does not matter: this is the same pair twice.
      lanes: [
        { from: 'a', to: 'b' },
        { id: 'other', from: 'b', to: 'a' },
      ],
    })
    expect(validateGalaxy(duplicate).some((i) => /already linked/.test(i.message))).toBe(true)
  })

  test('gate reaching an unknown system, or its own', () => {
    const galaxy = raw({
      systems: [{ ...system('a'), gates: [{ name: 'G', orbit: 40, links: ['ghost', 'a'] }] }],
    })
    expect(paths(galaxy)).toEqual(
      expect.arrayContaining(['systems[0].gates[0].links[0]', 'systems[0].gates[0].links[1]']),
    )
  })

  test('local route crossing into another system', () => {
    const galaxy = raw({
      systems: [
        {
          ...system('a'),
          localRoutes: [{ from: { kind: 'system', id: 'a' }, to: { kind: 'system', id: 'b' } }],
        },
        system('b', 100),
      ],
    })
    const issue = validateGalaxy(galaxy).find((i) => i.path === 'systems[0].localRoutes[0].to.id')
    expect(issue?.message).toMatch(/belongs to b/)
  })

  test('local route ids are unique too: no duplicate, no id taken by an object', () => {
    const planets = [
      { name: 'P0', orbit: 50, radius: 2 },
      { name: 'P1', orbit: 80, radius: 2 },
    ]
    const p0 = { kind: 'planet', id: 'a-p0' } as const
    const p1 = { kind: 'planet', id: 'a-p1' } as const

    // Same two ends, no id given: both derive `a-p0>a-p1`.
    const twice = raw({
      systems: [
        {
          ...system('a'),
          planets,
          localRoutes: [
            { from: p0, to: p1 },
            { from: p0, to: p1, type: 'shortcut' },
          ],
        },
      ],
    })
    expect(paths(twice)).toEqual(['systems[0].localRoutes[1].id'])

    const taken = raw({
      systems: [{ ...system('a'), planets, localRoutes: [{ id: 'a-p1', from: p0, to: p1 }] }],
    })
    expect(paths(taken)).toEqual(['systems[0].localRoutes[0].id'])

    const sharedWithLane = raw({
      systems: [
        { ...system('a'), planets, localRoutes: [{ id: 'link', from: p0, to: p1 }] },
        system('b', 100),
      ],
      lanes: [{ id: 'link', from: 'a', to: 'b' }],
    })
    expect(paths(sharedWithLane)).toEqual(['lanes[0].id'])
  })

  test('local route looping on one object', () => {
    const galaxy = raw({
      systems: [
        {
          ...system('a'),
          planets: [{ name: 'P', orbit: 50, radius: 2 }],
          localRoutes: [
            { from: { kind: 'planet', id: 'a-p0' }, to: { kind: 'planet', id: 'a-p0' } },
          ],
        },
      ],
    })
    expect(validateGalaxy(galaxy)).toEqual([
      {
        path: 'systems[0].localRoutes[0]',
        message: 'a local route cannot link an object to itself',
      },
    ])
  })

  test('two different pairs of systems are never mistaken for one, whatever the ids contain', () => {
    const galaxy = raw({
      systems: [system('a|b'), system('c', 10), system('a', 20), system('b|c', 30)],
      lanes: [
        { from: 'a|b', to: 'c' },
        { from: 'a', to: 'b|c' },
      ],
    })
    expect(validateGalaxy(galaxy)).toEqual([])
  })

  test('local route pointing at the wrong kind', () => {
    const galaxy = raw({
      systems: [
        {
          ...system('a'),
          planets: [{ id: 'p', name: 'P', orbit: 50, radius: 2 }],
          // `p` is a planet, not a station.
          localRoutes: [{ from: { kind: 'star', id: 'a-star' }, to: { kind: 'station', id: 'p' } }],
        },
      ],
    })
    const issue = validateGalaxy(galaxy).find((i) => i.path === 'systems[0].localRoutes[0].to.kind')
    expect(issue?.message).toMatch(/is a planet, not a station/)
  })

  test('values out of range', () => {
    const galaxy = raw({
      systems: [
        {
          ...system('a'),
          security: 1.4,
          star: { radius: 0 },
          planets: [{ name: 'P', orbit: -10, radius: 2 }],
          asteroidFields: [
            {
              kind: 'belt',
              name: 'C',
              orbit: 90,
              width: 5,
              arcStart: 0,
              arcSweep: 400,
              density: 3,
            },
          ],
        },
      ],
    })
    expect(paths(galaxy)).toEqual(
      expect.arrayContaining([
        'systems[0].security',
        'systems[0].star.radius',
        'systems[0].planets[0].orbit',
        'systems[0].asteroidFields[0].arcSweep',
        'systems[0].asteroidFields[0].density',
      ]),
    )
  })

  test('tampered meta counters', () => {
    const galaxy = createGalaxy({ systems: [system('a')] })
    galaxy.meta.planetCount = 7
    expect(paths(galaxy)).toContain('meta.planetCount')
  })

  test('unrecognizable input is reported, never thrown', () => {
    expect(validateGalaxy({} as Galaxy)).toEqual([
      { path: 'systems', message: 'expected an array' },
    ])
    expect(validateGalaxy(null as unknown as Galaxy)).toHaveLength(1)
  })
})

describe('createGalaxy throws on an invalid universe', () => {
  test('the error carries every problem found', () => {
    let error: unknown
    try {
      createGalaxy({ systems: [system('a'), system('a', 40)], lanes: [{ from: 'a', to: 'x' }] })
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(GalaxyValidationError)
    const issues = (error as GalaxyValidationError).issues
    expect(issues.length).toBeGreaterThanOrEqual(2)
    expect((error as Error).message).toMatch(/Invalid universe/)
  })

  test('validation can be turned off on purpose', () => {
    expect(() => raw({ systems: [system('a'), system('a')] })).not.toThrow()
  })
})

describe('plausibility is accepted: not the library’s call', () => {
  test('orbits shrinking outward, overlapping planets, a gate inside the star', () => {
    const galaxy = createGalaxy({
      systems: [
        {
          ...system('a'),
          planets: [
            { name: 'Outer', orbit: 200, radius: 30 },
            { name: 'Inner', orbit: 40, radius: 30 },
          ],
          gates: [{ name: 'G', orbit: 1, links: [] }],
        },
      ],
    })
    expect(galaxy.systems[0].planets[1].orbit).toBe(40)
  })

  test('a split network builds fine: detecting it is up to you', () => {
    const galaxy = createGalaxy({ systems: [system('a'), system('b', 100)] })
    expect(validateGalaxy(galaxy)).toEqual([])
  })
})
