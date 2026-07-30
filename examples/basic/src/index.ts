/**
 * Runnable example: `bun run example` from the root of the monorepo.
 *
 * It walks the whole path a consumer of the core takes — describe, check what
 * the library does not check, query, animate — on a universe small enough to
 * take in at a glance.
 */

import {
  connectedComponents,
  createGalaxy,
  findRoute,
  GalaxyValidationError,
  indexGalaxy,
  stationsOf,
  systemPositions,
  type GalaxyInput,
} from '@industrieh/starmap'

// --- 1. Describe ------------------------------------------------------------
// Everything derivable is left out: planet ids, hyperlane lengths, system edges
// and the counters in `meta`.

const universe: GalaxyInput = {
  seed: 'example-001',
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
          // An explicit id: it becomes a key in the game state, and it does not
          // move if a planet is later inserted before this one.
          id: 'earth',
          name: 'Earth',
          type: 'terran',
          orbit: 150,
          radius: 6,
          angle: 30,
          period: 24,
          habitable: true,
          resources: 'water',
          stations: [{ name: 'High Anchorage', type: 'trade', orbit: 14, period: 4, docks: 8 }],
        },
      ],
      gates: [{ name: 'Sol Gate', orbit: 300, angle: 45, links: ['vega'] }],
    },
    {
      id: 'vega',
      name: 'Vega',
      x: 400,
      y: 300,
      star: { class: 'A', radius: 22 },
      planets: [{ name: 'Vega I', type: 'gas', orbit: 260, radius: 14, period: 60 }],
      gates: [{ name: 'Vega Gate', orbit: 400, links: ['sol', 'kepler'] }],
    },
    {
      id: 'kepler',
      name: 'Kepler',
      x: -250,
      y: 600,
      star: { radius: 12 },
      gates: [{ name: 'Kepler Gate', orbit: 180, links: ['vega'] }],
    },
  ],
  lanes: [
    { from: 'sol', to: 'vega' },
    { from: 'vega', to: 'kepler' },
  ],
}

// --- 2. Build ---------------------------------------------------------------
// `createGalaxy` normalizes, then validates. An inconsistency throws a
// GalaxyValidationError carrying **every** problem, not just the first one.

let galaxy
try {
  galaxy = createGalaxy(universe)
} catch (e) {
  if (e instanceof GalaxyValidationError) {
    for (const issue of e.issues) console.error(`✗ ${issue.path}: ${issue.message}`)
  }
  throw e
}

const { meta } = galaxy
console.log(`✦ ${meta.systemCount} systems, ${meta.planetCount} planets, \
${meta.stationCount} stations, radius ${meta.galaxyRadius}`)

// --- 3. Check what the library does not -------------------------------------
// Validation guarantees integrity, not that the world is plausible. A system
// nobody can fly to is a game bug: it is up to the application to decide.

const parts = connectedComponents(galaxy)
if (parts.length > 1) {
  throw new Error(`Split network: ${parts.length} groups, stranded → ${parts.slice(1).flat()}`)
}
console.log(`✦ One single network: ${parts[0].length} systems reachable`)

// --- 4. Query ---------------------------------------------------------------

const index = indexGalaxy(galaxy)
const entry = index.get('earth-st0') // derived id: <planetId>-st<rank>
if (entry?.kind === 'station') {
  console.log(`✦ ${entry.obj.name}: ${entry.obj.docks} docks, in ${entry.systemId}`)
}

const route = findRoute(galaxy, 'sol', 'kepler')
if (route) {
  console.log(`✦ Sol → Kepler: ${route.jumps} jumps, ${Math.round(route.distance)} units`)
  console.log(`  ${route.systemIds.join(' → ')}`)
}

console.log(
  `✦ Stations of Sol: ${stationsOf(galaxy.systems[0])
    .map((s) => s.name)
    .join(', ')}`,
)

// --- 5. Animate -------------------------------------------------------------
// `t` is **simulation** time, in seconds: you are the one advancing it. Earth
// loops in 24 s, so at t = 6 it has turned a quarter of the way round.

for (const t of [0, 6, 12]) {
  const pos = systemPositions(galaxy.systems[0], t)
  const earth = pos.get('earth')
  const station = pos.get('earth-st0')
  if (!earth || !station) continue
  console.log(
    `✦ t=${String(t).padStart(2)}s  Earth (${earth.x.toFixed(0)}, ${earth.y.toFixed(0)})` +
      `  ·  its station follows at (${station.x.toFixed(0)}, ${station.y.toFixed(0)})`,
  )
}

// --- 6. Keep game state alongside -------------------------------------------
// The galaxy is never mutated: state lives beside it, keyed by the same ids.

const state = { stationOwners: { 'earth-st0': 'consortium' } }
const owner = state.stationOwners['earth-st0'] ?? 'nobody'
console.log(`✦ High Anchorage belongs to: ${owner}`)
