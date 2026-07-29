/**
 * Reading a galaxy: indexes, neighbours, connectivity, routes.
 *
 * A `Galaxy` is a tree of nested objects. That is convenient to serialize and
 * awkward to query, so these helpers build the lookups a game needs constantly.
 *
 * Build an index **once** after {@link createGalaxy} and keep it around: each
 * call walks the whole universe.
 */

import type {
  Galaxy,
  GalaxyIndex,
  Hyperlane,
  IndexEntry,
  StarSystem,
  Station,
  SystemsById,
} from './types'

/** Build an id → system lookup. */
export function indexSystems(galaxy: Galaxy): SystemsById {
  return new Map(galaxy.systems.map((s) => [s.id, s]))
}

/**
 * Build an id → object lookup covering everything: systems, stars, planets,
 * stations, gates and asteroid fields.
 *
 * Each entry carries its `kind` and the id of the system it belongs to, so you
 * can recover an object's context from its id alone.
 *
 * @example
 * ```ts
 * const index = indexGalaxy(galaxy)
 * const entry = index.get('sol-p2-st0')
 * if (entry?.kind === 'station') entry.obj.docks   // typed as Station
 * ```
 */
export function indexGalaxy(galaxy: Galaxy): GalaxyIndex {
  const m = new Map<string, IndexEntry>()
  for (const s of galaxy.systems) {
    m.set(s.id, { kind: 'system', obj: s, systemId: s.id })
    m.set(s.star.id, { kind: 'star', obj: s.star, systemId: s.id })
    for (const p of s.planets) {
      m.set(p.id, { kind: 'planet', obj: p, systemId: s.id })
      for (const st of p.stations) m.set(st.id, { kind: 'station', obj: st, systemId: s.id })
    }
    for (const g of s.gates) m.set(g.id, { kind: 'gate', obj: g, systemId: s.id })
    for (const f of s.asteroidFields) m.set(f.id, { kind: 'field', obj: f, systemId: s.id })
  }
  return m
}

/** Every hyperlane that touches a system. */
export function lanesOf(galaxy: Galaxy, systemId: string): Hyperlane[] {
  return galaxy.lanes.filter((l) => l.from === systemId || l.to === systemId)
}

/**
 * Systems reachable in one jump from `systemId`.
 *
 * There is no guarantee that there are any — your hyperlane network decides.
 * Use {@link connectedComponents} to check that no system is stranded.
 */
export function neighboursOf(galaxy: Galaxy, systemId: string): StarSystem[] {
  const byId = indexSystems(galaxy)
  return lanesOf(galaxy, systemId)
    .map((l) => byId.get(l.from === systemId ? l.to : l.from))
    .filter((s) => s !== undefined)
}

/**
 * Split the network into connected components. Each array holds the ids of a
 * group of systems that can reach each other.
 *
 * You build the network, so you are the one who guarantees it holds together. A
 * system nobody can fly to is a game bug, not a quirk — run this once after
 * {@link createGalaxy} and decide what to do about it.
 *
 * @returns The components, largest first. A healthy galaxy returns exactly one.
 *
 * @example
 * ```ts
 * const parts = connectedComponents(galaxy)
 * if (parts.length > 1) {
 *   throw new Error(`Stranded systems: ${parts.slice(1).flat().join(', ')}`)
 * }
 * ```
 */
export function connectedComponents(galaxy: Galaxy): string[][] {
  const adjacency = new Map<string, string[]>(galaxy.systems.map((s) => [s.id, []]))
  for (const l of galaxy.lanes) {
    adjacency.get(l.from)?.push(l.to)
    adjacency.get(l.to)?.push(l.from)
  }

  const seen = new Set<string>()
  const components: string[][] = []
  for (const system of galaxy.systems) {
    if (seen.has(system.id)) continue
    const group: string[] = []
    const queue = [system.id]
    seen.add(system.id)
    while (queue.length) {
      const id = queue.pop() as string
      group.push(id)
      for (const next of adjacency.get(id) ?? []) {
        if (seen.has(next)) continue
        seen.add(next)
        queue.push(next)
      }
    }
    components.push(group)
  }
  return components.toSorted((a, b) => b.length - a.length)
}

/** Every station in a system, across all its planets. */
export function stationsOf(system: StarSystem): Station[] {
  return system.planets.flatMap((p) => p.stations)
}

/**
 * The system an object belongs to, from its id alone.
 *
 * Only `Station` carries a pointer back to its parent; a planet, gate or
 * asteroid field does not know where it sits. This walks the ownership the other
 * way, for any kind of object — so everything in a system is one hop from
 * anything else in it.
 *
 * A system id returns that same system, which is what makes the helper safe to
 * call on an id you have not inspected.
 *
 * Pass a `Galaxy` and it indexes the whole universe on every call. In a render
 * loop, build the index once with {@link indexGalaxy} and pass that instead.
 *
 * @returns `null` if no object carries that id.
 *
 * @example The gates a planet can reach without leaving its system
 * ```ts
 * systemOf(galaxy, 'earth')?.gates       // every gate in Sol, not just one
 *
 * const index = indexGalaxy(galaxy)      // built once
 * systemOf(index, 'earth')?.gates        // same answer, no rescan
 * ```
 */
export function systemOf(source: Galaxy | GalaxyIndex, id: string): StarSystem | null {
  const index = isGalaxy(source) ? indexGalaxy(source) : source
  const entry = index.get(id)
  if (!entry) return null
  const owner = index.get(entry.systemId)
  return owner?.kind === 'system' ? owner.obj : null
}

/**
 * Tells the two accepted sources apart. `instanceof Map` would be the obvious
 * test and the wrong one: it fails on a map built in another realm — a worker,
 * an iframe.
 */
function isGalaxy(source: Galaxy | GalaxyIndex): source is Galaxy {
  return Array.isArray((source as Galaxy).systems)
}

/** A route found by {@link findRoute}. */
export interface Route {
  /** Ids of every system on the way, start and destination included. */
  systemIds: string[]
  /** Total distance, in the same unit as `Hyperlane.length`. */
  distance: number
  /** Number of jumps. Always `systemIds.length - 1`. */
  jumps: number
}

/**
 * Shortest path between two systems, weighted by hyperlane length.
 *
 * Dijkstra with a naive priority queue (a linear scan). Fine up to a few
 * thousand systems. Past that, index the graph once and swap the queue for a
 * binary heap.
 *
 * @returns `null` if either system does not exist, or if no path links them —
 * your network can be split, see {@link connectedComponents}.
 *
 * @example
 * ```ts
 * const route = findRoute(galaxy, 'sol', 'alpha')
 * route?.jumps      // 4
 * route?.systemIds  // ['sol', 'proxima', …, 'alpha']
 * ```
 */
export function findRoute(galaxy: Galaxy, fromId: string, toId: string): Route | null {
  const byId = indexSystems(galaxy)
  if (!byId.has(fromId) || !byId.has(toId)) return null
  if (fromId === toId) return { systemIds: [fromId], distance: 0, jumps: 0 }

  // Adjacency list: id -> [(neighbour, length)]
  const adj = new Map<string, { to: string; len: number }[]>()
  for (const id of byId.keys()) adj.set(id, [])
  for (const l of galaxy.lanes) {
    adj.get(l.from)?.push({ to: l.to, len: l.length })
    adj.get(l.to)?.push({ to: l.from, len: l.length })
  }

  const dist = new Map<string, number>([[fromId, 0]])
  const prev = new Map<string, string>()
  const pending = new Set(byId.keys())

  while (pending.size) {
    let current: string | null = null
    let best = Infinity
    for (const id of pending) {
      const d = dist.get(id) ?? Infinity
      if (d < best) {
        best = d
        current = id
      }
    }
    // Only unreachable systems are left: the graph is split.
    if (current === null) break
    if (current === toId) break
    pending.delete(current)

    for (const edge of adj.get(current) ?? []) {
      if (!pending.has(edge.to)) continue
      const d = best + edge.len
      if (d < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, d)
        prev.set(edge.to, current)
      }
    }
  }

  const distance = dist.get(toId)
  if (distance === undefined) return null

  const systemIds = [toId]
  for (let id = toId; prev.has(id);) {
    id = prev.get(id) as string
    systemIds.unshift(id)
  }
  return { systemIds, distance, jumps: systemIds.length - 1 }
}
