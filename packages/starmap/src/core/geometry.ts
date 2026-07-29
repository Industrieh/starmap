/**
 * Orbital geometry.
 *
 * Pure functions, no dependencies. They run in a worker, on a server, or behind
 * any renderer — Canvas, WebGL, SVG, a terminal. Nothing here produces a shape
 * to draw; it only produces positions.
 *
 * Conventions: a system's star sits at (0, 0), the Y axis points down (as in
 * SVG), and angles are in degrees, measured clockwise.
 */

import type { AsteroidField, StarSystem, Vec2 } from './types'

/** Degrees to radians. */
export const toRad = (d: number): number => (d * Math.PI) / 180

/**
 * Round to `d` decimal places.
 *
 * Used when normalizing input. Without it the resulting JSON is full of
 * `0.30000000000000004` and twice the size, for no useful precision.
 */
export const round = (n: number, d = 2): number => Number(n.toFixed(d))

/**
 * Position on a circular orbit at time `t`.
 *
 * @param orbit orbit radius
 * @param angleDeg starting angle, at t = 0
 * @param period simulation seconds per full orbit; `0` means it never moves
 * @param t simulation time, in seconds
 */
export function orbitPos(orbit: number, angleDeg: number, period: number, t: number): Vec2 {
  const a = toRad(angleDeg + (period ? (t / period) * 360 : 0))
  return { x: Math.cos(a) * orbit, y: Math.sin(a) * orbit }
}

/**
 * Every position in a system at time `t`, keyed by id.
 *
 * Stations are placed **relative to their planet**, so they follow it around its
 * orbit. Gates and asteroid fields never move.
 *
 * Call this once per frame to animate. It costs one pass over the objects of one
 * system — a few dozen — so there is nothing worth caching.
 *
 * @example
 * ```ts
 * const pos = systemPositions(system, t)
 * pos.get('sol-p1')   // { x, y } of the second planet
 * ```
 */
export function systemPositions(system: StarSystem, t: number): Map<string, Vec2> {
  const pos = new Map<string, Vec2>()
  pos.set(system.star.id, { x: 0, y: 0 })

  for (const p of system.planets) {
    const pp = orbitPos(p.orbit, p.angle, p.period, t)
    pos.set(p.id, pp)
    for (const s of p.stations) {
      const sp = orbitPos(s.orbit, s.angle, s.period, t)
      pos.set(s.id, { x: pp.x + sp.x, y: pp.y + sp.y })
    }
  }
  for (const g of system.gates) pos.set(g.id, orbitPos(g.orbit, g.angle, 0, 0))
  for (const f of system.asteroidFields) pos.set(f.id, fieldCenter(f))
  return pos
}

/** Center of a field: the middle of the arc for a belt, the center for a cluster. */
export function fieldCenter(f: AsteroidField): Vec2 {
  return f.kind === 'belt'
    ? orbitPos(f.orbit, f.arcStart + f.arcSweep / 2, 0, 0)
    : { x: f.x, y: f.y }
}
