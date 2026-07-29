import type { JSX } from 'react'

import { cn } from '@/lib/utils'

/**
 * The backdrop of the home page: a star field, with the lanes between the
 * closest systems drawn in.
 *
 * It is the subject of the libraries rather than a decoration — stars scattered
 * across a plane, and the lanes that `findRoute()` walks. Which is also why it
 * is an SVG built here rather than an image: it inherits `currentColor`, so one
 * drawing serves both themes.
 *
 * Everything is derived from a **seeded** generator. `Math.random()` would give
 * the server and the client two different skies and React would report a
 * hydration mismatch; with a seed the drawing is a pure function of a number,
 * computed once when the page is prerendered.
 */

const WIDTH = 1600
const HEIGHT = 900
const STAR_COUNT = 190

/** How close two stars must be for a lane to be drawn between them. */
const LANE_DISTANCE = 132

/** mulberry32 — small, fast, and good enough for scattering points. */
function seeded(seed: number): () => number {
  let state = seed

  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** `id` exists so React has a stable key that is not an array index. */
type Star = { id: string; x: number; y: number; r: number; o: number }

function buildSky(): { stars: Star[]; lanes: { id: string; a: Star; b: Star }[] } {
  const random = seeded(20260729)
  const stars: Star[] = []

  for (let i = 0; i < STAR_COUNT; i += 1) {
    // `**2.4` biases the distribution towards small radii: a sky is mostly faint
    // pinpricks, with the occasional bright one. A uniform draw reads as noise.
    const scale = random() ** 2.4

    stars.push({
      id: `star-${i}`,
      x: Math.round(random() * WIDTH),
      y: Math.round(random() * HEIGHT),
      r: Number((0.5 + scale * 2.6).toFixed(2)),
      o: Number((0.25 + scale * 0.75).toFixed(2)),
    })
  }

  // Lanes only between near neighbours, and only one per pair — the same rule
  // the model uses, and what keeps this from turning into a mesh.
  const lanes: { id: string; a: Star; b: Star }[] = []

  for (let i = 0; i < stars.length; i += 1) {
    for (let j = i + 1; j < stars.length; j += 1) {
      const a = stars[i]
      const b = stars[j]
      if (Math.hypot(a.x - b.x, a.y - b.y) < LANE_DISTANCE) {
        lanes.push({ id: `${a.id}:${b.id}`, a, b })
      }
    }
  }

  return { stars, lanes }
}

const SKY = buildSky()

export function StarField({ className }: { className?: string }): JSX.Element {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        className="size-full text-foreground"
      >
        <g stroke="currentColor" strokeWidth="0.5" className="opacity-[0.09] dark:opacity-[0.13]">
          {SKY.lanes.map((lane) => (
            <line key={lane.id} x1={lane.a.x} y1={lane.a.y} x2={lane.b.x} y2={lane.b.y} />
          ))}
        </g>

        <g fill="currentColor" className="opacity-40 dark:opacity-70">
          {SKY.stars.map((star) => (
            <circle key={star.id} cx={star.x} cy={star.y} r={star.r} opacity={star.o} />
          ))}
        </g>
      </svg>
    </div>
  )
}
