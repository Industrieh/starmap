/**
 * A deterministic pseudo-random generator.
 *
 * The library does not generate universes, but it ships the tool you need to
 * write a generator yourself — or to derive game content (loot, encounters,
 * events) reproducibly. `Math.random()` is never called anywhere in the library.
 *
 * Two rules to keep in mind if you build a generator on top of this:
 *
 * - **The order of draws becomes part of your contract.** Insert one extra
 *   `rng.next()` in the middle of your pipeline and everything after it shifts,
 *   so the same seed now produces a different universe. A snapshot test is the
 *   usual way to make that visible.
 * - **Keep your sequences separate.** The pattern `` `${seed}:${id}:${domain}` ``
 *   gives each mechanic its own sequence, so adding one does not disturb the
 *   others.
 */

/** A weighted table entry. `w` is a relative weight, not a probability. */
export interface Weighted {
  w: number
}

/**
 * A deterministic source of randomness. Each instance carries its own state, so
 * two instances created from the same seed produce the same sequence.
 */
export interface Rng {
  /** Float in [0, 1). Every other method builds on this one. */
  next(): number
  /** Float in [min, max). */
  rand(min: number, max: number): number
  /** Integer in [min, max], **both bounds included**. */
  randInt(min: number, max: number): number
  /** A uniformly picked element. The array must not be empty. */
  pick<T>(arr: readonly T[]): T
  /** True with probability `p` (`0` never, `1` always). */
  chance(p: number): boolean
  /** An element picked in proportion to its weight `w`. */
  weighted<T extends Weighted>(table: readonly T[]): T
}

/**
 * FNV-1a hash of a string into an unsigned 32-bit integer. Lets you use any
 * string as a seed.
 */
export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * mulberry32: 32 bits of state, very fast, and more than good enough for content
 * generation. It is not a cryptographic generator.
 */
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Create a random source from a text seed.
 *
 * @example
 * ```ts
 * const rng = createRng('my-game-001')
 * rng.randInt(1, 6)                     // 4
 * rng.pick(['a', 'b', 'c'])             // 'b'
 * rng.weighted([{ w: 9, id: 'common' }, { w: 1, id: 'rare' }])
 * ```
 */
export function createRng(seed: string): Rng {
  const next = mulberry32(hashSeed(seed))
  const rand = (min: number, max: number) => min + next() * (max - min)

  return {
    next,
    rand,
    randInt: (min, max) => Math.floor(rand(min, max + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    weighted(table) {
      const total = table.reduce((s, e) => s + e.w, 0)
      let r = next() * total
      for (const e of table) if ((r -= e.w) <= 0) return e
      // Safety net: floating-point drift can leave `r > 0` past the last entry.
      return table[table.length - 1]
    },
  }
}
