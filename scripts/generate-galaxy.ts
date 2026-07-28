#!/usr/bin/env bun
/**
 * Générateur de galaxie — écrit src/data/galaxy.json
 *
 *   bun run gen
 *   bun run gen -- --systems=32 --seed=cotontigeh --out=src/data/galaxy.json
 *
 * Tout est déterministe pour une seed donnée : même seed => même galaxie.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import type {
  AsteroidField,
  Faction,
  Galaxy,
  Gate,
  Hyperlane,
  LocalRoute,
  ObjectKind,
  ObjectRef,
  Planet,
  PlanetType,
  Richness,
  Rock,
  RouteType,
  StarClass,
  StarSystem,
  Station,
  StationType,
  Vec2,
} from '../src/types/galaxy'

// ---------------------------------------------------------------- args + rng

const args: Record<string, string | true> = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=') as [string, string | undefined]
    return [k, v ?? true]
  }),
)

const SEED = String(args.seed ?? Math.floor(Math.random() * 1e9))
const SYSTEM_COUNT = Number(args.systems ?? 24)
const OUT = resolve(process.cwd(), String(args.out ?? 'src/data/galaxy.json'))

const GALAXY_RADIUS = 1000
const MIN_SYSTEM_GAP = 140
const MAX_PLANETS = 11

function hashSeed(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(a: number): () => number {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rnd = mulberry32(hashSeed(SEED))
const rand = (min: number, max: number) => min + rnd() * (max - min)
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1))
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)]
const chance = (p: number) => rnd() < p
const round = (n: number, d = 2) => Number(n.toFixed(d))

interface Weighted {
  w: number
}

function weighted<T extends Weighted>(table: readonly T[]): T {
  const total = table.reduce((s, e) => s + e.w, 0)
  let r = rnd() * total
  for (const e of table) if ((r -= e.w) <= 0) return e
  return table[table.length - 1]
}

// ------------------------------------------------------------------- lexique

const SYS_PREFIX = [
  'Vel',
  'Tar',
  'Xan',
  'Kor',
  'Nyx',
  'Ori',
  'Zed',
  'Cal',
  'Mor',
  'Hel',
  'Ard',
  'Sol',
  'Umb',
  'Pyr',
  'Thal',
  'Ely',
  'Rig',
  'Vor',
  'Cyn',
  'Drak',
]
const SYS_MID = ['a', 'e', 'o', 'ae', 'i', 'u', 'ia']
const SYS_SUFFIX = [
  'dris',
  'mora',
  'kar',
  'thys',
  'ven',
  'lox',
  'nor',
  'sha',
  'quen',
  'tir',
  'zon',
  'rim',
  'phus',
  'deen',
  'gar',
]
const GREEK = [
  'Alpha',
  'Beta',
  'Gamma',
  'Delta',
  'Epsilon',
  'Zeta',
  'Eta',
  'Theta',
  'Iota',
  'Kappa',
  'Lambda',
  'Sigma',
  'Omega',
]
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']
const RESOURCES = ['minerais', 'gaz rares', 'eau', 'cristaux', 'organiques', 'néant']
const RICHNESS: Richness[] = ['pauvre', 'modeste', 'riche', 'exceptionnel']

interface StarTypeDef extends Weighted {
  id: StarClass
  color: string
  radius: number
  name: string
}

const STAR_TYPES: StarTypeDef[] = [
  { id: 'O', w: 1, color: '#9bb0ff', radius: 30, name: 'Bleue supergéante' },
  { id: 'B', w: 3, color: '#aabfff', radius: 26, name: 'Bleue' },
  { id: 'A', w: 7, color: '#cad7ff', radius: 22, name: 'Blanche' },
  { id: 'F', w: 12, color: '#f8f7ff', radius: 20, name: 'Jaune-blanc' },
  { id: 'G', w: 20, color: '#ffe9a8', radius: 18, name: 'Jaune' },
  { id: 'K', w: 22, color: '#ffc16f', radius: 16, name: 'Orange' },
  { id: 'M', w: 30, color: '#ff8f5a', radius: 13, name: 'Naine rouge' },
]

interface PlanetTypeDef extends Weighted {
  id: PlanetType
  color: string
  name: string
}

type OrbitalZone = 'inner' | 'mid' | 'outer'

const PLANET_TYPES: Record<OrbitalZone, PlanetTypeDef[]> = {
  inner: [
    { id: 'lava', w: 3, color: '#e2542c', name: 'Volcanique' },
    { id: 'rocky', w: 6, color: '#a08d7d', name: 'Tellurique' },
    { id: 'desert', w: 5, color: '#d9a45b', name: 'Désertique' },
    { id: 'barren', w: 4, color: '#8b8377', name: 'Aride' },
  ],
  mid: [
    { id: 'terran', w: 4, color: '#4fae6a', name: 'Tellurique habitable' },
    { id: 'ocean', w: 4, color: '#2f8fd8', name: 'Océanique' },
    { id: 'toxic', w: 3, color: '#9ac93b', name: 'Toxique' },
    { id: 'rocky', w: 4, color: '#a08d7d', name: 'Tellurique' },
    { id: 'desert', w: 3, color: '#d9a45b', name: 'Désertique' },
  ],
  outer: [
    { id: 'gas', w: 6, color: '#d8a06a', name: 'Géante gazeuse' },
    { id: 'ice-giant', w: 4, color: '#6fb6d9', name: 'Géante de glace' },
    { id: 'frozen', w: 5, color: '#cfe4f0', name: 'Glacée' },
    { id: 'barren', w: 2, color: '#8b8377', name: 'Aride' },
  ],
}

interface StationTypeDef extends Weighted {
  id: StationType
  name: string
}

const STATION_TYPES: StationTypeDef[] = [
  { id: 'trade', w: 5, name: 'Comptoir commercial' },
  { id: 'mining', w: 4, name: 'Plateforme minière' },
  { id: 'military', w: 3, name: 'Base militaire' },
  { id: 'research', w: 3, name: 'Station de recherche' },
  { id: 'shipyard', w: 2, name: 'Chantier naval' },
]

/** L'ordre de cette table fait partie du contrat de déterminisme du tirage. */
const FACTIONS: (Faction & Weighted)[] = [
  { id: 'neutral', name: 'Espace neutre', color: '#8e9bb3', w: 5 },
  { id: 'consortium', name: 'Consortium de Vega', color: '#4ea3ff', w: 3 },
  { id: 'covenant', name: 'Covenant Écarlate', color: '#ff5c72', w: 3 },
  { id: 'syndicate', name: 'Syndicat Libre', color: '#c78bff', w: 3 },
  { id: 'pilgrims', name: 'Pèlerins de Kepler', color: '#4fd8a5', w: 2 },
]

const usedNames = new Set<string>()
function systemName(): string {
  for (let i = 0; i < 200; i++) {
    let n = pick(SYS_PREFIX) + pick(SYS_MID) + pick(SYS_SUFFIX)
    if (chance(0.25)) n = `${pick(GREEK)} ${n}`
    if (!usedNames.has(n)) {
      usedNames.add(n)
      return n
    }
  }
  return `Secteur-${usedNames.size}`
}

// ------------------------------------------------------- placement + réseau

function placeSystems(count: number): Vec2[] {
  const pts: Vec2[] = []
  let guard = 0
  while (pts.length < count && guard++ < count * 800) {
    // distribution en disque, légèrement plus dense au centre
    const a = rnd() * Math.PI * 2
    const r = GALAXY_RADIUS * Math.pow(rnd(), 0.65)
    const p = { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.72 }
    if (pts.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= MIN_SYSTEM_GAP)) pts.push(p)
  }
  return pts
}

const dist = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y)

/** Clé d'arête non orientée : `add(i, j)` et `add(j, i)` désignent la même liaison. */
const edgeKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`)

/** k plus proches voisins + arbre couvrant minimal => graphe connexe et lisible */
function buildHyperlanes(systems: Vec2[]): Hyperlane[] {
  const edges = new Map<string, [number, number]>()
  const add = (a: number, b: number) => edges.set(edgeKey(a, b), [Math.min(a, b), Math.max(a, b)])

  systems.forEach((s, i) => {
    const near = systems
      .map((o, j) => ({ j, d: dist(s, o) }))
      .filter((e) => e.j !== i)
      .toSorted((a, b) => a.d - b.d)
    const k = randInt(1, 3)
    near.slice(0, k).forEach((e) => {
      if (e.d < GALAXY_RADIUS * 0.55) add(i, e.j)
    })
  })

  // Prim : garantit qu'aucun système n'est injoignable
  const inTree = new Set([0])
  while (inTree.size < systems.length) {
    let best: { i: number; j: number; d: number } | null = null
    for (const i of inTree) {
      for (let j = 0; j < systems.length; j++) {
        if (inTree.has(j)) continue
        const d = dist(systems[i], systems[j])
        if (!best || d < best.d) best = { i, j, d }
      }
    }
    if (!best) break
    add(best.i, best.j)
    inTree.add(best.j)
  }

  return [...edges.values()].map(([a, b]) => ({
    id: `lane-${a}-${b}`,
    from: `sys-${a}`,
    to: `sys-${b}`,
    length: round(dist(systems[a], systems[b]), 1),
  }))
}

// ------------------------------------------------------------ contenu système

function makePlanets(sysId: string, count: number, starRadius: number): Planet[] {
  const planets: Planet[] = []
  let orbit = starRadius + rand(45, 70)
  for (let i = 0; i < count; i++) {
    const band = i / Math.max(1, count - 1)
    const zone: OrbitalZone = band < 0.34 ? 'inner' : band < 0.68 ? 'mid' : 'outer'
    const type = weighted(PLANET_TYPES[zone])
    const isGiant = type.id === 'gas' || type.id === 'ice-giant'
    const radius = isGiant ? rand(15, 23) : rand(6, 12)

    planets.push({
      id: `${sysId}-p${i}`,
      name: `${ROMAN[i]}`,
      index: i,
      type: type.id,
      typeName: type.name,
      color: type.color,
      radius: round(radius),
      orbit: round(orbit),
      angle: round(rnd() * 360, 1),
      // période en secondes (visuel) : loi de Kepler simplifiée
      period: round(8 + Math.pow(orbit / 60, 1.5) * 9, 1),
      moons: randInt(0, isGiant ? 4 : 2),
      habitable: type.id === 'terran' || (type.id === 'ocean' && chance(0.5)),
      resources: pick(RESOURCES),
      stations: [],
    })

    orbit += rand(38, 62) + radius
  }
  return planets
}

function makeStations(planet: Planet): Station[] {
  if (!chance(planet.habitable ? 0.8 : 0.35)) return []
  const n = randInt(1, planet.radius > 14 ? 3 : 2)
  return Array.from({ length: n }, (_, i) => {
    const t = weighted(STATION_TYPES)
    return {
      id: `${planet.id}-st${i}`,
      name: `${t.name} ${pick(GREEK)}`,
      type: t.id,
      planetId: planet.id,
      orbit: round(planet.radius + 10 + i * 7),
      angle: round(rnd() * 360, 1),
      period: round(rand(4, 9), 1),
      docks: randInt(2, 12),
    }
  })
}

function makeAsteroidFields(sysId: string, planets: Planet[], outerLimit: number): AsteroidField[] {
  const fields: AsteroidField[] = []
  const count = randInt(0, 3)
  for (let i = 0; i < count; i++) {
    const belt = chance(0.55) && planets.length > 2
    const id = `${sysId}-ast${i}`
    if (belt) {
      // ceinture : anneau entre deux orbites de planètes
      const k = randInt(1, planets.length - 1)
      const inner = planets[k - 1].orbit + planets[k - 1].radius + 12
      const outer = planets[k].orbit - planets[k].radius - 12
      const orbit = inner < outer ? rand(inner, outer) : planets[k].orbit + 30
      const arc = chance(0.4) ? rand(60, 260) : 360
      const start = rnd() * 360
      fields.push({
        id,
        kind: 'belt',
        name: `Ceinture ${pick(GREEK)}`,
        orbit: round(orbit),
        width: round(rand(10, 22)),
        arcStart: round(start, 1),
        arcSweep: round(arc, 1),
        density: round(rand(0.3, 1)),
        rocks: rocksInBelt(orbit, rand(10, 22), start, arc),
        richness: pick(RICHNESS),
      })
    } else {
      const a = rnd() * Math.PI * 2
      const r = rand(outerLimit * 0.35, outerLimit * 0.95)
      const cx = Math.cos(a) * r
      const cy = Math.sin(a) * r
      const radius = rand(35, 80)
      fields.push({
        id,
        kind: 'cluster',
        name: `Champ ${pick(GREEK)}`,
        x: round(cx),
        y: round(cy),
        radius: round(radius),
        density: round(rand(0.3, 1)),
        rocks: rocksInCluster(cx, cy, radius),
        richness: pick(RICHNESS),
      })
    }
  }
  return fields
}

function rocksInBelt(orbit: number, width: number, startDeg: number, sweepDeg: number): Rock[] {
  const n = Math.round((sweepDeg / 360) * randInt(90, 150))
  return Array.from({ length: n }, () => {
    const a = ((startDeg + rnd() * sweepDeg) * Math.PI) / 180
    const r = orbit + rand(-width / 2, width / 2)
    return [round(Math.cos(a) * r, 1), round(Math.sin(a) * r, 1), round(rand(0.7, 2.6), 1)] as Rock
  })
}

function rocksInCluster(cx: number, cy: number, radius: number): Rock[] {
  const n = randInt(40, 90)
  return Array.from({ length: n }, () => {
    const a = rnd() * Math.PI * 2
    const r = radius * Math.sqrt(rnd())
    return [
      round(cx + Math.cos(a) * r, 1),
      round(cy + Math.sin(a) * r, 1),
      round(rand(0.8, 3), 1),
    ] as Rock
  })
}

function makeGates(sysId: string, links: string[], outerLimit: number): Gate[] {
  const gateCount = Math.max(1, Math.min(links.length, randInt(1, 3)))
  const gates: Gate[] = Array.from({ length: gateCount }, (_, i) => ({
    id: `${sysId}-gate${i}`,
    name: `Porte ${pick(GREEK)}`,
    orbit: round(outerLimit * rand(1.08, 1.3)),
    angle: 0,
    links: [],
    status: chance(0.12) ? 'instable' : 'nominal',
  }))
  // chaque porte pointe vers un cap différent, réparti sur le cercle
  const offset = rnd() * 360
  gates.forEach((g, i) => {
    g.angle = round((offset + (360 / gateCount) * i + rand(-18, 18) + 360) % 360, 1)
  })
  // on distribue les liaisons du système entre les portes
  links.forEach((target, i) => gates[i % gateCount].links.push(target))
  return gates
}

const ref = (kind: ObjectKind, id: string): ObjectRef => ({ kind, id })

/** routes internes : étoile -> planètes -> stations -> portes -> champs */
function makeLocalRoutes(system: StarSystem): LocalRoute[] {
  const routes: LocalRoute[] = []
  const link = (a: ObjectRef, b: ObjectRef, type: RouteType) =>
    routes.push({ id: `${a.id}>${b.id}`, from: a, to: b, type })

  const planets = system.planets
  const star = ref('star', `${system.id}-star`)

  planets.forEach((p, i) => {
    const node = ref('planet', p.id)
    if (i === 0) link(star, node, 'orbital')
    else link(ref('planet', planets[i - 1].id), node, 'orbital')
    p.stations.forEach((s) => link(node, ref('station', s.id), 'docking'))
  })

  // quelques raccourcis directs entre planètes non adjacentes
  for (let i = 0; i < planets.length - 2; i++) {
    if (chance(0.35))
      link(ref('planet', planets[i].id), ref('planet', planets[i + 2].id), 'shortcut')
  }

  const anchor = planets.length ? ref('planet', planets[planets.length - 1].id) : star
  system.gates.forEach((g) => link(anchor, ref('gate', g.id), 'jump-lane'))
  system.asteroidFields.forEach((f) => {
    const near = planets.length ? ref('planet', pick(planets).id) : star
    link(near, ref('field', f.id), 'mining')
  })

  return routes
}

// ------------------------------------------------------------------- galaxie

const points = placeSystems(SYSTEM_COUNT)
const lanes = buildHyperlanes(points)

const neighbours = new Map<string, string[]>(points.map((_, i) => [`sys-${i}`, []]))
lanes.forEach((l) => {
  neighbours.get(l.from)?.push(l.to)
  neighbours.get(l.to)?.push(l.from)
})

const systems: StarSystem[] = points.map((p, i) => {
  const id = `sys-${i}`
  const star = weighted(STAR_TYPES)
  const planetCount = randInt(1, MAX_PLANETS)
  const planets = makePlanets(id, planetCount, star.radius)
  planets.forEach((pl) => (pl.stations = makeStations(pl)))

  const last = planets[planets.length - 1]
  const outerLimit = last.orbit + last.radius + 40
  const faction = weighted(FACTIONS)

  const system: StarSystem = {
    id,
    name: systemName(),
    x: round(p.x, 1),
    y: round(p.y, 1),
    faction: { id: faction.id, name: faction.name, color: faction.color },
    security: round(rand(0, 1), 2),
    star: {
      id: `${id}-star`,
      name: 'Étoile',
      class: star.id,
      typeName: star.name,
      color: star.color,
      radius: star.radius,
    },
    planets,
    asteroidFields: makeAsteroidFields(id, planets, outerLimit),
    gates: makeGates(id, neighbours.get(id) ?? [], outerLimit),
    outerLimit: round(outerLimit),
    localRoutes: [],
  }
  system.localRoutes = makeLocalRoutes(system)
  return system
})

// nom lisible pour chaque planète : "Velamora III"
systems.forEach((s) => s.planets.forEach((p) => (p.name = `${s.name} ${p.name}`)))

const galaxy: Galaxy = {
  meta: {
    seed: SEED,
    generatedAt: new Date().toISOString(),
    systemCount: systems.length,
    laneCount: lanes.length,
    planetCount: systems.reduce((n, s) => n + s.planets.length, 0),
    stationCount: systems.reduce(
      (n, s) => n + s.planets.reduce((m, p) => m + p.stations.length, 0),
      0,
    ),
    gateCount: systems.reduce((n, s) => n + s.gates.length, 0),
    asteroidFieldCount: systems.reduce((n, s) => n + s.asteroidFields.length, 0),
    galaxyRadius: GALAXY_RADIUS,
  },
  systems,
  lanes,
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(galaxy, null, 1))

const { meta } = galaxy
console.log(`✦ Galaxie générée -> ${OUT}
  seed              ${meta.seed}
  systèmes          ${meta.systemCount}
  hyperlanes        ${meta.laneCount}
  planètes          ${meta.planetCount}
  stations          ${meta.stationCount}
  portes            ${meta.gateCount}
  champs d'astéro.  ${meta.asteroidFieldCount}

  Regénérer : bun run gen -- --systems=${meta.systemCount} --seed=<seed>`)
