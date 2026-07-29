/**
 * A small hand-written universe, shared by the tests.
 *
 * It is written the way a user of the library would write one: readable ids
 * instead of derived ones, optional fields left out here and there, and
 * derivable fields deliberately omitted elsewhere. Those omissions are what
 * exercise the normalization step.
 */

import type { GalaxyInput } from '../src/index'

export const universe: GalaxyInput = {
  seed: 'test',
  generatedAt: '2026-01-01T00:00:00.000Z',
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
        // No id, no angle, no period: all derived or zeroed.
        { name: 'Sol I', type: 'rocky', orbit: 90, radius: 5 },
        {
          id: 'earth',
          name: 'Earth',
          type: 'terran',
          orbit: 150,
          radius: 6,
          angle: 30,
          period: 24,
          habitable: true,
          resources: 'water',
          stations: [
            { name: 'High Anchorage', type: 'trade', orbit: 14, period: 4, docks: 8 },
            { id: 'shipyard', name: 'Kepler Shipyard', type: 'shipyard', orbit: 22, period: 7 },
          ],
        },
      ],
      asteroidFields: [
        {
          kind: 'belt',
          name: 'Main Belt',
          orbit: 210,
          width: 30,
          arcStart: 0,
          arcSweep: 360,
          density: 0.6,
          richness: 'rich',
          rocks: [
            [200, 10, 2],
            [-190, 40, 3],
          ],
        },
      ],
      gates: [{ name: 'Sol Gate', orbit: 300, angle: 45, links: ['vega'] }],
      localRoutes: [
        { from: { kind: 'star', id: 'sol-star' }, to: { kind: 'planet', id: 'sol-p0' } },
        { from: { kind: 'planet', id: 'sol-p0' }, to: { kind: 'planet', id: 'earth' } },
        {
          from: { kind: 'planet', id: 'earth' },
          to: { kind: 'station', id: 'shipyard' },
          type: 'docking',
        },
      ],
    },
    {
      id: 'vega',
      name: 'Vega',
      x: 400,
      y: 300,
      star: { class: 'A', radius: 22 },
      planets: [{ name: 'Vega I', type: 'gas', orbit: 260, radius: 14, period: 60 }],
      gates: [{ name: 'Vega Gate', orbit: 400, links: ['sol', 'kepler'] }],
      asteroidFields: [
        { kind: 'cluster', name: 'Northern Cluster', x: -180, y: -120, radius: 40, density: 0.3 },
      ],
    },
    {
      id: 'kepler',
      name: 'Kepler',
      x: -250,
      y: 600,
      // No planets, no faction, no security: a system can be nearly empty.
      star: { radius: 12 },
      gates: [{ name: 'Kepler Gate', orbit: 180, links: ['vega'] }],
    },
  ],
  lanes: [
    { from: 'sol', to: 'vega' },
    // Explicit length: the library leaves it alone.
    { from: 'vega', to: 'kepler', length: 1000 },
  ],
}
