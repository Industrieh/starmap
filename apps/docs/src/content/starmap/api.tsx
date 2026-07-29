import type { JSX } from 'react'

import { ApiEntry } from '@/components/docs/api-entry'
import { Callout } from '@/components/docs/callout'
import { PropsTable } from '@/components/docs/props-table'
import { A, C, H2, Lead, P } from '@/components/docs/prose'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'building', title: 'Building', depth: 2 },
  { id: 'createGalaxy', title: 'createGalaxy', depth: 3 },
  { id: 'FORMAT_VERSION', title: 'FORMAT_VERSION', depth: 3 },
  { id: 'checking', title: 'Checking', depth: 2 },
  { id: 'validateGalaxy', title: 'validateGalaxy', depth: 3 },
  { id: 'assertValidGalaxy', title: 'assertValidGalaxy', depth: 3 },
  { id: 'GalaxyValidationError', title: 'GalaxyValidationError', depth: 3 },
  { id: 'querying', title: 'Querying', depth: 2 },
  { id: 'indexGalaxy', title: 'indexGalaxy', depth: 3 },
  { id: 'indexSystems', title: 'indexSystems', depth: 3 },
  { id: 'systemOf', title: 'systemOf', depth: 3 },
  { id: 'lanesOf', title: 'lanesOf', depth: 3 },
  { id: 'neighboursOf', title: 'neighboursOf', depth: 3 },
  { id: 'stationsOf', title: 'stationsOf', depth: 3 },
  { id: 'findRoute', title: 'findRoute', depth: 3 },
  { id: 'connectedComponents', title: 'connectedComponents', depth: 3 },
  { id: 'geometry', title: 'Geometry', depth: 2 },
  { id: 'systemPositions', title: 'systemPositions', depth: 3 },
  { id: 'orbitPos', title: 'orbitPos', depth: 3 },
  { id: 'fieldCenter', title: 'fieldCenter', depth: 3 },
  { id: 'toRad', title: 'toRad / round', depth: 3 },
  { id: 'randomness', title: 'Randomness', depth: 2 },
  { id: 'createRng', title: 'createRng', depth: 3 },
  { id: 'hashSeed', title: 'hashSeed / mulberry32', depth: 3 },
  { id: 'types', title: 'Types', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        Every export of <C>@cotontigeh/starmap</C>, with its signature. Everything comes from the
        package root — there are no sub-paths.
      </Lead>

      <Callout tone="note" title="Looking for explanations rather than signatures?">
        The guides cover the same ground with reasons attached:{' '}
        <A href={routes.page('starmap', 'querying')}>Querying</A>,{' '}
        <A href={routes.page('starmap', 'animating')}>Animating</A>,{' '}
        <A href={routes.page('starmap', 'randomness')}>Randomness</A>.
      </Callout>

      <H2 id="building">Building</H2>

      <ApiEntry
        id="createGalaxy"
        name="createGalaxy"
        kind="function"
        signature={`function createGalaxy(
  input: GalaxyInput,
  options?: CreateGalaxyOptions,
): Galaxy`}
        summary={
          <>
            The entry point. Takes your description, fills in what can be computed, checks the
            result, and returns a complete <C>Galaxy</C>.
          </>
        }
        params={[
          {
            name: 'input',
            type: 'GalaxyInput',
            description: (
              <>
                At minimum <C>{`{ systems: [...] }`}</C>. Not mutated.
              </>
            ),
          },
          {
            name: 'options.validate',
            type: 'boolean = true',
            description: (
              <>
                Set to <C>false</C> to skip the check. Only on a hot path whose input you have
                already validated.
              </>
            ),
          },
        ]}
        returns={
          <>
            A <C>Galaxy</C>: <C>meta</C>, <C>systems</C>, <C>lanes</C>. Treat it as immutable.
          </>
        }
        throws={
          <>
            <C>GalaxyValidationError</C> when the finished galaxy is inconsistent —{' '}
            <C>error.issues</C> holds every problem, not just the first. <C>TypeError</C> if{' '}
            <C>input</C> is not an object with a <C>systems</C> array.
          </>
        }
        example={`const galaxy = createGalaxy({
  systems: [
    { id: 'sol', name: 'Sol', x: 0, y: 0, star: { radius: 18 } },
    { id: 'vega', name: 'Vega', x: 420, y: 160, star: { radius: 22 } },
  ],
  lanes: [{ from: 'sol', to: 'vega' }],
})

galaxy.systems[0].star.id   // 'sol-star'  — derived
galaxy.lanes[0].length      // 449.44      — derived from the positions`}
      />

      <ApiEntry
        id="FORMAT_VERSION"
        name="FORMAT_VERSION"
        kind="constant"
        signature={`const FORMAT_VERSION: number   // currently 2`}
        summary={
          <>
            The version of the data contract. Copied into <C>meta.formatVersion</C> at build time,
            and bumped on every breaking change to the shape.
          </>
        }
        example={`if (save.meta.formatVersion !== FORMAT_VERSION) {
  console.warn('This save predates the current data contract')
}`}
      />

      <H2 id="checking">Checking</H2>

      <ApiEntry
        id="validateGalaxy"
        name="validateGalaxy"
        kind="function"
        signature={`function validateGalaxy(galaxy: Galaxy): GalaxyIssue[]`}
        summary={
          <>
            Check a galaxy and return its problems. <strong>Never throws</strong>, whatever you pass
            it — which is what makes it the right tool for data read back from disk.
          </>
        }
        params={[
          {
            name: 'galaxy',
            type: 'Galaxy',
            description: 'Anything, really. A malformed value is reported, not thrown.',
          },
        ]}
        returns={
          <>
            An array of <C>{`{ path, message }`}</C>, empty when the galaxy is sound. <C>path</C>{' '}
            locates the value, e.g. <C>systems[3].planets[0].orbit</C>.
          </>
        }
        example={`const galaxy = JSON.parse(json) as Galaxy
const issues = validateGalaxy(galaxy)

if (issues.length) {
  console.error(issues.map((i) => \`\${i.path}: \${i.message}\`).join('\\n'))
}`}
      />

      <ApiEntry
        id="assertValidGalaxy"
        name="assertValidGalaxy"
        kind="function"
        signature={`function assertValidGalaxy(galaxy: Galaxy): void`}
        summary={
          <>
            The throwing form of <C>validateGalaxy()</C>. This is what <C>createGalaxy()</C> calls
            internally.
          </>
        }
        throws={
          <>
            <C>GalaxyValidationError</C> if there is at least one issue.
          </>
        }
      />

      <ApiEntry
        id="GalaxyValidationError"
        name="GalaxyValidationError"
        kind="class"
        signature={`class GalaxyValidationError extends Error {
  readonly issues: readonly GalaxyIssue[]
}`}
        summary={
          <>
            Thrown by <C>createGalaxy()</C> and <C>assertValidGalaxy()</C>. The message lists every
            problem; <C>issues</C> gives you the same list structured.
          </>
        }
        example={`try {
  createGalaxy(input)
} catch (error) {
  if (error instanceof GalaxyValidationError) {
    for (const issue of error.issues) {
      console.error(issue.path, issue.message)
    }
  }
}`}
      />

      <H2 id="querying">Querying</H2>

      <ApiEntry
        id="indexGalaxy"
        name="indexGalaxy"
        kind="function"
        signature={`function indexGalaxy(galaxy: Galaxy): GalaxyIndex`}
        summary={
          <>
            Build an id → object lookup covering every kind: systems, stars, planets, stations,
            gates and asteroid fields.
          </>
        }
        returns={
          <>
            A <C>ReadonlyMap</C> of <C>IndexEntry</C>. Each entry carries its <C>kind</C>, the{' '}
            <C>obj</C> itself, and the <C>systemId</C> it belongs to.
          </>
        }
        example={`const index = indexGalaxy(galaxy)   // walks the whole universe — do this once

const entry = index.get('sol-p1-st0')
if (entry?.kind === 'station') entry.obj.docks   // typed as Station`}
      >
        <Callout tone="warning" title="Build it once">
          Every call is a full walk. A galaxy never changes after it is built, so the index never
          goes stale — keep it for the session.
        </Callout>
      </ApiEntry>

      <ApiEntry
        id="indexSystems"
        name="indexSystems"
        kind="function"
        signature={`function indexSystems(galaxy: Galaxy): SystemsById`}
        summary="Build an id → system lookup. Cheaper than the full index when systems are all you need."
        returns={
          <>
            A <C>ReadonlyMap&lt;string, StarSystem&gt;</C>.
          </>
        }
      />

      <ApiEntry
        id="systemOf"
        name="systemOf"
        kind="function"
        signature={`function systemOf(
  source: Galaxy | GalaxyIndex,
  id: string,
): StarSystem | null`}
        summary={
          <>
            The system an object belongs to, from its id alone — for any kind of object. A system id
            returns that same system, which makes it safe to call on an id you have not inspected.
          </>
        }
        params={[
          {
            name: 'source',
            type: 'Galaxy | GalaxyIndex',
            description: (
              <>
                Passing a <C>Galaxy</C> re-indexes the universe <em>on every call</em>. In a loop,
                pass the index.
              </>
            ),
          },
          { name: 'id', type: 'string', description: 'Any object id.' },
        ]}
        returns={
          <>
            The owning system, or <C>null</C> if no object carries that id.
          </>
        }
        example={`systemOf(index, 'sol-p1')?.name     // 'Sol'  — from a planet
systemOf(index, 'sol')?.name        // 'Sol'  — a system returns itself
systemOf(index, 'ghost')            // null`}
      />

      <ApiEntry
        id="lanesOf"
        name="lanesOf"
        kind="function"
        signature={`function lanesOf(galaxy: Galaxy, systemId: string): Hyperlane[]`}
        summary="Every hyperlane that touches a system, in either direction."
      />

      <ApiEntry
        id="neighboursOf"
        name="neighboursOf"
        kind="function"
        signature={`function neighboursOf(galaxy: Galaxy, systemId: string): StarSystem[]`}
        summary={
          <>
            Systems reachable in one jump. There is no guarantee there are any — your network
            decides.
          </>
        }
      />

      <ApiEntry
        id="stationsOf"
        name="stationsOf"
        kind="function"
        signature={`function stationsOf(system: StarSystem): Station[]`}
        summary="Every station in a system, flattened across all its planets. Takes a system, not a galaxy."
      />

      <ApiEntry
        id="findRoute"
        name="findRoute"
        kind="function"
        signature={`function findRoute(
  galaxy: Galaxy,
  fromId: string,
  toId: string,
): Route | null`}
        summary={
          <>
            Shortest path between two systems, weighted by <C>Hyperlane.length</C> — not by
            geometry. Override a lane&apos;s length and you have a travel-cost model.
          </>
        }
        returns={
          <>
            <C>{`{ systemIds, distance, jumps }`}</C>, or <C>null</C> if either system does not
            exist or nothing links them. Routing a system to itself returns a zero-length route, not{' '}
            <C>null</C>.
          </>
        }
        example={`findRoute(galaxy, 'a', 'c')
// { systemIds: ['a', 'b', 'c'], distance: 200, jumps: 2 }

findRoute(galaxy, 'a', 'island')   // null — the network is split`}
      >
        <Callout tone="note" title="Complexity">
          Dijkstra with a linear-scan priority queue. Fine to a few thousand systems; past that,
          index the graph once and swap in a binary heap.
        </Callout>
      </ApiEntry>

      <ApiEntry
        id="connectedComponents"
        name="connectedComponents"
        kind="function"
        signature={`function connectedComponents(galaxy: Galaxy): string[][]`}
        summary="Split the network into groups of systems that can reach each other."
        returns={
          <>
            The components, <strong>largest first</strong>. A healthy galaxy returns exactly one.
          </>
        }
        example={`const parts = connectedComponents(galaxy)
if (parts.length > 1) {
  throw new Error(\`Stranded systems: \${parts.slice(1).flat().join(', ')}\`)
}`}
      />

      <H2 id="geometry">Geometry</H2>
      <P>
        Conventions throughout: the star sits at <C>(0, 0)</C>, the Y axis points <em>down</em> (as
        in SVG), and angles are degrees measured clockwise from the positive X axis.
      </P>

      <ApiEntry
        id="systemPositions"
        name="systemPositions"
        kind="function"
        signature={`function systemPositions(system: StarSystem, t: number): Map<string, Vec2>`}
        summary={
          <>
            Every position in a system at time <C>t</C>, keyed by id. Stations are placed relative
            to their planet, so they are carried along its orbit. Gates and asteroid fields never
            move.
          </>
        }
        params={[
          { name: 'system', type: 'StarSystem', description: 'One system, not the galaxy.' },
          { name: 't', type: 'number', description: 'Simulation time, in seconds.' },
        ]}
        returns="A Map covering the star, every planet, every station, every gate and every asteroid field."
        example={`const at = systemPositions(system, 6)
at.get('sol-p0')       // { x: -90, y: 0 }
at.get('sol-p1-st0')   // the station, carried by its planet`}
      >
        <Callout tone="tip" title="Nothing to cache">
          One pass over the objects of one system — a few dozen. Call it every frame.
        </Callout>
      </ApiEntry>

      <ApiEntry
        id="orbitPos"
        name="orbitPos"
        kind="function"
        signature={`function orbitPos(
  orbit: number,
  angleDeg: number,
  period: number,
  t: number,
): Vec2`}
        summary="Position on a circular orbit at a given time. The primitive underneath systemPositions — reach for it to place something the model does not know about."
        params={[
          { name: 'orbit', type: 'number', description: 'Orbit radius.' },
          { name: 'angleDeg', type: 'number', description: 'Starting angle, at t = 0.' },
          {
            name: 'period',
            type: 'number',
            description: (
              <>
                Seconds per full orbit. <C>0</C> means it never moves.
              </>
            ),
          },
          { name: 't', type: 'number', description: 'Simulation time, in seconds.' },
        ]}
        example={`orbitPos(100, 0, 0, 0)    // { x: 100, y: 0 }
orbitPos(100, 90, 0, 0)   // { x: 0, y: 100 }  — 90° is straight down
orbitPos(100, 0, 8, 2)    // { x: 0, y: 100 }  — a quarter of an 8s orbit`}
      />

      <ApiEntry
        id="fieldCenter"
        name="fieldCenter"
        kind="function"
        signature={`function fieldCenter(field: AsteroidField): Vec2`}
        summary="The anchor point of an asteroid field: the middle of the arc for a belt, the centre for a cluster."
      />

      <ApiEntry
        id="toRad"
        name="toRad, round"
        kind="function"
        signature={`const toRad: (d: number) => number
const round: (n: number, d?: number) => number   // d defaults to 2`}
        summary={
          <>
            Two helpers the library uses internally and exports for the same boundary work.{' '}
            <C>round()</C> is what keeps <C>0.30000000000000004</C> out of your save files.
          </>
        }
        example={`toRad(180)                   // 3.141592653589793
round(0.30000000000000004)   // 0.3
round(1.23456, 3)            // 1.235`}
      >
        <Callout tone="warning" title="Round at the edges">
          Rounding inside a computation accumulates error instead of removing it. Do it when you
          serialize or hand a number to a renderer.
        </Callout>
      </ApiEntry>

      <H2 id="randomness">Randomness</H2>

      <ApiEntry
        id="createRng"
        name="createRng"
        kind="function"
        signature={`function createRng(seed: string): Rng

interface Rng {
  next(): number
  rand(min: number, max: number): number
  randInt(min: number, max: number): number
  pick<T>(arr: readonly T[]): T
  chance(p: number): boolean
  weighted<T extends { w: number }>(table: readonly T[]): T
}`}
        summary={
          <>
            A deterministic source of randomness from any string. Two instances made from the same
            seed produce the same sequence. The library never calls <C>Math.random()</C>.
          </>
        }
        example={`const rng = createRng('my-game-001')

rng.next()                 // 0.721389…   float in [0, 1)
rng.randInt(1, 6)          // 4 — both bounds included
rng.pick(['a', 'b', 'c'])  // 'a'
rng.chance(0.5)            // true
rng.weighted([{ w: 9, id: 'common' }, { w: 1, id: 'rare' }])`}
      >
        <Callout tone="danger" title="Not cryptographic">
          mulberry32 is a content generator. Never use it for tokens, keys, or anything an adversary
          benefits from predicting.
        </Callout>
      </ApiEntry>

      <ApiEntry
        id="hashSeed"
        name="hashSeed, mulberry32"
        kind="function"
        signature={`function hashSeed(str: string): number          // FNV-1a, unsigned 32-bit
function mulberry32(a: number): () => number   // the raw generator`}
        summary={
          <>
            The two primitives underneath. <C>createRng(seed)</C> is exactly{' '}
            <C>mulberry32(hashSeed(seed))</C> plus the six conveniences.
          </>
        }
        example={`hashSeed('sol')       // 3795205537
const next = mulberry32(42)
next()                // 0.601104…`}
      />

      <H2 id="types">Types</H2>
      <P>
        Every type is exported from the root. The{' '}
        <A href={routes.page('starmap', 'data-model')}>Data model</A> covers them field by field;
        this is the index.
      </P>

      <PropsTable
        rows={[
          {
            name: 'GalaxyInput',
            type: 'input',
            description: 'The root of what you write. Everything else nests inside it.',
          },
          {
            name: '…Input',
            type: 'input',
            description: (
              <>
                <C>SystemInput</C>, <C>StarInput</C>, <C>PlanetInput</C>, <C>StationInput</C>,{' '}
                <C>GateInput</C>, <C>LaneInput</C>, <C>LocalRouteInput</C>, <C>FactionInput</C>,{' '}
                <C>AsteroidBeltInput</C>, <C>AsteroidClusterInput</C>, <C>AsteroidFieldInput</C>.
              </>
            ),
          },
          {
            name: 'Galaxy',
            type: 'output',
            description: (
              <>
                <C>{`{ meta, systems, lanes }`}</C> — what <C>createGalaxy()</C> returns.
              </>
            ),
          },
          {
            name: 'StarSystem, Star, Planet, Station, Gate',
            type: 'output',
            description: 'The completed forms: every id filled in, every collection present.',
          },
          {
            name: 'AsteroidField',
            type: 'output',
            description: (
              <>
                <C>AsteroidBelt | AsteroidCluster</C>, discriminated by <C>kind</C>.
              </>
            ),
          },
          {
            name: 'Hyperlane, LocalRoute, ObjectRef, Faction, GalaxyMeta',
            type: 'output',
            description: 'The network, the local links, the references and the counters.',
          },
          {
            name: 'IndexEntry',
            type: 'query',
            description: (
              <>
                A discriminated union on <C>kind</C>. Checking it narrows <C>obj</C> with no cast.
              </>
            ),
          },
          {
            name: 'GalaxyIndex, SystemsById',
            type: 'query',
            description: 'The two ReadonlyMaps the index helpers return.',
          },
          {
            name: 'Route',
            type: 'query',
            description: (
              <>
                <C>{`{ systemIds, distance, jumps }`}</C>.
              </>
            ),
          },
          {
            name: 'GalaxyIssue',
            type: 'validation',
            description: (
              <>
                <C>{`{ path, message }`}</C>.
              </>
            ),
          },
          {
            name: 'Vec2, Rock',
            type: 'geometry',
            description: (
              <>
                <C>{`{ x, y }`}</C>, and the <C>[x, y, radius]</C> tuple of an asteroid.
              </>
            ),
          },
          {
            name: 'ObjectKind',
            type: 'union',
            description: (
              <>
                <C>
                  &apos;system&apos; | &apos;star&apos; | &apos;planet&apos; | &apos;station&apos; |
                  &apos;gate&apos; | &apos;field&apos;
                </C>{' '}
                — closed, unlike the ones below.
              </>
            ),
          },
          {
            name: 'PlanetType, StarClass, StationType, FactionId, Richness, GateStatus, RouteType',
            type: 'open union',
            description: (
              <>
                Suggested values appear in autocomplete; any other string is accepted. See{' '}
                <A href={`${routes.page('starmap', 'data-model')}#open-unions`}>Open unions</A>.
              </>
            ),
          },
          {
            name: 'Rng, Weighted',
            type: 'randomness',
            description: (
              <>
                The generator interface, and the <C>{`{ w: number }`}</C> constraint of a weighted
                table.
              </>
            ),
          },
          {
            name: 'CreateGalaxyOptions',
            type: 'options',
            description: (
              <>
                <C>{`{ validate?: boolean }`}</C>.
              </>
            ),
          },
        ]}
      />
    </>
  )
}
