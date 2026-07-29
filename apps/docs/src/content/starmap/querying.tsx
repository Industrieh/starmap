import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { PropsTable } from '@/components/docs/props-table'
import { A, C, H2, Lead, P, Quote } from '@/components/docs/prose'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'problem', title: 'Why indexes exist', depth: 2 },
  { id: 'index', title: 'The global index', depth: 2 },
  { id: 'narrowing', title: 'Narrowing an entry', depth: 3 },
  { id: 'system-of', title: 'Finding the owner', depth: 2 },
  { id: 'neighbours', title: 'Neighbours and lanes', depth: 2 },
  { id: 'routes', title: 'Pathfinding', depth: 2 },
  { id: 'cost', title: 'Length is a cost', depth: 3 },
  { id: 'connectivity', title: 'Connectivity', depth: 2 },
  { id: 'costs', title: 'What each call costs', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        A galaxy is a tree of nested objects — excellent for saving to disk, awkward for the
        questions a game asks sixty times a second. These helpers build the lookups you need.
      </Lead>

      <H2 id="problem">Why indexes exist</H2>
      <P>
        Suppose a player clicks a station and you hold its id. Finding it in the raw structure means
        walking every system, every planet, every station until it turns up. Doing that once is
        fine. Doing it per click is fine. Doing it per frame is not.
      </P>

      <P>So the rule for this entire page is one line:</P>

      <Quote>Build an index once, right after createGalaxy(), and keep it for the session.</Quote>

      <P>
        A galaxy is frozen terrain — it never changes after it is built — so an index of it never
        goes stale. There is no invalidation to think about.
      </P>

      <H2 id="index">The global index</H2>
      <P>
        <C>indexGalaxy()</C> returns a <C>ReadonlyMap</C> from id to object, covering{' '}
        <strong>every kind at once</strong>: systems, stars, planets, stations, gates and asteroid
        fields.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { indexGalaxy, indexSystems } from '@cotontigeh/starmap'

const index = indexGalaxy(galaxy)     // everything, keyed by id
const systems = indexSystems(galaxy)  // just systems — smaller, when that is all you need`}
      />

      <P>
        Each value is an <C>IndexEntry</C>: the object itself, plus the two things you cannot
        recover from an id alone.
      </P>

      <PropsTable
        rows={[
          {
            name: 'kind',
            type: "'system' | 'star' | 'planet' | 'station' | 'gate' | 'field'",
            description: 'What this is. Discriminates the union, so a check narrows the type.',
          },
          { name: 'obj', type: 'the object itself', description: 'Typed according to `kind`.' },
          {
            name: 'systemId',
            type: 'string',
            description: 'Which system it belongs to — the context an id does not carry.',
          },
        ]}
      />

      <H2 id="narrowing">Narrowing an entry</H2>
      <P>
        <C>IndexEntry</C> is a discriminated union, so checking <C>kind</C> tells TypeScript what{' '}
        <C>obj</C> is. No cast, no assertion.
      </P>

      <CodeBlock
        lang="ts"
        code={`const entry = index.get('sol-p1-st0')

if (entry?.kind === 'station') {
  entry.obj.docks       // ✅ typed as Station
  entry.obj.planetId    // ✅ and its parent planet
}

// A switch is exhaustive, and TypeScript checks it for you.
switch (entry?.kind) {
  case 'planet':  return drawPlanet(entry.obj)   // obj is Planet
  case 'station': return drawStation(entry.obj)  // obj is Station
  case 'gate':    return drawGate(entry.obj)     // obj is Gate
}`}
      />

      <Callout tone="tip" title="This is why ids are globally unique">
        One id, one object, one map. If ids were only unique per system you would need to know the
        system before you could look anything up — which is exactly the information you are usually
        trying to find.
      </Callout>

      <H2 id="system-of">Finding the owner</H2>
      <P>
        Only a <C>Station</C> carries a pointer back to its parent. A planet, a gate or an asteroid
        field does not know where it sits. <C>systemOf()</C> walks the ownership the other way, for
        any kind of object:
      </P>

      <CodeBlock
        lang="ts"
        code={`import { systemOf } from '@cotontigeh/starmap'

systemOf(index, 'sol-p1')?.name      // 'Sol'   — from a planet
systemOf(index, 'sol-star')?.name    // 'Sol'   — from a star
systemOf(index, 'sol')?.name         // 'Sol'   — a system returns itself
systemOf(index, 'ghost')             // null    — no object carries that id`}
      />

      <P>
        A system id returning that same system is what makes the helper safe to call on an id you
        have not inspected — you never need to branch on &ldquo;is this already a system?&rdquo;.
      </P>

      <Callout tone="warning" title="Pass the index, not the galaxy">
        <C>systemOf()</C> accepts either. Given a <C>Galaxy</C> it re-indexes the entire universe{' '}
        <em>on every call</em>; given a <C>GalaxyIndex</C> it is two map lookups. Both are correct;
        only one belongs in a loop.
      </Callout>

      <H2 id="neighbours">Neighbours and lanes</H2>
      <P>Two helpers for the immediate surroundings of a system:</P>

      <CodeBlock
        lang="ts"
        code={`import { lanesOf, neighboursOf, stationsOf } from '@cotontigeh/starmap'

lanesOf(galaxy, 'b').map((l) => l.id)         // ['lane-a-b', 'lane-b-c']
neighboursOf(galaxy, 'b').map((s) => s.id)    // ['a', 'c']

// And, inside one system, every station across all its planets:
stationsOf(system).map((s) => s.name)         // ['High Anchorage']`}
      />

      <P>
        There is no guarantee a system has any neighbours — you build the network, so an isolated
        system is a thing you can create. <A href="#connectivity">Check for it.</A>
      </P>

      <H2 id="routes">Pathfinding</H2>
      <P>
        <C>findRoute()</C> is Dijkstra over the hyperlane graph, weighted by <C>length</C>.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { findRoute } from '@cotontigeh/starmap'

findRoute(galaxy, 'a', 'c')
// { systemIds: ['a', 'b', 'c'], distance: 200, jumps: 2 }

findRoute(galaxy, 'a', 'a')
// { systemIds: ['a'], distance: 0, jumps: 0 }   — trivially true, not null

findRoute(galaxy, 'a', 'island')   // null — no path; the network is split
findRoute(galaxy, 'a', 'ghost')    // null — no such system`}
      />

      <Callout tone="note" title="null means two different things">
        Either the system does not exist, or nothing links the two. If the difference matters to
        your UI — &ldquo;unknown destination&rdquo; versus &ldquo;unreachable&rdquo; — check the
        index first, then route.
      </Callout>

      <H2 id="cost">Length is a cost</H2>
      <P>
        Pathfinding reads <C>lane.length</C> and nothing else. It never looks at the positions again
        — which means the shortest route is not necessarily the one that looks shortest on screen.
        That is a feature: override <C>length</C> and you have a travel-cost model.
      </P>

      <CodeBlock
        lang="ts"
        code={`const galaxy = createGalaxy({
  systems: [
    { id: 'x', name: 'X', x: 0,   y: 0, star: { radius: 5 } },
    { id: 'y', name: 'Y', x: 10,  y: 0, star: { radius: 5 } },   // 10 units away
    { id: 'z', name: 'Z', x: 500, y: 0, star: { radius: 5 } },
  ],
  lanes: [
    { from: 'x', to: 'y', length: 999 },   // adjacent, but expensive: a blockade
    { from: 'x', to: 'z' },                // 500, derived
    { from: 'z', to: 'y' },                // 490, derived
  ],
})

findRoute(galaxy, 'x', 'y')
// { systemIds: ['x', 'z', 'y'], distance: 990, jumps: 2 }
//  ↑ the long way round, because 990 beats 999`}
      />

      <P>
        Blockades, tolls, dangerous space, faster lanes — all of it is a number on an edge. You do
        not need a second graph.
      </P>

      <Callout tone="note" title="The queue is naive on purpose">
        The priority queue is a linear scan, which is fine up to a few thousand systems. Past that,
        swap it for a binary heap — the graph is yours, and this function is forty lines.
      </Callout>

      <H2 id="connectivity">Connectivity</H2>
      <P>
        This is the check people skip, and the one that costs an evening later. The library verifies
        that your <em>references</em> resolve; it does not decide whether your <em>network</em>{' '}
        makes sense. A system nobody can fly to is valid data.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { connectedComponents } from '@cotontigeh/starmap'

const parts = connectedComponents(galaxy)
// [['a', 'b', 'c'], ['island']]
//   ↑ largest first. A healthy galaxy returns exactly one group.

if (parts.length > 1) {
  throw new Error(\`Stranded systems: \${parts.slice(1).flat().join(', ')}\`)
}`}
      />

      <P>
        Run it once, where you build or load your universe. It is the single assertion that turns a
        whole class of &ldquo;the quest is impossible&rdquo; bug reports into a build failure.
      </P>

      <H2 id="costs">What each call costs</H2>
      <P>
        Nothing here is expensive in absolute terms — but knowing which calls walk the universe
        tells you which ones belong outside a loop.
      </P>

      <PropsTable
        rows={[
          {
            name: 'indexGalaxy',
            type: 'one full walk',
            description: 'Every object, once. Call it once per galaxy and keep the result.',
          },
          {
            name: 'indexSystems',
            type: 'one pass over systems',
            description: 'Cheaper. Still not free.',
          },
          {
            name: 'systemOf(index, …)',
            type: 'two map lookups',
            description: 'Safe anywhere, including a render loop.',
          },
          {
            name: 'systemOf(galaxy, …)',
            type: 'one full walk',
            description: 'Re-indexes on every call. Convenience only.',
          },
          {
            name: 'lanesOf',
            type: 'one pass over lanes',
            description: 'Filters the lane array.',
          },
          {
            name: 'neighboursOf',
            type: 'one pass over systems + lanes',
            description: 'Builds a system index internally on every call.',
          },
          {
            name: 'stationsOf',
            type: 'one pass over one system',
            description: 'Cheap. Operates on a single system, not the galaxy.',
          },
          {
            name: 'findRoute',
            type: 'Dijkstra, linear-scan queue',
            description: 'Fine to a few thousand systems. Not a per-frame call.',
          },
          {
            name: 'connectedComponents',
            type: 'one breadth-first sweep',
            description: 'A build-time or load-time check, not a runtime one.',
          },
        ]}
      />

      <P>
        Next: <A href={routes.page('starmap', 'animating')}>Animating orbits</A> — the one family of
        calls that <em>is</em> meant to run every frame.
      </P>
    </>
  )
}
