/**
 * Smoke test of the packages **as npm users receive them**.
 *
 * The Vitest suites check the TypeScript sources, on whatever Node runs them.
 * What gets installed is something else: a tarball holding the bundled `dist/`,
 * whose internal dependency Bun rewrote at pack time, loaded by whatever Node
 * the user has — down to the oldest one `engines.node` allows. A newer built-in
 * that slipped into the sources (`toSorted()` did, once) passes every test and
 * breaks there.
 *
 * So this file is plain JavaScript, with no dependency and no build step of its
 * own, and it imports the packages **by name**: resolution goes through their
 * real `package.json` `exports`, exactly as in an application. It does not run
 * from the repo itself — Bun's isolated linker gives the repo root no link to
 * the workspaces — and that is fine, because the repo is not what it tests.
 *
 * CI (the `node` job of `.github/workflows/ci.yml`) packs both packages,
 * installs the tarballs into an empty project with npm, and runs this file
 * there, once per Node version. By hand:
 *
 * ```bash
 * bun run --filter './packages/*' build
 * (cd packages/starmap && bun pm pack --destination /tmp/packs)
 * (cd packages/starmap-render && bun pm pack --destination /tmp/packs)
 * mkdir /tmp/consumer && cd /tmp/consumer
 * npm init --yes && npm install /tmp/packs/*.tgz
 * cp <repo>/scripts/smoke.mjs . && node smoke.mjs
 * ```
 *
 * It checks that things work, not how they look: no exact colour, id prefix or
 * coordinate is asserted — the unit tests pin those down.
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import {
  connectedComponents,
  createGalaxy,
  findRoute,
  FORMAT_VERSION,
  GalaxyValidationError,
  indexGalaxy,
  indexSystems,
  validateGalaxy,
} from '@industrieh/starmap'
import { DEFAULT_THEME, renderGalaxy, renderSystem } from '@industrieh/starmap-render'

// ------------------------------------------------------------------- fixture

const INPUT = {
  seed: 'smoke',
  systems: [
    {
      id: 'sol',
      name: 'Sol',
      x: 0,
      y: 0,
      faction: { id: 'consortium', name: 'Consortium' },
      star: { radius: 18, class: 'G' },
      planets: [
        {
          name: 'Terra & Luna',
          type: 'terran',
          orbit: 120,
          radius: 6,
          period: 20,
          habitable: true,
          stations: [{ name: 'Dock', type: 'trade', orbit: 14, period: 5 }],
        },
        { name: 'Jove', type: 'gas', orbit: 260, radius: 16, moons: 4, period: 60 },
      ],
      asteroidFields: [
        {
          kind: 'belt',
          name: 'Main belt',
          orbit: 190,
          width: 18,
          arcStart: 0,
          arcSweep: 360,
          rocks: [[190, 0, 2]],
        },
      ],
      gates: [{ name: 'Sol Gate', orbit: 320, angle: 45, links: ['alpha'] }],
      localRoutes: [
        {
          from: { kind: 'planet', id: 'sol-p0' },
          to: { kind: 'gate', id: 'sol-gate0' },
          type: 'jump-lane',
        },
      ],
    },
    {
      id: 'alpha',
      name: 'Alpha',
      x: 300,
      y: 80,
      star: { radius: 14, class: 'K' },
      gates: [{ name: 'Alpha Gate', orbit: 200, links: ['sol', 'vega'], status: 'unstable' }],
    },
    { id: 'vega', name: 'Vega', x: 520, y: -60, star: { radius: 12, class: 'A' } },
    // Nobody flies here: the network is split on purpose.
    { id: 'lonely', name: 'Lonely', x: -400, y: 300, star: { radius: 10 } },
  ],
  lanes: [
    { from: 'sol', to: 'alpha' },
    { from: 'alpha', to: 'vega' },
  ],
}

// --------------------------------------------------------------- harness

/** @type {{ name: string, run: () => void }[]} */
const checks = []
const check = (name, run) => checks.push({ name, run })

/** The galaxy every later check reads. Built by the first one. */
let galaxy

/** Thrown by a check that cannot run because an earlier one failed. */
class Skipped extends Error {}

const needGalaxy = () => {
  if (!galaxy) throw new Skipped('needs the galaxy createGalaxy failed to build above')
  return galaxy
}

/** Whatever a drawing contains, none of these may leak into it. */
const assertClean = (svg) => {
  for (const leak of ['NaN', 'undefined', 'null', '[object', 'function ']) {
    assert.ok(!svg.includes(leak), `the drawing contains "${leak}"`)
  }
}

/**
 * Well-formed XML, the cheap way: every tag closes, in order. The renderers
 * write no comment, CDATA or processing instruction, so tags are all there is.
 */
const assertWellFormed = (svg) => {
  const stack = []
  for (const [tag, closing, name, selfClosing] of svg.matchAll(
    /<(\/?)([A-Za-z][\w:.-]*)(?:\s[^<>]*?)?(\/?)>/g,
  )) {
    if (selfClosing) continue
    if (!closing) stack.push(name)
    else assert.equal(stack.pop(), name, `unbalanced tag ${tag}`)
  }
  assert.deepEqual(stack, [], `unclosed tag(s): ${stack.join(', ')}`)
  assert.ok(!/<[^>]*</.test(svg), 'a "<" inside a tag')
}

// ---------------------------------------------------------------- checks

check('the two tarballs fit together', () => {
  // npm installs a second, nested copy of the core when the range Bun wrote
  // into starmap-render does not accept the core packed next to it — a stale
  // bun.lock, see `scripts/relock.ts`. The renderer would then run on a core
  // that is not the one under test.
  const nested = new URL(
    './node_modules/@industrieh/starmap-render/node_modules/@industrieh/starmap/package.json',
    import.meta.url,
  )
  assert.ok(!existsSync(nested), 'starmap-render did not accept the starmap packed alongside it')
})

check('createGalaxy builds a universe with lanes, and fills in what it can', () => {
  galaxy = createGalaxy(INPUT)
  const { meta } = galaxy
  assert.equal(meta.formatVersion, FORMAT_VERSION)
  assert.equal(meta.seed, 'smoke')
  assert.deepEqual(
    [meta.systemCount, meta.laneCount, meta.planetCount, meta.stationCount],
    [4, 2, 2, 1],
  )
  assert.deepEqual([meta.gateCount, meta.asteroidFieldCount], [2, 1])

  const [earth] = galaxy.systems[0].planets
  assert.equal(earth.id, 'sol-p0')
  assert.equal(earth.stations[0].id, 'sol-p0-st0')
  assert.equal(earth.stations[0].planetId, 'sol-p0')
  assert.ok(Math.abs(galaxy.lanes[0].length - Math.hypot(300, 80)) < 0.01, 'derived lane length')
})

check('createGalaxy rejects a broken universe, listing every problem', () => {
  const twin = { id: 'twin', name: 'Twin', x: 0, y: 0, star: { radius: 5 } }
  assert.throws(
    () =>
      createGalaxy({ systems: [twin, { ...twin, x: 10 }], lanes: [{ from: 'twin', to: 'ghost' }] }),
    (error) => {
      // Anything else is a crash, not a verdict: let it through, stack and all.
      if (!(error instanceof GalaxyValidationError)) throw error
      const paths = new Set(error.issues.map((issue) => issue.path))
      assert.ok(paths.has('systems[1].id'), 'the duplicate id is reported')
      assert.ok(paths.has('lanes[0].to'), 'the unknown system is reported')
      return true
    },
  )
})

check('validateGalaxy accepts a JSON round trip, reports tampering, never throws', () => {
  const saved = JSON.stringify(needGalaxy())
  assert.deepEqual(validateGalaxy(JSON.parse(saved)), [])

  const tampered = JSON.parse(saved)
  tampered.lanes[0].to = 'nowhere'
  tampered.meta.planetCount = 99
  const paths = new Set(validateGalaxy(tampered).map((issue) => issue.path))
  assert.ok(paths.has('lanes[0].to'))
  assert.ok(paths.has('meta.planetCount'))

  assert.equal(validateGalaxy(null).length, 1)
  assert.equal(validateGalaxy({}).length, 1)
})

check('findRoute walks the network, and knows where it ends', () => {
  const g = needGalaxy()
  const route = findRoute(g, 'sol', 'vega')
  assert.ok(route, 'a route exists')
  assert.deepEqual(route.systemIds, ['sol', 'alpha', 'vega'])
  assert.equal(route.jumps, 2)
  assert.ok(Math.abs(route.distance - (g.lanes[0].length + g.lanes[1].length)) < 1e-9)
  assert.equal(findRoute(g, 'sol', 'lonely'), null)
  assert.equal(findRoute(g, 'sol', 'nowhere'), null)
})

check('connectedComponents finds the stranded system, largest group first', () => {
  const parts = connectedComponents(needGalaxy())
  assert.equal(parts.length, 2)
  // Compared as sets: the order inside a component is not part of the contract
  // — and `toSorted()`, which the linter would rather see here, is ES2023, so
  // it does not exist on the Node 18 this file is written for.
  assert.deepEqual(new Set(parts[0]), new Set(['alpha', 'sol', 'vega']))
  assert.deepEqual(parts[1], ['lonely'])
})

check('indexGalaxy resolves every kind of object to its system', () => {
  const index = indexGalaxy(needGalaxy())
  // 4 systems, 4 stars, 2 planets, 1 station, 2 gates, 1 field
  assert.equal(index.size, 14)
  for (const [id, kind, systemId] of [
    ['alpha', 'system', 'alpha'],
    ['sol-star', 'star', 'sol'],
    ['sol-p0', 'planet', 'sol'],
    ['sol-p0-st0', 'station', 'sol'],
    ['sol-gate0', 'gate', 'sol'],
    ['sol-ast0', 'field', 'sol'],
  ]) {
    const entry = index.get(id)
    assert.ok(entry, `${id} is indexed`)
    assert.equal(entry.kind, kind)
    assert.equal(entry.systemId, systemId)
  }
})

check('renderSystem draws a complete, escaped, deterministic document', () => {
  const g = needGalaxy()
  const sol = g.systems[0]
  const svg = renderSystem(sol, { t: 3, title: 'Sol', systems: indexSystems(g) })

  assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'))
  assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'))
  assert.ok(svg.includes('<title>Sol</title>'))
  for (const id of ['sol-star', 'sol-p0', 'sol-p0-st0', 'sol-gate0', 'sol-ast0']) {
    assert.ok(svg.includes(`data-id="${id}"`), `${id} is drawn`)
  }
  assert.ok(svg.includes('Terra &amp; Luna') && !svg.includes('Terra & Luna'), 'names are escaped')
  assert.ok(svg.includes('Alpha'), 'the gate label names where it leads')
  assertClean(svg)
  assertWellFormed(svg)

  assert.equal(renderSystem(sol, { t: 3 }), renderSystem(sol, { t: 3 }), 'same t, same string')
  assert.notEqual(renderSystem(sol, { t: 3 }), renderSystem(sol, { t: 9 }), 'time moves planets')
})

check('renderGalaxy draws the network and lights a route', () => {
  const g = needGalaxy()
  const route = findRoute(g, 'sol', 'vega')
  const svg = renderGalaxy(g, { highlight: route?.systemIds, title: 'Galaxy' })

  assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'))
  for (const system of g.systems) {
    assert.ok(svg.includes(`data-id="${system.id}"`), `${system.id} is drawn`)
  }
  for (const lane of g.lanes) {
    assert.ok(svg.includes(`data-id="${lane.id}"`), `${lane.id} is drawn`)
  }
  assert.ok(svg.includes(DEFAULT_THEME.highlight), 'the route is lit')
  assertClean(svg)
  assertWellFormed(svg)
})

// ------------------------------------------------------------------- run

const versionOf = (name) => {
  const manifest = new URL(`./node_modules/${name}/package.json`, import.meta.url)
  return existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')).version : '?'
}

console.log(
  `Node ${process.versions.node} · @industrieh/starmap ${versionOf('@industrieh/starmap')}` +
    ` · @industrieh/starmap-render ${versionOf('@industrieh/starmap-render')}\n`,
)

const indent = (text) => String(text).replaceAll('\n', '\n    ')

let passed = 0
let skipped = 0
for (const { name, run } of checks) {
  try {
    run()
    passed++
    console.log(`✓ ${name}`)
  } catch (error) {
    if (error instanceof Skipped) {
      skipped++
      console.log(`○ ${name} — skipped, ${error.message}`)
    } else if (error instanceof assert.AssertionError) {
      // What was expected is the useful part; the stack only points at this file.
      console.error(`✗ ${name}\n    ${indent(error.message)}`)
    } else {
      // Anything else came from the packages: where it was thrown matters.
      console.error(`✗ ${name}\n    ${indent(error?.stack ?? error)}`)
    }
  }
}

const failed = checks.length - passed - skipped
console.log(
  `\n${passed}/${checks.length} checks passed` +
    (failed > 0 ? `, ${failed} failed` : '') +
    (skipped > 0 ? `, ${skipped} skipped` : ''),
)
process.exitCode = passed === checks.length ? 0 : 1
