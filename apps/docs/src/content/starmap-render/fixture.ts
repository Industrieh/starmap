/**
 * The universe every preview on the `starmap-render` pages is drawn from.
 *
 * It exists so that the pictures in the documentation are **the real output**:
 * each one is produced by calling the renderer while the page is prerendered,
 * not exported from a design tool and pasted in. A drawing that stops matching
 * the code cannot happen — there is only one of them.
 *
 * One galaxy, five systems, and one of them carrying one of everything drawable:
 * two planets, a station, a gate, a belt and a cluster, plus a local route. It is
 * deliberately small — its source is printed next to the drawings, and a fixture
 * nobody can read teaches nothing.
 *
 * **These modules resolve to the packages' sources**, through the `paths` of this
 * app's `tsconfig.json`, which Next.js follows. A change to the renderer shows up
 * here at the next reload of `bun run docs` — there is no package to build first,
 * and no stale `dist/` to draw yesterday's renderer.
 *
 * `FIXTURE_SOURCE` and `GALAXY` are the same universe written twice — once as
 * text to print, once as code to run — so the module checks, when it loads, that
 * the text still builds exactly that galaxy. Edit one without the other and the
 * build fails here, instead of a page printing a source that is not the one its
 * drawings came from.
 */

import { createGalaxy, type Galaxy, type StarSystem } from '@industrieh/starmap'

/** The source shown next to the drawings. It builds exactly {@link GALAXY}. */
export const FIXTURE_SOURCE = `import { createGalaxy } from '@industrieh/starmap'

const galaxy = createGalaxy({
  systems: [
    {
      id: 'sol', name: 'Sol', x: 0, y: 0,
      faction: { id: 'consortium', name: 'Consortium' },
      star: { class: 'G', radius: 18 },
      planets: [
        { name: 'Aurelia', type: 'rocky', orbit: 95, radius: 5, period: 12 },
        {
          name: 'Vesper', type: 'terran', orbit: 165, radius: 7,
          angle: 40, period: 26, habitable: true,
          stations: [{ name: 'High Anchorage', type: 'trade', orbit: 18, period: 5 }],
        },
      ],
      asteroidFields: [
        { kind: 'belt', name: 'Inner Belt', orbit: 235, width: 22, arcStart: 20, arcSweep: 250 },
        { kind: 'cluster', name: 'The Shoals', x: -150, y: 120, radius: 34 },
      ],
      gates: [{ name: 'Sol Gate', orbit: 300, angle: 315, links: ['vega'] }],
      localRoutes: [
        { from: { kind: 'planet', id: 'sol-p1' }, to: { kind: 'station', id: 'sol-p1-st0' },
          type: 'docking' },
      ],
    },
    { id: 'vega',   name: 'Vega',   x: 420,  y: 160,  star: { class: 'A', radius: 22 },
      faction: { id: 'covenant', name: 'Covenant' } },
    { id: 'rigel',  name: 'Rigel',  x: 250,  y: -220, star: { class: 'B', radius: 26 } },
    { id: 'altair', name: 'Altair', x: -310, y: 90,   star: { class: 'K', radius: 14 } },
    { id: 'lyra',   name: 'Lyra',   x: 620,  y: -60,  star: { class: 'M', radius: 12 } },
  ],
  lanes: [
    { from: 'sol', to: 'vega' },
    { from: 'sol', to: 'rigel' },
    { from: 'sol', to: 'altair' },
    { from: 'vega', to: 'lyra' },
    { from: 'rigel', to: 'lyra' },
  ],
})`

export const GALAXY: Galaxy = createGalaxy({
  systems: [
    {
      id: 'sol',
      name: 'Sol',
      x: 0,
      y: 0,
      faction: { id: 'consortium', name: 'Consortium' },
      star: { class: 'G', radius: 18 },
      planets: [
        { name: 'Aurelia', type: 'rocky', orbit: 95, radius: 5, period: 12 },
        {
          name: 'Vesper',
          type: 'terran',
          orbit: 165,
          radius: 7,
          angle: 40,
          period: 26,
          habitable: true,
          stations: [{ name: 'High Anchorage', type: 'trade', orbit: 18, period: 5 }],
        },
      ],
      asteroidFields: [
        { kind: 'belt', name: 'Inner Belt', orbit: 235, width: 22, arcStart: 20, arcSweep: 250 },
        { kind: 'cluster', name: 'The Shoals', x: -150, y: 120, radius: 34 },
      ],
      gates: [{ name: 'Sol Gate', orbit: 300, angle: 315, links: ['vega'] }],
      localRoutes: [
        {
          from: { kind: 'planet', id: 'sol-p1' },
          to: { kind: 'station', id: 'sol-p1-st0' },
          type: 'docking',
        },
      ],
    },
    {
      id: 'vega',
      name: 'Vega',
      x: 420,
      y: 160,
      star: { class: 'A', radius: 22 },
      faction: { id: 'covenant', name: 'Covenant' },
    },
    { id: 'rigel', name: 'Rigel', x: 250, y: -220, star: { class: 'B', radius: 26 } },
    { id: 'altair', name: 'Altair', x: -310, y: 90, star: { class: 'K', radius: 14 } },
    { id: 'lyra', name: 'Lyra', x: 620, y: -60, star: { class: 'M', radius: 12 } },
  ],
  lanes: [
    { from: 'sol', to: 'vega' },
    { from: 'sol', to: 'rigel' },
    { from: 'sol', to: 'altair' },
    { from: 'vega', to: 'lyra' },
    { from: 'rigel', to: 'lyra' },
  ],
})

/**
 * The guard described at the top: run the printed source, compare the result.
 *
 * The object literal is cut out of the text and evaluated as plain JavaScript —
 * it is a literal, with no import or variable in it, so that is all it needs.
 * This runs once per build, on our own string, never on anything a reader sent.
 */
function assertSourceBuildsGalaxy(): void {
  const start = FIXTURE_SOURCE.indexOf('createGalaxy(')
  const end = FIXTURE_SOURCE.lastIndexOf(')')
  if (start === -1 || end <= start) {
    throw new Error('fixture.ts: FIXTURE_SOURCE no longer reads `createGalaxy({ … })`')
  }
  const literal = FIXTURE_SOURCE.slice(start + 'createGalaxy('.length, end)
  const input = new Function(`return (${literal})`)() as Parameters<typeof createGalaxy>[0]

  if (JSON.stringify(createGalaxy(input)) !== JSON.stringify(GALAXY)) {
    throw new Error(
      'fixture.ts: FIXTURE_SOURCE and GALAXY describe different universes — edit both together',
    )
  }
}

assertSourceBuildsGalaxy()

/** The system carrying one of everything. */
export const SOL: StarSystem = GALAXY.systems[0]
