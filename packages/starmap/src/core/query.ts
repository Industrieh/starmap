/**
 * Reading a galaxy: indexes, neighbours, connectivity, routes.
 *
 * A `Galaxy` is a tree of nested objects. That is convenient to serialize and
 * awkward to query, so these helpers build the lookups a game needs constantly.
 *
 * Build an index **once** after {@link createGalaxy} and keep it around: each
 * call that is handed a whole `Galaxy` walks the whole universe. The network
 * helpers — {@link neighboursOf}, {@link connectedComponents}, {@link findRoute}
 * — all accept the result of {@link indexNetwork} in place of the galaxy for
 * that reason.
 */

import type {
  Galaxy,
  GalaxyIndex,
  Hyperlane,
  HyperlaneNetwork,
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

/**
 * Index the hyperlane network for traversal: every system, and the lanes that
 * touch each one, both in the galaxy's order.
 *
 * Every network helper builds this on its own when handed a `Galaxy`. Build it
 * once and pass it instead when you query the network often — a route per ship,
 * a neighbour list per frame.
 *
 * @example
 * ```ts
 * const network = indexNetwork(galaxy)   // once, after createGalaxy()
 * findRoute(network, 'sol', 'vega')      // no rescan of the galaxy
 * neighboursOf(network, 'sol')
 * ```
 */
export function indexNetwork(galaxy: Galaxy): HyperlaneNetwork {
  const systems = indexSystems(galaxy)
  const lanes = new Map<string, Hyperlane[]>()
  for (const id of systems.keys()) lanes.set(id, [])
  for (const lane of galaxy.lanes) {
    lanes.get(lane.from)?.push(lane)
    if (lane.to !== lane.from) lanes.get(lane.to)?.push(lane)
  }
  return { systems, lanes }
}

/** Every hyperlane that touches a system. */
export function lanesOf(source: Galaxy | HyperlaneNetwork, systemId: string): Hyperlane[] {
  if (!isGalaxy(source)) return [...(source.lanes.get(systemId) ?? [])]
  return source.lanes.filter((l) => l.from === systemId || l.to === systemId)
}

/**
 * Systems reachable in one jump from `systemId`.
 *
 * There is no guarantee that there are any — your hyperlane network decides.
 * Use {@link connectedComponents} to check that no system is stranded.
 */
export function neighboursOf(source: Galaxy | HyperlaneNetwork, systemId: string): StarSystem[] {
  const network = isGalaxy(source) ? indexNetwork(source) : source
  return (network.lanes.get(systemId) ?? [])
    .map((l) => network.systems.get(l.from === systemId ? l.to : l.from))
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
export function connectedComponents(source: Galaxy | HyperlaneNetwork): string[][] {
  const network = isGalaxy(source) ? indexNetwork(source) : source
  const seen = new Set<string>()
  const components: string[][] = []
  for (const start of network.systems.keys()) {
    if (seen.has(start)) continue
    const group: string[] = []
    const stack = [start]
    seen.add(start)
    while (stack.length) {
      const id = stack.pop() as string
      group.push(id)
      for (const lane of network.lanes.get(id) ?? []) {
        const next = lane.from === id ? lane.to : lane.from
        // A lane to a system that does not exist leads nowhere.
        if (seen.has(next) || !network.systems.has(next)) continue
        seen.add(next)
        stack.push(next)
      }
    }
    components.push(group)
  }
  // `sort` is stable, so components of equal size keep the galaxy's order. It
  // sorts an array built just above, in place; `toSorted()` would copy it for
  // nothing, and Node 18 — which `engines` promises — does not have it.
  // oxlint-disable-next-line unicorn/no-array-sort
  return components.sort((a, b) => b.length - a.length)
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
 * Tells a `Galaxy` apart from the indexes accepted in its place. `instanceof
 * Map` would be the obvious test and the wrong one: it fails on a map built in
 * another realm — a worker, an iframe. A galaxy is the only one of them whose
 * `systems` is an array.
 */
function isGalaxy<T extends object>(source: Galaxy | T): source is Galaxy {
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
 * Dijkstra with a binary heap: O((V + E) log V). Among equally short routes,
 * the one found is always the same — ties are broken by the systems' order in
 * the galaxy, never by chance.
 *
 * Handed a `Galaxy`, it indexes the network first. When you look for many
 * routes, build that index once with {@link indexNetwork} and pass it instead.
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
export function findRoute(
  source: Galaxy | HyperlaneNetwork,
  fromId: string,
  toId: string,
): Route | null {
  const network = isGalaxy(source) ? indexNetwork(source) : source
  if (!network.systems.has(fromId) || !network.systems.has(toId)) return null
  if (fromId === toId) return { systemIds: [fromId], distance: 0, jumps: 0 }

  // Each system's rank in the galaxy, the tie-breaker of the queue.
  const rank = new Map<string, number>()
  for (const id of network.systems.keys()) rank.set(id, rank.size)

  const dist = new Map<string, number>([[fromId, 0]])
  const prev = new Map<string, string>()
  const done = new Set<string>()
  const queue: QueueItem[] = []
  push(queue, [0, rank.get(fromId) as number, fromId])

  while (queue.length) {
    const [best, , current] = pop(queue)
    // A system can be queued several times, once per improvement: only its
    // first, shortest, entry counts.
    if (done.has(current)) continue
    if (current === toId) break
    done.add(current)

    for (const lane of network.lanes.get(current) ?? []) {
      const next = lane.from === current ? lane.to : lane.from
      const nextRank = rank.get(next)
      if (nextRank === undefined || done.has(next)) continue
      const d = best + lane.length
      if (d < (dist.get(next) ?? Infinity)) {
        dist.set(next, d)
        prev.set(next, current)
        push(queue, [d, nextRank, next])
      }
    }
  }

  const distance = dist.get(toId)
  if (distance === undefined) return null

  const systemIds = [toId]
  for (let id = toId; prev.has(id);) {
    id = prev.get(id) as string
    systemIds.push(id)
  }
  systemIds.reverse()
  return { systemIds, distance, jumps: systemIds.length - 1 }
}

// ------------------------------------------------------- the priority queue

/** `[distance, rank, id]`: ordered by distance, then by rank. */
type QueueItem = [distance: number, rank: number, id: string]

const before = (a: QueueItem, b: QueueItem): boolean =>
  a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])

function push(heap: QueueItem[], item: QueueItem): void {
  heap.push(item)
  let i = heap.length - 1
  while (i > 0) {
    const parent = (i - 1) >> 1
    if (!before(heap[i], heap[parent])) break
    swap(heap, i, parent)
    i = parent
  }
}

function pop(heap: QueueItem[]): QueueItem {
  const top = heap[0]
  const last = heap.pop() as QueueItem
  if (heap.length === 0) return top
  heap[0] = last
  for (let i = 0; ;) {
    const left = i * 2 + 1
    const right = left + 1
    let smallest = i
    if (left < heap.length && before(heap[left], heap[smallest])) smallest = left
    if (right < heap.length && before(heap[right], heap[smallest])) smallest = right
    if (smallest === i) return top
    swap(heap, i, smallest)
    i = smallest
  }
}

function swap(heap: QueueItem[], a: number, b: number): void {
  const item = heap[a]
  heap[a] = heap[b]
  heap[b] = item
}
