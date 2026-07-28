/**
 * Contrat de données du monde : `scripts/generate-galaxy.ts` produit exactement
 * ces formes, `src/data/galaxy.json` en est l'instance courante.
 */

export interface Vec2 {
  x: number
  y: number
}

// ------------------------------------------------------------------ factions

export type FactionId = 'neutral' | 'consortium' | 'covenant' | 'syndicate' | 'pilgrims'

export interface Faction {
  id: FactionId
  name: string
  color: string
}

// -------------------------------------------------------------------- étoile

export type StarClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M'

export interface Star {
  id: string
  name: string
  class: StarClass
  typeName: string
  color: string
  radius: number
}

// ------------------------------------------------------- planètes / stations

export type PlanetType =
  | 'lava'
  | 'rocky'
  | 'desert'
  | 'barren'
  | 'terran'
  | 'ocean'
  | 'toxic'
  | 'gas'
  | 'ice-giant'
  | 'frozen'

export type StationType = 'trade' | 'mining' | 'military' | 'research' | 'shipyard'

export interface Station {
  id: string
  name: string
  type: StationType
  planetId: string
  /** rayon de l'orbite autour de la planète */
  orbit: number
  angle: number
  /** secondes par tour */
  period: number
  docks: number
}

export interface Planet {
  id: string
  name: string
  index: number
  type: PlanetType
  typeName: string
  color: string
  radius: number
  /** rayon de l'orbite autour de l'étoile */
  orbit: number
  angle: number
  /** secondes par tour */
  period: number
  moons: number
  habitable: boolean
  resources: string
  stations: Station[]
}

// -------------------------------------------------------- champs d'astéroïdes

/** `[x, y, rayon]` — position pré-calculée d'un bloc. */
export type Rock = [x: number, y: number, r: number]

export type Richness = 'pauvre' | 'modeste' | 'riche' | 'exceptionnel'

interface AsteroidFieldBase {
  id: string
  name: string
  density: number
  rocks: Rock[]
  richness: Richness
}

export interface AsteroidBelt extends AsteroidFieldBase {
  kind: 'belt'
  orbit: number
  width: number
  arcStart: number
  arcSweep: number
}

export interface AsteroidCluster extends AsteroidFieldBase {
  kind: 'cluster'
  x: number
  y: number
  radius: number
}

export type AsteroidField = AsteroidBelt | AsteroidCluster

// -------------------------------------------------------------------- portes

export type GateStatus = 'nominal' | 'instable'

export interface Gate {
  id: string
  name: string
  orbit: number
  angle: number
  /** ids des systèmes desservis */
  links: string[]
  status: GateStatus
}

// ------------------------------------------------------------ routes locales

export type RouteType = 'orbital' | 'shortcut' | 'docking' | 'jump-lane' | 'mining'

export type ObjectKind = 'system' | 'star' | 'planet' | 'station' | 'gate' | 'field'

export interface ObjectRef {
  kind: ObjectKind
  id: string
}

export interface LocalRoute {
  id: string
  from: ObjectRef
  to: ObjectRef
  type: RouteType
}

// ------------------------------------------------------------------- galaxie

export interface StarSystem {
  id: string
  name: string
  x: number
  y: number
  faction: Faction
  /** 0 (sans loi) → 1 (sécurisé) */
  security: number
  star: Star
  planets: Planet[]
  asteroidFields: AsteroidField[]
  gates: Gate[]
  /** rayon au-delà de la dernière orbite planétaire */
  outerLimit: number
  localRoutes: LocalRoute[]
}

export interface Hyperlane {
  id: string
  from: string
  to: string
  length: number
}

export interface GalaxyMeta {
  seed: string
  generatedAt: string
  systemCount: number
  laneCount: number
  planetCount: number
  stationCount: number
  gateCount: number
  asteroidFieldCount: number
  galaxyRadius: number
}

export interface Galaxy {
  meta: GalaxyMeta
  systems: StarSystem[]
  lanes: Hyperlane[]
}

// ------------------------------------------------------------ état de la vue

export type ViewMode = 'galaxy' | 'system'

/** Sélection courante — `id` réfère à n'importe quel objet indexé. */
export type Selection = ObjectRef

/** Une entrée de l'index global : le `kind` discrimine le type de `obj`. */
export type IndexEntry =
  | { kind: 'system'; obj: StarSystem; systemId: string }
  | { kind: 'star'; obj: Star; systemId: string }
  | { kind: 'planet'; obj: Planet; systemId: string }
  | { kind: 'station'; obj: Station; systemId: string }
  | { kind: 'gate'; obj: Gate; systemId: string }
  | { kind: 'field'; obj: AsteroidField; systemId: string }

export type GalaxyIndex = ReadonlyMap<string, IndexEntry>

export type SystemsById = ReadonlyMap<string, StarSystem>
