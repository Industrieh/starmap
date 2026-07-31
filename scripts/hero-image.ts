/**
 * Draws the galaxy at the top of the root README.
 *
 * ```bash
 * bun run hero
 * ```
 *
 * It writes two files into `assets/`: the SVG the renderer produced, and a PNG
 * rasterised from it. The README embeds the **PNG** — GitHub serves images
 * through a proxy that has never been reliable with SVG, and a hero picture that
 * sometimes fails to load is worse than a larger file.
 *
 * The galaxy is generated rather than hand-written, from a fixed seed through
 * `createRng()`. That makes the picture reproducible — the same seed gives the
 * same sky, today and next year — and it makes the image an honest demonstration
 * of the libraries rather than an illustration of them: this is what the code in
 * the README beneath it actually produces.
 *
 * Rasterising needs a Chromium, which Playwright provides. If it is missing the
 * script says so and leaves the SVG behind, which is still usable.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// The two imports below reach into the packages' **sources** by relative path
// rather than by name: there is no `tsconfig.json` at the repo root, so Bun has
// no `paths` to resolve here. It also means this script needs no build to run.
import { renderGalaxy } from '../packages/starmap-render/src/index'
import { createGalaxy, createRng, findRoute, type GalaxyInput } from '../packages/starmap/src/index'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const ASSETS = join(ROOT, 'assets')

const SEED = 'starmap-hero-001'
const SYSTEM_COUNT = 44

/** How far apart two systems have to be. Below this, one of them is dropped. */
const MIN_DISTANCE = 90
/** How close two systems have to be for a hyperlane to join them. */
const LANE_DISTANCE = 235

const WIDTH = 1600
const HEIGHT = 900

const NAMES = [
  'Sol',
  'Vega',
  'Rigel',
  'Altair',
  'Lyra',
  'Draco',
  'Orion',
  'Cygnus',
  'Perseus',
  'Auriga',
  'Corvus',
  'Hydra',
  'Lupus',
  'Mensa',
  'Norma',
  'Octans',
  'Pictor',
  'Sagitta',
  'Tucana',
  'Volans',
  'Aquila',
  'Bootes',
  'Carina',
  'Dorado',
  'Eridani',
  'Fornax',
  'Gemini',
  'Hercules',
  'Indus',
  'Janus',
  'Kepler',
  'Libra',
  'Musca',
  'Nashira',
  'Ophiuchi',
  'Pyxis',
  'Quadrans',
  'Reticuli',
  'Serpens',
  'Triangulum',
  'Ursa',
  'Vela',
  'Wezen',
  'Xanthe',
]

const STAR_CLASSES = [
  { w: 1, id: 'O' },
  { w: 2, id: 'B' },
  { w: 4, id: 'A' },
  { w: 7, id: 'F' },
  { w: 9, id: 'G' },
  { w: 8, id: 'K' },
  { w: 6, id: 'M' },
] as const

const PLANET_TYPES = [
  { w: 6, id: 'rocky' },
  { w: 4, id: 'terran' },
  { w: 5, id: 'gas' },
  { w: 3, id: 'ice' },
  { w: 2, id: 'lava' },
] as const

/**
 * Systems scattered in an ellipse, thinning out towards the edge.
 *
 * `** 0.62` on the radius pushes points outward against the natural clustering
 * of a uniform draw in polar coordinates — without it half the galaxy piles up
 * in the middle and the map reads as a blob.
 */
function scatter(rng: ReturnType<typeof createRng>): GalaxyInput['systems'] {
  const placed: { x: number; y: number }[] = []
  const systems: GalaxyInput['systems'] = []

  for (let i = 0; i < NAMES.length && systems.length < SYSTEM_COUNT; i += 1) {
    const angle = rng.rand(0, Math.PI * 2)
    const radius = rng.next() ** 0.62

    const x = Math.round(Math.cos(angle) * radius * 780)
    const y = Math.round(Math.sin(angle) * radius * 430)

    if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < MIN_DISTANCE)) continue
    placed.push({ x, y })

    const planetCount = rng.randInt(0, 3)
    const planets = Array.from({ length: planetCount }, (_unused, p) => ({
      name: `${NAMES[i]} ${'IVX'[p] ?? p}`,
      type: rng.weighted(PLANET_TYPES).id,
      orbit: 70 + p * rng.randInt(45, 80),
      radius: rng.randInt(4, 11),
      period: rng.randInt(8, 60),
    }))

    systems.push({
      id: NAMES[i].toLowerCase(),
      name: NAMES[i],
      x,
      y,
      star: { class: rng.weighted(STAR_CLASSES).id, radius: rng.randInt(11, 26) },
      planets,
    })
  }

  return systems
}

/** One lane per near-enough pair, each pair considered once. */
function connect(systems: GalaxyInput['systems']): GalaxyInput['lanes'] {
  const lanes: GalaxyInput['lanes'] = []

  for (let i = 0; i < systems.length; i += 1) {
    for (let j = i + 1; j < systems.length; j += 1) {
      const a = systems[i]
      const b = systems[j]
      if (Math.hypot(a.x - b.x, a.y - b.y) < LANE_DISTANCE) {
        lanes.push({ from: a.id, to: b.id })
      }
    }
  }

  return lanes
}

const rng = createRng(SEED)
const systems = scatter(rng)
const galaxy = createGalaxy({ seed: SEED, systems, lanes: connect(systems) })

/**
 * The longest route the network holds, highlighted.
 *
 * A picture of a map is prettier than a map, but a picture of a map *answering a
 * question* is the argument. Searching for the longest one rather than naming
 * two systems keeps this working if the seed or the thresholds ever change.
 */
function longestRoute(): string[] | undefined {
  let best: { ids: string[]; jumps: number } | undefined

  for (const from of galaxy.systems) {
    for (const to of galaxy.systems) {
      if (from.id === to.id) continue
      const route = findRoute(galaxy, from.id, to.id)
      if (route && (best === undefined || route.jumps > best.jumps)) {
        best = { ids: route.systemIds, jumps: route.jumps }
      }
    }
  }

  return best?.ids
}

const highlight = longestRoute()

const svg = renderGalaxy(galaxy, {
  idPrefix: 'hero',
  highlight,
  width: WIDTH,
  height: HEIGHT,
  margin: 0.06,
  backdrop: 700,
})

if (!existsSync(ASSETS)) mkdirSync(ASSETS)

const svgPath = join(ASSETS, 'galaxy.svg')
writeFileSync(svgPath, svg)

console.log(`✦ ${galaxy.meta.systemCount} systems, ${galaxy.lanes.length} lanes`)
console.log(`✦ longest route: ${highlight?.length ?? 0} systems, highlighted`)
console.log(`✦ ${svgPath}`)

// --- rasterise.

const pngPath = join(ASSETS, 'galaxy.png')

try {
  // `playwright` is deliberately **not** a dependency of this repo: it would be
  // installed by every contributor, and on every CI run, to draw one picture
  // that changes about once a year. The import is dynamic and inside a `try`, so
  // its absence is a message at the end of this script rather than a crash.
  //
  // If you do install it, this line starts reporting an unused suppression —
  // that is the signal to delete the comment, not to add another one.
  // @ts-expect-error optional dependency, resolved at runtime or not at all
  const { chromium } = await import('playwright')
  const browser = await chromium.launch()

  // 1.5× rather than 2×: a README is 1012px wide at most on GitHub, so 2400px
  // is already past retina, and the file is 500 KB instead of 780 KB. A star
  // field is mostly noise, which is exactly what PNG compresses worst.
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1.5,
  })

  await page.setContent(
    `<!doctype html><style>html,body{margin:0;background:#000}svg{display:block}</style>${svg}`,
  )
  await page.screenshot({ path: pngPath })
  await browser.close()

  console.log(`✦ ${pngPath}`)
} catch (error) {
  console.warn(`\n⚠ no PNG: ${(error as Error).message}`)
  console.warn('  Install Playwright and its Chromium, then run this again:')
  console.warn('    bun add -d playwright && bunx playwright install chromium')
}
