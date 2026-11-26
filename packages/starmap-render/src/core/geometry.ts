/**
 * Geometry that only a renderer needs: framing, arcs, and a decorative star
 * field.
 *
 * The core library computes where things *are* — `systemPositions()`,
 * `fieldCenter()`. It stops there on purpose, because an arc path is a shape to
 * draw rather than a fact about the world. Those pieces live here.
 *
 * Everything is pure and deterministic. The same system always frames the same
 * way, and the same seed always seeds the same backdrop.
 */

import {
  hashSeed,
  mulberry32,
  round,
  toRad,
  type Galaxy,
  type StarSystem,
} from '@industrieh/starmap'

/** A rectangle of world units, in SVG `viewBox` order. */
export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

/** Empty space kept around a system's edge, as a fraction of `outerLimit`. */
export const SYSTEM_MARGIN = 0.45

/** Empty space kept around a galaxy, as a fraction of its largest dimension. */
export const GALAXY_MARGIN = 0.12

/** Format a {@link ViewBox} as the `viewBox` attribute. */
export function viewBoxAttr(view: ViewBox): string {
  return `${round(view.x)} ${round(view.y)} ${round(view.w)} ${round(view.h)}`
}

/**
 * Framing for one system: its edge, plus a margin.
 *
 * A system's star sits at `(0, 0)` and `outerLimit` is how far its contents
 * reach, so the box is square and centred on the origin.
 *
 * @param margin extra space as a fraction of `outerLimit` — `0` crops to the
 * outermost object
 */
export function systemViewBox(system: StarSystem, margin: number = SYSTEM_MARGIN): ViewBox {
  // A system whose outerLimit is 0 or nonsense still has to produce a valid
  // document, so fall back to something a reader can display.
  const limit =
    Number.isFinite(system.outerLimit) && system.outerLimit > 0 ? system.outerLimit : 100
  const span = limit * (1 + Math.max(margin, 0))
  return { x: -span, y: -span, w: span * 2, h: span * 2 }
}

/**
 * Framing for a whole galaxy: the bounding box of its systems, plus a margin.
 *
 * Unlike a system, a galaxy is not centred on the origin — `createGalaxy()`
 * keeps the positions you gave it.
 *
 * @param margin extra space as a fraction of the largest dimension
 */
export function galaxyViewBox(galaxy: Galaxy, margin: number = GALAXY_MARGIN): ViewBox {
  const points = galaxy.systems.filter((s) => Number.isFinite(s.x) && Number.isFinite(s.y))
  if (points.length === 0) return { x: -100, y: -100, w: 200, h: 200 }

  const xs = points.map((s) => s.x)
  const ys = points.map((s) => s.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  // A single system, or several in a straight line, gives a box with no width or
  // no height. Both would render as nothing at all.
  const w = Math.max(Math.max(...xs) - minX, 1)
  const h = Math.max(Math.max(...ys) - minY, 1)
  const pad = Math.max(w, h) * Math.max(margin, 0)

  return { x: minX - pad, y: minY - pad, w: w + pad * 2, h: h + pad * 2 }
}

/**
 * The `d` of a circular arc centred on the origin.
 *
 * Used for asteroid belts, which are arcs rather than full rings.
 *
 * A single SVG arc cannot describe a complete circle — its end point would be
 * its start point, and the arc would be empty — so past 359.5° it becomes two
 * half circles.
 *
 * @param r radius
 * @param startDeg where the arc starts
 * @param sweepDeg how far it spans
 */
export function arcPath(r: number, startDeg: number, sweepDeg: number): string {
  if (sweepDeg >= 359.5) {
    return `M ${round(r)} 0 A ${round(r)} ${round(r)} 0 1 1 ${round(-r)} 0 A ${round(r)} ${round(r)} 0 1 1 ${round(r)} 0`
  }
  const a0 = toRad(startDeg)
  const a1 = toRad(startDeg + sweepDeg)
  const large = sweepDeg > 180 ? 1 : 0
  const x0 = round(Math.cos(a0) * r)
  const y0 = round(Math.sin(a0) * r)
  const x1 = round(Math.cos(a1) * r)
  const y1 = round(Math.sin(a1) * r)
  return `M ${x0} ${y0} A ${round(r)} ${round(r)} 0 ${large} 1 ${x1} ${y1}`
}

/**
 * The sizes a system drawing derives from its view.
 *
 * A system can be 300 world units across or 30 000. Sizing a gate glyph or a
 * label in absolute units would make it fill the view in one system and vanish
 * in the next, so they are fractions of the view instead. Only the objects
 * themselves — star radius, planet radius, orbits — keep their real size.
 *
 * Exported so that an overlay drawn on top — a selection ring, a ship — can be
 * sized exactly like the drawing under it.
 */
export interface SystemScale {
  /** Spacing unit: a 200th of the view's width. Glyphs and gaps are multiples of it. */
  u: number
  /** Stroke unit: a stroke of `1` is a thin, always-visible line. */
  k: number
  /** Label font size. */
  font: number
}

/** The sizes {@link renderSystem} uses for a given view. */
export function systemScale(view: ViewBox): SystemScale {
  return { u: view.w / 200, k: view.w / 800, font: view.w / 65 }
}

/**
 * The sizes a galaxy drawing derives from its view: a galaxy may be 200 units
 * across or 200 000, and a system dot has to stay a dot in both.
 */
export interface GalaxyScale {
  /** Radius of a system's dot. */
  dot: number
  /** Radius of the faction ring around it. */
  ring: number
  /** Radius of its halo. */
  glow: number
  /** Stroke unit. */
  k: number
  /** Label font size. */
  font: number
}

/** The sizes {@link renderGalaxy} uses for a given view. */
export function galaxyScale(view: ViewBox): GalaxyScale {
  const span = Math.max(view.w, view.h)
  return {
    dot: span * 0.004,
    ring: span * 0.011,
    glow: span * 0.022,
    k: span * 0.0005,
    font: span * 0.0133,
  }
}

/** One star of the decorative backdrop. */
export interface BackdropStar {
  x: number
  y: number
  /** Radius, in world units. */
  r: number
  /** Opacity, `0` to `1`. */
  o: number
}

/**
 * A field of decorative stars, sown in a square centred on the origin.
 *
 * It is scenery, so it runs on its own seed rather than on the galaxy's. A
 * generator that shares one sequence with its backdrop would shift its whole
 * universe by changing the number of background stars.
 *
 * @param count how many
 * @param radius half-side of the square they are sown in
 * @param seed anything stable — a string is hashed, a number is used as is
 * @param scale multiplies each dot's radius. Dots are sized in world units, so
 * a galaxy-wide view needs bigger ones than a single system to look the same.
 */
export function backdropStars(
  count: number,
  radius: number,
  seed: string | number,
  scale = 1,
): BackdropStar[] {
  const next = mulberry32(typeof seed === 'string' ? hashSeed(seed) : seed)
  return Array.from({ length: Math.max(count, 0) }, () => ({
    x: (next() * 2 - 1) * radius,
    y: (next() * 2 - 1) * radius,
    r: (0.4 + next() * 1.4) * scale,
    o: 0.12 + next() * 0.55,
  }))
}
