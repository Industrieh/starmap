import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { PropsTable } from '@/components/docs/props-table'
import { A, C, H2, LI, Lead, P, UL } from '@/components/docs/prose'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'map', title: 'The map', depth: 2 },
  { id: 'dependencies', title: 'Which module knows what', depth: 2 },
  { id: 'normalization', title: 'Normalization', depth: 2 },
  { id: 'validation', title: 'Validation, in four passes', depth: 2 },
  { id: 'invariants', title: 'Invariants', depth: 2 },
  { id: 'contributing', title: 'Adding something', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        How the source is laid out, and where a change belongs. Written for whoever opens the
        repository next — including you, in six months.
      </Lead>

      <H2 id="map">The map</H2>
      <P>
        Seven files, about 1,700 lines including the comments. Small enough to read in an afternoon,
        which is deliberate.
      </P>

      <CodeBlock
        lang="bash"
        noCopy
        code={`src/
  index.ts          the public surface — exports, and nothing else
  core/
    types.ts        the data contract: what you get back
    input.ts        the input schema: what you pass in
    create.ts       normalization — the entry point
    validate.ts     checking, and the error type
    query.ts        indexes, neighbours, connectivity, routes
    geometry.ts     orbital positions
    rng.ts          deterministic randomness`}
      />

      <H2 id="dependencies">Which module knows what</H2>
      <P>
        The dependency graph is a line, not a web. Nothing in <C>core/</C> imports from a sibling
        that imports it back.
      </P>

      <PropsTable
        rows={[
          {
            name: 'types.ts',
            type: 'imports nothing',
            description: 'Pure declarations. The bottom of the stack.',
          },
          {
            name: 'input.ts',
            type: 'types.ts',
            description: 'Reuses the open unions, so the two layers cannot drift.',
          },
          {
            name: 'geometry.ts',
            type: 'types.ts',
            description: 'Pure functions over positions. No knowledge of building or checking.',
          },
          {
            name: 'rng.ts',
            type: 'imports nothing',
            description: 'Entirely standalone. Usable without touching a galaxy at all.',
          },
          {
            name: 'validate.ts',
            type: 'types.ts',
            description: 'Reads a finished galaxy. Never builds one.',
          },
          {
            name: 'create.ts',
            type: 'input, types, geometry, validate',
            description: 'The only module that composes the others.',
          },
          {
            name: 'query.ts',
            type: 'types.ts',
            description: 'Reads a finished galaxy. Never builds one either.',
          },
        ]}
      />

      <Callout tone="note" title="Why geometry has no idea validation exists">
        Positions are needed by callers who never build a galaxy — a renderer given a system, a
        worker given one system&apos;s worth of data. Keeping the dependency one-directional is what
        lets a bundler drop the parts you do not import.
      </Callout>

      <H2 id="normalization">Normalization</H2>
      <P>
        <C>create.ts</C> is a series of small <C>normalizeX()</C> functions, one per object kind,
        each taking the input shape and returning the output shape. They all obey one rule:
      </P>

      <CodeBlock
        lang="ts"
        code={`function normalizePlanet(input: PlanetInput, systemId: string, index: number): Planet {
  const id = input.id ?? \`\${systemId}-p\${index}\`
  return {
    id,
    name: input.name,
    index,                          // derived: its rank in the array
    type: input.type,               // yours: passed through untouched
    radius: input.radius,
    orbit: input.orbit,
    angle: input.angle ?? 0,        // a default that means "does not move"
    period: input.period ?? 0,
    stations: (input.stations ?? []).map((s, i) => normalizeStation(s, id, i)),
  }
}`}
      />

      <P>Three specific decisions are worth knowing about:</P>

      <UL>
        <LI>
          <strong>
            <C>outerLimit</C> has no margin.
          </strong>{' '}
          It is exactly how far the outermost object reaches. A margin would be an arbitrary number,
          and an arbitrary number in a library is a number every user has to work around.
        </LI>
        <LI>
          <strong>Derived ids can collide.</strong> Nothing renames them silently — validation
          reports the duplicate and <C>createGalaxy()</C> throws. A library that quietly renamed
          your objects would be worse.
        </LI>
        <LI>
          <strong>Rounding happens at two places only</strong> — lane lengths and <C>outerLimit</C>{' '}
          — because both end up in JSON. Nothing is rounded mid-computation.
        </LI>
      </UL>

      <H2 id="validation">Validation, in four passes</H2>
      <P>
        <C>validate.ts</C> runs in a fixed order, and the order is what makes cross-references
        checkable.
      </P>

      <PropsTable
        rows={[
          {
            name: '1. Index',
            type: 'id → { kind, systemId }',
            description:
              'Claim every id, reporting duplicates as it goes. Later passes resolve references against this map.',
          },
          {
            name: '2. Systems',
            type: 'per-system checks',
            description:
              'Types, ranges, and the references inside each system — local routes, gate links.',
          },
          {
            name: '3. Lanes',
            type: 'the network',
            description:
              'Endpoints exist and are systems, no self-links, no duplicate pairs, non-negative lengths.',
          },
          {
            name: '4. Meta',
            type: 'counters',
            description:
              'Re-derive every count and compare. This is what catches a hand-edited save.',
          },
        ]}
      />

      <Callout tone="note" title="Hyperlane ids are not in the index">
        They count towards global uniqueness, but they are not <em>referenceable objects</em> —
        otherwise a gate could claim to &ldquo;reach&rdquo; a hyperlane, and a local route could
        point at one. They live in a separate set for the uniqueness check only.
      </Callout>

      <H2 id="invariants">Invariants</H2>
      <P>
        Things that hold for every <C>Galaxy</C> the library returns. They are worth knowing because
        your code may rely on them:
      </P>

      <UL>
        <LI>every id is unique across the whole galaxy, hyperlanes included;</LI>
        <LI>
          every collection exists — <C>planets</C>, <C>gates</C>, <C>stations</C>,{' '}
          <C>asteroidFields</C>, <C>localRoutes</C>, <C>rocks</C>, <C>links</C> are arrays, never{' '}
          <C>undefined</C>;
        </LI>
        <LI>
          <C>planet.index</C> equals its position in the array;
        </LI>
        <LI>
          <C>station.planetId</C> points at the planet that contains it;
        </LI>
        <LI>
          every id in <C>gate.links</C> is an existing system, and never the gate&apos;s own;
        </LI>
        <LI>
          both ends of a <C>localRoute</C> belong to the system that declares it;
        </LI>
        <LI>
          the counters in <C>meta</C> match the contents.
        </LI>
      </UL>

      <Callout tone="tip" title="This is why the non-null assertion is safe">
        <C>at.get(planet.id)!</C> in a render loop cannot be <C>undefined</C>:{' '}
        <C>systemPositions()</C> emits an entry for every object of the system, and the invariants
        guarantee the id is there.
      </Callout>

      <H2 id="contributing">Adding something</H2>
      <P>A new field on an existing object touches four places, in this order:</P>

      <CodeBlock
        lang="bash"
        noCopy
        code={`1. input.ts     add it to the …Input interface, optional
2. types.ts     add it to the output interface
3. create.ts    pass it through in the matching normalize…()
4. validate.ts  check its type and range, if it has one`}
      />

      <P>A whole new object kind additionally needs:</P>

      <UL>
        <LI>
          an entry in <C>ObjectKind</C> and in the <C>IndexEntry</C> union;
        </LI>
        <LI>
          indexing in <C>indexGalaxy()</C>, so it is reachable by id;
        </LI>
        <LI>
          a position in <C>systemPositions()</C>, if it has one;
        </LI>
        <LI>
          a counter in <C>meta</C>, and its check in the fourth validation pass.
        </LI>
      </UL>

      <P>
        Two rules the tooling enforces, and that a change must respect: every exported declaration
        carries an explicit type (so the <C>.d.ts</C> can be emitted file by file), and no source
        file may import anything non-relative or touch a browser global. See{' '}
        <A href={routes.page('starmap', 'design')}>Design decisions</A> for why.
      </P>
    </>
  )
}
