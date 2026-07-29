/**
 * Runnable example: describe a universe, then draw it.
 *
 * Four steps, four files in `out/`. Everything the renderer needs is a
 * `Galaxy` from the core and a moment `t`; everything it produces is a string.
 *
 *     bun run example:svg     # from the root of the monorepo
 *     bun run start              # from this folder
 */

import { mkdir, writeFile } from 'node:fs/promises'

import { createGalaxy, findRoute, indexSystems, type GalaxyInput } from '@cotontigeh/starmap'
import { renderGalaxy, renderSystem } from '@cotontigeh/starmap-render'

// --- 1. Describe -----------------------------------------------------------
// Three systems, small enough to read at a glance. Anything derivable is left
// out: planet ids, lane lengths, system edges, the counters in `meta`.

const universe: GalaxyInput = {
  seed: 'basic-render-001',
  systems: [
    {
      id: 'sol',
      name: 'Sol',
      x: 0,
      y: 0,
      faction: { id: 'consortium', name: 'Vega Consortium' },
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
          habitable: true, // drawn as a thin green ring
          stations: [{ name: 'High Anchorage', type: 'trade', orbit: 14, period: 4 }],
        },
        {
          name: 'Sol III',
          type: 'gas',
          orbit: 260,
          radius: 14,
          period: 60,
          moons: 5, // a gas giant with 3 moons or more gets a ring
        },
      ],
      asteroidFields: [
        {
          kind: 'belt',
          name: 'Inner Belt',
          orbit: 200,
          width: 12,
          arcStart: 20,
          arcSweep: 160,
          // The library never invents rocks. These are the ones it draws.
          rocks: [
            [188, 68, 2],
            [155, 126, 1.5],
            [96, 175, 2.4],
          ],
        },
      ],
      gates: [{ name: 'Sol Gate', orbit: 300, angle: 45, links: ['vega'] }],
    },
    {
      id: 'vega',
      name: 'Vega',
      x: 400,
      y: 300,
      faction: { id: 'syndicate', name: 'Free Syndicate' },
      star: { class: 'A', radius: 22 },
      planets: [
        { name: 'Vega I', type: 'ice-giant', orbit: 260, radius: 15, period: 60, moons: 4 },
      ],
      gates: [{ name: 'Vega Gate', orbit: 400, links: ['sol', 'kepler'], status: 'unstable' }],
    },
    {
      id: 'kepler',
      name: 'Kepler',
      x: -250,
      y: 600,
      star: { class: 'M', radius: 12 },
      planets: [{ name: 'Kepler I', type: 'frozen', orbit: 80, radius: 4, period: 9 }],
    },
  ],
  lanes: [
    { from: 'sol', to: 'vega' },
    { from: 'vega', to: 'kepler' },
  ],
}

const galaxy = createGalaxy(universe)
const [sol] = galaxy.systems

// --- 2. Draw a system ------------------------------------------------------
// `t` is simulation time in seconds. Nothing keeps a clock: pass the moment you
// want and you get that moment.

const system = renderSystem(sol, {
  t: 0,
  width: 800,
  height: 800,
  title: `The ${sol.name} system`,
  // With the index, a gate label says where it leads: "Sol Gate → Vega".
  systems: indexSystems(galaxy),
})

// --- 3. Draw the same system, later ----------------------------------------
// Earth's period is 24 s, so at t = 12 it is on the far side of its star — and
// its station has followed it around.

const later = renderSystem(sol, { t: 12, width: 800, height: 800, idPrefix: 'later' })

// --- 4. Draw the galaxy, with a route --------------------------------------
// `highlight` takes an ordered list of system ids, which is exactly what
// `findRoute()` gives back.

const route = findRoute(galaxy, 'sol', 'kepler')

const map = renderGalaxy(galaxy, {
  width: 900,
  height: 800,
  title: 'The galaxy',
  highlight: route?.systemIds,
})

// --- 5. Draw a thumbnail ---------------------------------------------------
// Same call, different options: a light theme, no labels, no backdrop. At this
// size both would be noise.

const thumbnail = renderSystem(sol, {
  width: 96,
  height: 96,
  margin: 0.1,
  labels: false,
  backdrop: 0,
  idPrefix: 'thumb',
  theme: {
    background: '#f6f7fb',
    orbit: '#c8d1e4',
    field: '#d8c89a',
    rock: '#b8a274',
  },
})

// --- Write it out ----------------------------------------------------------
// A drawing is just a string, so this is the only part that touches the disk.
// `node:fs` rather than `Bun.write` on purpose: nothing here needs a runtime.

const out = new URL('../out/', import.meta.url)
await mkdir(out, { recursive: true })

const drawings = [
  ['system.svg', system],
  ['system-t12.svg', later],
  ['galaxy.svg', map],
  ['thumbnail.svg', thumbnail],
] as const

await Promise.all(drawings.map(([name, svg]) => writeFile(new URL(name, out), svg)))

for (const [name, svg] of drawings) {
  console.log(`✦ out/${name.padEnd(15)} ${svg.length.toLocaleString()} characters`)
}

console.log(`✦ route Sol → Kepler: ${route?.systemIds.join(' → ')} (${route?.jumps} jumps)`)
console.log('✦ open them with: open examples/basic-svg-generation/out/*.svg')
