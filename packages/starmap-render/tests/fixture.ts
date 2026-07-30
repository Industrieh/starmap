/**
 * A small universe, shared by the tests.
 *
 * It carries one of everything the renderer can draw — a habitable planet, a
 * gas giant with enough moons to earn a ring, a station, an unstable gate, a
 * belt, a cluster with rocks, a local route — plus a system with nothing but a
 * star, which is the case most likely to produce an empty layer.
 */

import { createGalaxy, type Galaxy, type StarSystem } from '@industrieh/starmap'

export const galaxy: Galaxy = createGalaxy({
  seed: 'render-test',
  systems: [
    {
      id: 'sol',
      name: 'Sol',
      x: 0,
      y: 0,
      faction: { id: 'consortium', name: 'Vega Consortium' },
      security: 0.9,
      star: { class: 'G', radius: 18 },
      planets: [
        { name: 'Sol I', type: 'rocky', orbit: 90, radius: 5, period: 12 },
        {
          id: 'earth',
          name: 'Earth',
          type: 'terran',
          orbit: 150,
          radius: 6,
          angle: 30,
          period: 24,
          habitable: true,
          stations: [{ name: 'High Anchorage', type: 'trade', orbit: 14, period: 4, docks: 8 }],
        },
        { name: 'Sol III', type: 'gas', orbit: 260, radius: 14, period: 60, moons: 5 },
      ],
      asteroidFields: [
        {
          kind: 'belt',
          name: 'Inner Belt',
          orbit: 200,
          width: 12,
          arcStart: 20,
          arcSweep: 140,
          rocks: [
            [180, 40, 2],
            [190, 60, 1.5],
          ],
        },
        { kind: 'cluster', name: 'The Shoal', x: -220, y: 80, radius: 30, rocks: [[-220, 80, 3]] },
      ],
      gates: [{ name: 'Sol Gate', orbit: 300, angle: 45, links: ['vega'], status: 'unstable' }],
      localRoutes: [
        {
          from: { kind: 'planet', id: 'earth' },
          to: { kind: 'gate', id: 'sol-gate0' },
          type: 'orbital',
        },
      ],
    },
    {
      id: 'vega',
      name: 'Vega',
      x: 400,
      y: 300,
      star: { class: 'A', radius: 22 },
      planets: [{ name: 'Vega I', orbit: 260, radius: 14, period: 60 }],
    },
    { id: 'kepler', name: 'Kepler <&>', x: -250, y: 600, star: { radius: 12 } },
  ],
  lanes: [
    { from: 'sol', to: 'vega' },
    { from: 'vega', to: 'kepler' },
  ],
})

export const sol: StarSystem = galaxy.systems[0]
export const vega: StarSystem = galaxy.systems[1]
export const kepler: StarSystem = galaxy.systems[2]
