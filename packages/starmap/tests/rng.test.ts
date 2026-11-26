/**
 * The deterministic generator.
 *
 * Its whole value is that a seed is a promise: the same seed, the same draws,
 * forever. These tests pin that promise down — including the values printed in
 * the documentation, which are only worth something while they are true.
 */

import { describe, expect, test } from 'vitest'

import { createRng, hashSeed } from '../src/index'

/** `n` draws of `next()`. */
const draws = (seed: string, n = 5): number[] => {
  const rng = createRng(seed)
  return Array.from({ length: n }, () => rng.next())
}

describe('determinism', () => {
  test('the same seed gives the same sequence', () => {
    expect(draws('seed')).toEqual(draws('seed'))
  })

  test('two seeds give two sequences', () => {
    expect(draws('seed')).not.toEqual(draws('other'))
  })

  test('the documented example holds', () => {
    const rng = createRng('my-game-001')
    expect(rng.randInt(1, 6)).toBe(5)
    expect(rng.pick(['a', 'b', 'c'])).toBe('b')
    expect(
      rng.weighted([
        { w: 9, id: 'common' },
        { w: 1, id: 'rare' },
      ]).id,
    ).toBe('common')
  })

  test('hashSeed is a stable 32-bit unsigned integer', () => {
    const h = hashSeed('my-game-001')
    expect(h).toBe(hashSeed('my-game-001'))
    expect(Number.isInteger(h) && h >= 0 && h < 2 ** 32).toBe(true)
  })
})

describe('ranges', () => {
  test('next stays in [0, 1)', () => {
    for (const n of draws('range', 10_000)) expect(n >= 0 && n < 1).toBe(true)
  })

  test('randInt includes both bounds, and nothing outside them', () => {
    const rng = createRng('dice')
    const seen = new Set(Array.from({ length: 2_000 }, () => rng.randInt(1, 3)))
    expect(seen).toEqual(new Set([1, 2, 3]))
  })

  test('chance(0) never fires, chance(1) always does', () => {
    const rng = createRng('coin')
    for (let i = 0; i < 1_000; i++) {
      expect(rng.chance(0)).toBe(false)
      expect(rng.chance(1)).toBe(true)
    }
  })

  test('a zero weight is never picked when another weight is positive', () => {
    const rng = createRng('weights')
    for (let i = 0; i < 2_000; i++) {
      expect(
        rng.weighted([
          { w: 1, id: 'yes' },
          { w: 0, id: 'never' },
        ]).id,
      ).toBe('yes')
    }
  })
})

describe('misuse is loud', () => {
  test('picking from an empty array throws', () => {
    expect(() => createRng('x').pick([])).toThrow(RangeError)
  })

  test('a weighted table nothing can be picked from throws', () => {
    const rng = createRng('x')
    expect(() => rng.weighted([])).toThrow(RangeError)
    expect(() => rng.weighted([{ w: 0 }, { w: 0 }])).toThrow(RangeError)
    expect(() => rng.weighted([{ w: 2 }, { w: -1 }])).toThrow(RangeError)
    expect(() => rng.weighted([{ w: Number.NaN }])).toThrow(RangeError)
    expect(() => rng.weighted([{ w: Number.POSITIVE_INFINITY }])).toThrow(RangeError)
  })

  test('a call that throws draws nothing: the sequence is untouched', () => {
    const rng = createRng('untouched')
    expect(() => rng.pick([])).toThrow()
    expect(() => rng.weighted([])).toThrow()
    expect(rng.next()).toBe(createRng('untouched').next())
  })
})

describe('fork', () => {
  test('a fork is the seed pattern it documents', () => {
    const fork = createRng('seed').fork('loot')
    const same = createRng('seed:loot')
    expect([fork.next(), fork.next()]).toEqual([same.next(), same.next()])
  })

  test('forking, and drawing from a fork, never moves the parent', () => {
    const plain = createRng('seed')
    const parent = createRng('seed')
    const loot = parent.fork('loot')
    loot.next()
    loot.next()
    expect(parent.next()).toBe(plain.next())
  })

  test('a fork does not depend on the draws made before it', () => {
    const early = createRng('seed').fork('loot').next()
    const rng = createRng('seed')
    rng.next()
    rng.next()
    expect(rng.fork('loot').next()).toBe(early)
  })

  test('forks nest, and two labels give two sequences', () => {
    const nested = createRng('seed').fork('sol').fork('loot')
    expect(nested.next()).toBe(createRng('seed:sol:loot').next())
    expect(createRng('seed').fork('a').next()).not.toBe(createRng('seed').fork('b').next())
  })
})
