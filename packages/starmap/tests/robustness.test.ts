/**
 * Robustness: input that is not what the types say it is.
 *
 * Both entry points meet data TypeScript never saw — a content file edited by
 * hand, a save from an older build, a server response. Two promises are pinned
 * down here:
 *
 * - `validateGalaxy()` never throws, whatever it is given;
 * - `createGalaxy()` answers a malformed description with a
 *   `GalaxyValidationError` that names the problems — never with a `TypeError`
 *   from its own internals.
 *
 * The last two tests fuzz both promises deterministically: one node of a valid
 * structure, picked at random, is replaced by a value of the wrong type,
 * thousands of times over.
 */

import { describe, expect, test } from 'vitest'

import {
  createGalaxy,
  createRng,
  FORMAT_VERSION,
  GalaxyValidationError,
  validateGalaxy,
  type GalaxyInput,
  type GalaxyIssue,
  type Rng,
} from '../src/index'
import { universe } from './fixture'

/** What `createGalaxy()` threw — failing the test if it threw anything else, or nothing. */
function issuesOf(input: unknown): GalaxyIssue[] {
  try {
    createGalaxy(input as GalaxyInput)
  } catch (error) {
    if (error instanceof GalaxyValidationError) return [...error.issues]
    throw error
  }
  throw new Error('createGalaxy accepted a malformed description')
}

const pathsOf = (input: unknown): string[] => issuesOf(input).map((i) => i.path)

const system = (id: string, extra: object = {}) => ({
  id,
  name: id,
  x: 0,
  y: 0,
  star: { radius: 10 },
  ...extra,
})

describe('createGalaxy names what is malformed', () => {
  test('an entry that is not an object', () => {
    expect(pathsOf({ systems: [null] })).toEqual(['systems[0]'])
    expect(pathsOf({ systems: [system('a', { planets: [42] })] })).toEqual([
      'systems[0].planets[0]',
    ])
  })

  test('a collection that is not an array', () => {
    expect(pathsOf({ systems: [system('a', { planets: 'oops' })] })).toEqual(['systems[0].planets'])
    const gate = { name: 'Gate', orbit: 10, links: 'vega' }
    expect(pathsOf({ systems: [system('a', { gates: [gate] })] })).toEqual([
      'systems[0].gates[0].links',
    ])
  })

  test('a missing star is reported as missing', () => {
    expect(issuesOf({ systems: [{ id: 'a', name: 'A', x: 0, y: 0 }] })).toEqual([
      { path: 'systems[0].star', message: 'missing star' },
    ])
  })

  test('an unknown field kind is reported, not quietly turned into a cluster', () => {
    const field = { kind: 'blet', name: 'Belt', orbit: 10, width: 2, arcStart: 0, arcSweep: 90 }
    expect(pathsOf({ systems: [system('a', { asteroidFields: [field] })] })).toEqual([
      'systems[0].asteroidFields[0].kind',
    ])
  })

  test('a lane list that is not an array does not hide the other problems', () => {
    expect(pathsOf({ systems: [system('a', { x: 'far' })], lanes: 'none' })).toEqual([
      'lanes',
      'systems[0].x',
    ])
  })
})

describe('validateGalaxy never throws', () => {
  test('on a null system next to valid metadata', () => {
    const galaxy = { meta: { formatVersion: FORMAT_VERSION }, systems: [null], lanes: [] }
    expect(() => validateGalaxy(galaxy)).not.toThrow()
    expect(validateGalaxy(galaxy).map((i) => i.path)).toContain('systems[0]')
  })

  test('on a galaxy built for another format, which is reported as that and nothing else', () => {
    const galaxy = JSON.parse(JSON.stringify(createGalaxy(universe)))
    galaxy.meta.formatVersion = FORMAT_VERSION + 1
    galaxy.systems = 'a shape this version cannot read'
    expect(validateGalaxy(galaxy)).toEqual([
      {
        path: 'meta.formatVersion',
        message: `built for format ${FORMAT_VERSION + 1}, but this library reads format ${FORMAT_VERSION} — migrate it first`,
      },
    ])
  })

  test('on any corruption of a valid galaxy', () => {
    const base = JSON.stringify(createGalaxy(universe))
    const rng = createRng('fuzz:validate')
    for (let run = 0; run < 3_000; run++) {
      const galaxy = JSON.parse(base)
      corrupt(galaxy, rng)
      expect(() => validateGalaxy(galaxy)).not.toThrow()
    }
  })
})

describe('createGalaxy throws nothing but GalaxyValidationError', () => {
  test('on any corruption of a valid description', () => {
    const base = JSON.stringify(universe)
    const rng = createRng('fuzz:create')
    for (let run = 0; run < 3_000; run++) {
      const input = JSON.parse(base)
      corrupt(input, rng)
      try {
        createGalaxy(input)
      } catch (error) {
        // The one documented exception: the root itself is unusable.
        if (!Array.isArray(input.systems)) expect(error).toBeInstanceOf(TypeError)
        else expect(error).toBeInstanceOf(GalaxyValidationError)
      }
    }
  })
})

// ---------------------------------------------------------------- the fuzzer

/** Values of every wrong type, including two JSON cannot carry. */
const GARBAGE: unknown[] = [
  null,
  undefined,
  0,
  -1,
  Number.NaN,
  '',
  'text',
  true,
  [],
  [null],
  {},
  { id: 7 },
]

/** Replace one to three nodes, picked anywhere in the tree, by a value of the wrong type. */
function corrupt(root: object, rng: Rng): void {
  for (let n = rng.randInt(1, 3); n > 0; n--) {
    const slots: [parent: Record<string, unknown>, key: string][] = []
    const walk = (node: unknown): void => {
      if (node === null || typeof node !== 'object') return
      for (const key of Object.keys(node)) {
        slots.push([node as Record<string, unknown>, key])
        walk((node as Record<string, unknown>)[key])
      }
    }
    walk(root)
    if (slots.length === 0) return
    const [parent, key] = rng.pick(slots)
    // A fresh copy every time: a shared object could end up inside itself.
    parent[key] = structuredClone(rng.pick(GARBAGE))
  }
}
