/**
 * Framing, arcs and the backdrop.
 *
 * These are the parts with real arithmetic in them, and the parts a degenerate
 * galaxy breaks first — one system, no systems, a system with nothing in it.
 */

import { createGalaxy } from '@cotontigeh/starmap'
import { describe, expect, test } from 'vitest'

import { arcPath, backdropStars, galaxyViewBox, systemViewBox, viewBoxAttr } from '../src/index'
import { galaxy, sol } from './fixture'

describe('systemViewBox', () => {
  test('is square and centred on the star', () => {
    const view = systemViewBox(sol, 0)
    expect(view).toEqual({ x: -sol.outerLimit, y: -sol.outerLimit, w: 600, h: 600 })
  })

  test('the margin is a fraction of the system edge', () => {
    expect(systemViewBox(sol, 0.5).w).toBe(sol.outerLimit * 3)
  })

  test('a negative margin is treated as none', () => {
    expect(systemViewBox(sol, -2)).toEqual(systemViewBox(sol, 0))
  })
})

describe('galaxyViewBox', () => {
  test('encloses every system', () => {
    const view = galaxyViewBox(galaxy, 0)
    expect(view).toEqual({ x: -250, y: 0, w: 650, h: 600 })
  })

  test('a single system still gets a box with an area', () => {
    const one = createGalaxy({
      systems: [{ id: 'a', name: 'A', x: 10, y: 10, star: { radius: 5 } }],
    })
    const view = galaxyViewBox(one)
    expect(view.w).toBeGreaterThan(0)
    expect(view.h).toBeGreaterThan(0)
  })

  test('a galaxy with no systems still gets a box', () => {
    expect(galaxyViewBox(createGalaxy({ systems: [] }))).toEqual({
      x: -100,
      y: -100,
      w: 200,
      h: 200,
    })
  })
})

describe('viewBoxAttr', () => {
  test('is the four numbers, rounded, in order', () => {
    expect(viewBoxAttr({ x: -1.005, y: 0, w: 2.5, h: 3 })).toBe('-1 0 2.5 3')
  })
})

describe('arcPath', () => {
  test('a quarter turn starts on the right and ends at the bottom', () => {
    expect(arcPath(100, 0, 90)).toBe('M 100 0 A 100 100 0 0 1 0 100')
  })

  test('past half a turn it sets the large-arc flag', () => {
    expect(arcPath(50, 0, 270)).toContain('A 50 50 0 1 1')
  })

  test('a full ring becomes two half circles, because one arc cannot close', () => {
    const path = arcPath(80, 0, 360)
    expect(path.match(/A/g)).toHaveLength(2)
    expect(path).toBe('M 80 0 A 80 80 0 1 1 -80 0 A 80 80 0 1 1 80 0')
  })
})

describe('backdropStars', () => {
  test('the same seed gives the same sky', () => {
    expect(backdropStars(5, 100, 'sol')).toEqual(backdropStars(5, 100, 'sol'))
  })

  test('two seeds give two skies', () => {
    expect(backdropStars(5, 100, 'sol')).not.toEqual(backdropStars(5, 100, 'vega'))
  })

  test('a string seed and its own hash are interchangeable in kind, not in value', () => {
    expect(backdropStars(3, 10, 7)).toHaveLength(3)
    expect(backdropStars(3, 10, 'seven')).not.toEqual(backdropStars(3, 10, 7))
  })

  test('stays inside the square it is given', () => {
    for (const star of backdropStars(200, 100, 'sol')) {
      expect(Math.abs(star.x)).toBeLessThanOrEqual(100)
      expect(Math.abs(star.y)).toBeLessThanOrEqual(100)
      expect(star.o).toBeGreaterThan(0)
    }
  })

  test('scale multiplies the dots, not their positions', () => {
    const [plain] = backdropStars(1, 100, 'sol')
    const [scaled] = backdropStars(1, 100, 'sol', 4)
    expect(scaled.x).toBe(plain.x)
    expect(scaled.r).toBeCloseTo(plain.r * 4)
  })

  test('a count of zero draws no sky', () => {
    expect(backdropStars(0, 100, 'sol')).toEqual([])
  })
})
