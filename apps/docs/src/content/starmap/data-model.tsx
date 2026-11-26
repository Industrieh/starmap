import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { PropsTable } from '@/components/docs/props-table'
import { A, C, H2, H3, LI, Lead, P, Quote, UL } from '@/components/docs/prose'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'two-layers', title: 'Two layers of types', depth: 2 },
  { id: 'ids', title: 'Ids', depth: 2 },
  { id: 'system', title: 'System', depth: 2 },
  { id: 'star', title: 'Star', depth: 3 },
  { id: 'planet', title: 'Planet', depth: 3 },
  { id: 'station', title: 'Station', depth: 3 },
  { id: 'gate', title: 'Gate', depth: 3 },
  { id: 'asteroid-field', title: 'Asteroid field', depth: 3 },
  { id: 'galaxy', title: 'Galaxy', depth: 2 },
  { id: 'lane', title: 'Hyperlane', depth: 3 },
  { id: 'meta', title: 'Meta', depth: 3 },
  { id: 'local-route', title: 'Local route', depth: 2 },
  { id: 'open-unions', title: 'Open unions', depth: 2 },
  { id: 'missing', title: 'What is deliberately missing', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        Every object, field by field: what you must provide, what the library computes, and what
        stays undefined until you say otherwise.
      </Lead>

      <H2 id="two-layers">Two layers of types</H2>
      <P>
        Every object in this library exists twice, and telling the two apart removes most of the
        confusion people have at the start.
      </P>

      <UL>
        <LI>
          <strong>
            <C>…Input</C> — what you write.
          </strong>{' '}
          Forgiving: ids, counts and empty collections can all be left out.
        </LI>
        <LI>
          <strong>The plain type — what you get back.</strong> Complete: every id is filled in,
          every collection exists (possibly empty), every derivable number is computed.
        </LI>
      </UL>

      <CodeBlock
        lang="ts"
        code={`import type { PlanetInput, Planet } from '@industrieh/starmap'

// What you write — no id, no index, no stations array.
const input: PlanetInput = { name: 'Vesper', orbit: 150, radius: 6 }

// What you get back — all three are there.
const planet: Planet = {
  id: 'sol-p1', name: 'Vesper', index: 1, radius: 6,
  orbit: 150, angle: 0, period: 0, stations: [],
}`}
      />

      <Callout tone="note" title="Reading the tables below">
        A field marked <strong>required</strong> must be in your input. A field marked{' '}
        <strong>derived</strong> is computed by <C>createGalaxy()</C>: a system&apos;s{' '}
        <C>outerLimit</C> and a lane&apos;s <C>length</C> can also be written, and then your value
        is kept, while <C>Planet.index</C> and <C>Station.planetId</C> are always computed — the
        input types have no field for them. Anything else is optional and stays <C>undefined</C> if
        you omit it; the library never invents a value that carries meaning.
      </Callout>

      <H2 id="ids">Ids</H2>
      <P>
        Ids must be unique across the <em>whole</em> galaxy — not per system, not per kind.
        Hyperlanes and local routes count too. That is what lets a single index hold everything, and
        what lets you store a bare string in a save file.
      </P>

      <P>When you leave one out, it is built from the parent id and the array position:</P>

      <CodeBlock
        lang="ts"
        noCopy
        code={`star      <systemId>-star        // 'sol-star'
planet    <systemId>-p<rank>     // 'sol-p0', 'sol-p1'
station   <planetId>-st<rank>    // 'sol-p1-st0'
gate      <systemId>-gate<rank>  // 'sol-gate0'
field     <systemId>-ast<rank>   // 'sol-ast0'
lane      lane-<from>-<to>       // 'lane-sol-vega'
route     <fromId>><toId>        // 'sol-p1>sol-p1-st0'`}
      />

      <Callout tone="warning" title="Give explicit ids to things you refer to by name">
        <C>sol-p1</C> is a position, not a name. Insert a planet before it and everything shifts —
        breaking every save that stored the old id. If your game refers to Earth, write{' '}
        <C>id: &apos;earth&apos;</C>.
      </Callout>

      <H2 id="system">System</H2>
      <P>
        The unit of place. Everything else lives inside one. In a system&apos;s local coordinates
        the star sits at the origin, so a planet&apos;s <C>orbit</C> is its distance from{' '}
        <C>(0, 0)</C>; <C>x</C> and <C>y</C> on the system itself place it in the galaxy.
      </P>

      <PropsTable
        rows={[
          {
            name: 'id',
            type: 'string',
            required: true,
            description: 'Unique across the whole galaxy.',
          },
          { name: 'name', type: 'string', required: true, description: 'Non-empty.' },
          {
            name: 'x, y',
            type: 'number',
            required: true,
            description: 'Position in the galaxy, in world units.',
          },
          {
            name: 'star',
            type: 'StarInput',
            required: true,
            description: 'Every system has exactly one.',
          },
          {
            name: 'faction',
            type: '{ id, name }',
            description: 'Who holds the system. Free-form — the library imposes no vocabulary.',
          },
          {
            name: 'security',
            type: 'number',
            description: (
              <>
                <C>0</C> (lawless) to <C>1</C> (safe). Rejected outside that range.
              </>
            ),
          },
          {
            name: 'planets',
            type: 'PlanetInput[]',
            defaultValue: '[]',
            description: (
              <>
                In orbital order — the array position becomes <C>planet.index</C>.
              </>
            ),
          },
          {
            name: 'gates',
            type: 'GateInput[]',
            defaultValue: '[]',
            description: 'Jump points.',
          },
          {
            name: 'asteroidFields',
            type: 'AsteroidFieldInput[]',
            defaultValue: '[]',
            description: 'Belts and clusters.',
          },
          {
            name: 'localRoutes',
            type: 'LocalRouteInput[]',
            defaultValue: '[]',
            description: 'Links between two objects of this system.',
          },
          {
            name: 'outerLimit',
            type: 'number',
            derived: true,
            description: (
              <>
                The system&apos;s edge. Defaults to how far its own contents reach — the star, the
                planets and their stations, the gates, the asteroid fields and their rocks —{' '}
                <strong>with no margin</strong>. Set it yourself if you want empty space past the
                outermost object.
              </>
            ),
          },
        ]}
      />

      <H3 id="star">Star</H3>
      <PropsTable
        rows={[
          {
            name: 'radius',
            type: 'number',
            required: true,
            description: 'In world units. Must be strictly positive.',
          },
          {
            name: 'id',
            type: 'string',
            defaultValue: '<systemId>-star',
            description: 'Rarely worth setting.',
          },
          {
            name: 'name',
            type: 'string',
            defaultValue: 'the system name',
            description: 'Sol the system, Sol the star.',
          },
          {
            name: 'class',
            type: 'StarClass',
            description: (
              <>
                Spectral class: <C>O B A F G K M</C>, or any other string.
              </>
            ),
          },
        ]}
      />

      <H3 id="planet">Planet</H3>
      <PropsTable
        rows={[
          { name: 'name', type: 'string', required: true, description: 'Non-empty.' },
          {
            name: 'orbit',
            type: 'number',
            required: true,
            description: 'Distance from the centre of the star. Strictly positive.',
          },
          {
            name: 'radius',
            type: 'number',
            required: true,
            description: 'The planet itself. Strictly positive.',
          },
          {
            name: 'angle',
            type: 'number',
            defaultValue: '0',
            description: 'Where it sits at t = 0, in degrees.',
          },
          {
            name: 'period',
            type: 'number',
            defaultValue: '0',
            description: (
              <>
                Seconds for a full orbit. <C>0</C> means it never moves.
              </>
            ),
          },
          {
            name: 'index',
            type: 'number',
            derived: true,
            description: 'Its rank in the array. Validation rejects a mismatch.',
          },
          {
            name: 'type',
            type: 'PlanetType',
            description: (
              <>
                <C>terran</C>, <C>gas</C>, <C>frozen</C>… or any other string.
              </>
            ),
          },
          {
            name: 'moons',
            type: 'number',
            description: 'A count. The library never models moons as objects.',
          },
          { name: 'habitable', type: 'boolean', description: 'Yours to interpret.' },
          { name: 'resources', type: 'string', description: 'Free-form. Never read.' },
          {
            name: 'stations',
            type: 'StationInput[]',
            defaultValue: '[]',
            description: 'Orbiting it.',
          },
        ]}
      />

      <H3 id="station">Station</H3>
      <P>
        A station orbits a <em>planet</em>, not the star — so its <C>orbit</C> is measured from the
        planet&apos;s centre, and it is carried along as the planet travels.
      </P>
      <PropsTable
        rows={[
          { name: 'name', type: 'string', required: true, description: 'Non-empty.' },
          {
            name: 'orbit',
            type: 'number',
            required: true,
            description: 'Distance from the centre of its planet. Strictly positive.',
          },
          { name: 'angle', type: 'number', defaultValue: '0', description: 'Degrees, at t = 0.' },
          {
            name: 'period',
            type: 'number',
            defaultValue: '0',
            description: 'Seconds per orbit around its planet.',
          },
          {
            name: 'planetId',
            type: 'string',
            derived: true,
            description: 'Always filled in. The only back-pointer in the model.',
          },
          {
            name: 'type',
            type: 'StationType',
            description: (
              <>
                <C>trade</C>, <C>mining</C>, <C>shipyard</C>… or any other string.
              </>
            ),
          },
          {
            name: 'docks',
            type: 'number',
            description:
              'Free-form: the library never interprets it. Validation only checks that it is a number, 0 or more.',
          },
        ]}
      />

      <H3 id="gate">Gate</H3>
      <P>
        A gate is an <strong>object inside a system</strong> — something a ship flies to. The{' '}
        <A href="#lane">hyperlane</A> is the galaxy-level edge that pathfinding walks. Modelling
        both lets a system have three gates on one lane, or a lane with no gate at all.
      </P>
      <PropsTable
        rows={[
          { name: 'name', type: 'string', required: true, description: 'Non-empty.' },
          {
            name: 'orbit',
            type: 'number',
            required: true,
            description: 'Distance from the star. Strictly positive.',
          },
          {
            name: 'angle',
            type: 'number',
            defaultValue: '0',
            description: 'Degrees. Gates never move.',
          },
          {
            name: 'links',
            type: 'string[]',
            defaultValue: '[]',
            description: (
              <>
                System ids this gate reaches. Every one must exist, and none may be its own system.
                An empty list is a dead gate — allowed on purpose.
              </>
            ),
          },
          {
            name: 'status',
            type: 'GateStatus',
            defaultValue: "'nominal'",
            description: (
              <>
                <C>nominal</C> or <C>unstable</C>, or any other string.
              </>
            ),
          },
        ]}
      />

      <H3 id="asteroid-field">Asteroid field</H3>
      <P>
        Discriminated by <C>kind</C>. A <C>belt</C> is an arc of a ring around the star; a{' '}
        <C>cluster</C> is a pocket anywhere in the system.
      </P>

      <CodeBlock
        lang="ts"
        code={`// A belt: an arc between two orbits.
{ kind: 'belt', name: 'Inner Belt', orbit: 220, width: 30, arcStart: 0, arcSweep: 360 }

// A cluster: a pocket at a fixed spot.
{ kind: 'cluster', name: 'The Shoals', x: -180, y: 90, radius: 40 }`}
      />

      <PropsTable
        rows={[
          { name: 'name', type: 'string', required: true, description: 'Non-empty.' },
          {
            name: 'kind',
            type: "'belt' | 'cluster'",
            required: true,
            description: 'Decides which of the two shapes below applies.',
          },
          {
            name: 'orbit, width',
            type: 'number',
            required: true,
            description: 'Belt only. Ring radius and radial thickness.',
          },
          {
            name: 'arcStart, arcSweep',
            type: 'number',
            required: true,
            description: (
              <>
                Belt only, in degrees. <C>arcSweep: 360</C> is a full ring; it is rejected past{' '}
                <C>360</C>.
              </>
            ),
          },
          {
            name: 'x, y, radius',
            type: 'number',
            required: true,
            description: 'Cluster only. Centre and reach, in system coordinates.',
          },
          {
            name: 'rocks',
            type: '[x, y, r][]',
            defaultValue: '[]',
            description: (
              <>
                Pre-placed asteroids. <strong>The library never generates any.</strong> A tuple
                rather than an object, because a field can hold hundreds and{' '}
                <C>{`{"x":1,"y":2,"r":3}`}</C> is four times the JSON of <C>[1,2,3]</C>.
              </>
            ),
          },
          {
            name: 'density',
            type: 'number',
            description: (
              <>
                <C>0</C> to <C>1</C>, checked by validation. A hint for your own logic — yield,
                danger; the library never interprets it.
              </>
            ),
          },
          { name: 'richness', type: 'Richness', description: 'Free-form label.' },
        ]}
      />

      <H2 id="galaxy">Galaxy</H2>
      <P>The root. Three keys, and only the first is required of you.</P>

      <PropsTable
        rows={[
          {
            name: 'systems',
            type: 'SystemInput[]',
            required: true,
            description: 'At least the array.',
          },
          {
            name: 'lanes',
            type: 'LaneInput[]',
            defaultValue: '[]',
            description: 'The inter-system network. You decide what connects to what.',
          },
          {
            name: 'seed',
            type: 'string',
            description: (
              <>
                Free-form, copied to <C>meta.seed</C>. Put your generator&apos;s seed here so you
                can rebuild this universe later.
              </>
            ),
          },
          {
            name: 'generatedAt',
            type: 'string',
            description: 'Free-form timestamp, copied to meta. Never read.',
          },
        ]}
      />

      <H3 id="lane">Hyperlane</H3>
      <P>
        Undirected: <C>from</C> and <C>to</C> are interchangeable, and declaring the same pair twice
        is an error. A lane from a system to itself is rejected.
      </P>
      <PropsTable
        rows={[
          {
            name: 'from, to',
            type: 'string',
            required: true,
            description: 'System ids. Both must exist.',
          },
          {
            name: 'length',
            type: 'number',
            derived: true,
            description: (
              <>
                Straight-line distance between the two systems. Override it to make a short lane{' '}
                <em>cost</em> more — <C>findRoute()</C> weighs by this number, not by geometry.
              </>
            ),
          },
          { name: 'id', type: 'string', defaultValue: 'lane-<from>-<to>', description: '' },
        ]}
      />

      <Callout tone="tip" title="length is a cost, not just a distance">
        Because pathfinding reads <C>length</C> and nothing else, it doubles as a travel-cost knob.
        A dangerous shortcut can be given a large length so routing avoids it unless it is the only
        way through.
      </Callout>

      <H3 id="meta">Meta</H3>
      <P>
        Counters and a couple of labels, all computed. Validation re-derives them and rejects a
        galaxy whose <C>meta</C> disagrees with its contents — which is how a hand-edited save file
        gets caught.
      </P>

      <CodeBlock
        lang="ts"
        code={`galaxy.meta
// {
//   seed: 'quickstart',
//   formatVersion: 2,
//   systemCount: 2, laneCount: 1,
//   planetCount: 2, stationCount: 1,
//   gateCount: 1, asteroidFieldCount: 0,
//   galaxyRadius: 449.44,   // the disc enclosing every system
// }`}
      />

      <Callout tone="note" title="formatVersion is your save-compatibility check">
        It records the shape of the data at the time the galaxy was built, and{' '}
        <C>validateGalaxy()</C> compares it to the current <C>FORMAT_VERSION</C>: a save built for
        another format comes back as a single issue on <C>meta.formatVersion</C>, with nothing else
        checked. You know the contract moved on before you hit a missing field.
      </Callout>

      <H2 id="local-route">Local route</H2>
      <P>
        A link between two objects <em>inside the same system</em> — a docking approach, a mining
        run, a shortcut. Both ends are <C>{`{ kind, id }`}</C> references, and validation checks
        that each id exists, that its kind matches, that both ends belong to this system, and that
        they are two different objects. The route&apos;s own id — <C>{'<fromId>><toId>'}</C> by
        default — is unique across the galaxy, like every other.
      </P>

      <CodeBlock
        lang="ts"
        code={`localRoutes: [
  {
    from: { kind: 'planet', id: 'sol-p1' },
    to: { kind: 'station', id: 'sol-p1-st0' },
    type: 'docking',
  },
]`}
      />

      <H2 id="open-unions">Open unions</H2>
      <P>
        <C>PlanetType</C>, <C>StarClass</C>, <C>StationType</C>, <C>FactionId</C>, <C>Richness</C>,{' '}
        <C>GateStatus</C> and <C>RouteType</C> are <strong>open</strong>: the listed values appear
        in autocomplete, and any other string is still accepted.
      </P>

      <CodeBlock
        lang="ts"
        code={`type PlanetType = 'lava' | 'rocky' | 'terran' | /* … */ | (string & {})

{ type: 'terran' }        // suggested
{ type: 'shattered' }     // yours, and just as valid`}
      />

      <P>
        The <C>{`(string & {})`}</C> is what stops TypeScript from collapsing the union down to
        plain <C>string</C> and losing the suggestions. The library never reads these values — they
        exist for you to map to appearance or behaviour.
      </P>

      <H2 id="missing">What is deliberately missing</H2>
      <P>Things you might expect, and the reason they are not here:</P>

      <UL>
        <LI>
          <strong>Colours, labels, sprites.</strong> Rendering is not this library&apos;s job. Map{' '}
          <C>planet.type</C> to an appearance in your own code.
        </LI>
        <LI>
          <strong>Moons as objects.</strong> Only a <C>moons</C> count. Modelling them would double
          the depth of the tree for something most games draw as a detail.
        </LI>
        <LI>
          <strong>Elliptical orbits.</strong> Circles only. Ellipses need a focus, an eccentricity
          and an argument of periapsis to mean anything, and almost no game needs them.
        </LI>
        <LI>
          <strong>Game state.</strong> No ownership, no stock, no visited flag. That is the{' '}
          <A href={routes.page('starmap', 'recipes')}>frozen-terrain rule</A>, and it is the one
          decision the whole library leans on.
        </LI>
      </UL>

      <Quote>
        If a field would mean different things in two different games, it does not belong in the
        model.
      </Quote>
    </>
  )
}
