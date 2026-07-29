import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { A, C, H2, LI, Lead, P, Quote, UL } from '@/components/docs/prose'
import { Step, Steps } from '@/components/docs/steps'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'mental-model', title: 'The mental model', depth: 2 },
  { id: 'build', title: 'Build your first universe', depth: 2 },
  { id: 'filled-in', title: 'What the library filled in', depth: 2 },
  { id: 'query', title: 'Ask it questions', depth: 2 },
  { id: 'animate', title: 'Make it move', depth: 2 },
  { id: 'safety-net', title: 'The safety net', depth: 2 },
  { id: 'recap', title: 'What you just learned', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        In fifteen minutes you will describe a two-system universe, let the library complete and
        check it, then query it, animate it, and prove it holds together. Every output on this page
        is real — it came from running the code.
      </Lead>

      <H2 id="mental-model">The mental model</H2>
      <P>
        Before any code, one idea. It explains every decision in the API, and holding it makes the
        rest obvious:
      </P>

      <Quote>
        You describe the terrain. The library completes it, checks it, and helps you read it. It
        never invents your world, and it never draws it.
      </Quote>

      <P>Concretely, that means three things:</P>
      <UL>
        <LI>
          <strong>You write an object</strong>, in TypeScript, by hand or from a script. The library
          has no generator — a universe is a design decision, not a random draw.
        </LI>
        <LI>
          <strong>You get frozen terrain back.</strong> A <C>Galaxy</C> is what the world{' '}
          <em>is</em>, not what is happening in it. Your ship&apos;s position, a station&apos;s
          stock, who owns what — that is game state, and it lives in your own object, keyed by the
          same ids.
        </LI>
        <LI>
          <strong>Nothing here is about pixels.</strong> No colours, no labels, no shapes. The
          library gives you positions; how they become an image is entirely yours.
        </LI>
      </UL>

      <Callout tone="tip" title="Why this matters right away">
        If you catch yourself wanting to store <C>selected: true</C> on a planet, that is the signal
        you have crossed the line. Keep a <C>Set</C> of selected ids next to the galaxy instead — it
        will save you every time you serialize.
      </Callout>

      <H2 id="build">Build your first universe</H2>

      <Steps>
        <Step title="Describe one system">
          <P>
            A system needs five things: an <C>id</C>, a <C>name</C>, its position (<C>x</C>,{' '}
            <C>y</C>) in the galaxy, and a <C>star</C> with a <C>radius</C>. Everything else is
            optional.
          </P>
          <CodeBlock
            lang="ts"
            filename="universe.ts"
            code={`import { createGalaxy, type GalaxyInput } from '@cotontigeh/starmap'

const input: GalaxyInput = {
  seed: 'quickstart',
  systems: [
    {
      id: 'sol',
      name: 'Sol',
      x: 0,
      y: 0,
      star: { class: 'G', radius: 18 },
    },
  ],
}`}
          />
          <P>
            Coordinates are in <strong>world units</strong> — whatever you decide they mean. The
            library never converts them, so pick a scale that suits your game and stay consistent.
          </P>
        </Step>

        <Step title="Give it planets, and a station">
          <P>
            Planets go in orbital order: the array position becomes <C>planet.index</C>. A planet
            needs a <C>name</C>, an <C>orbit</C> (distance from the star) and a <C>radius</C>.
            Stations orbit a planet, so they nest inside it.
          </P>
          <CodeBlock
            lang="ts"
            code={`planets: [
  { name: 'Aurelia', type: 'rocky', orbit: 90, radius: 5, period: 12 },
  {
    name: 'Vesper',
    type: 'terran',
    orbit: 150,
    radius: 6,
    angle: 30,        // where it sits at t = 0, in degrees
    period: 24,       // seconds for a full orbit
    habitable: true,
    stations: [
      { name: 'High Anchorage', type: 'trade', orbit: 14, period: 4, docks: 8 },
    ],
  },
],`}
          />
          <Callout tone="note" title="orbit is always measured from the parent">
            A planet&apos;s <C>orbit</C> is its distance from the star. A station&apos;s{' '}
            <C>orbit</C> is its distance from <em>its planet</em> — which is why <C>orbit: 14</C> is
            a sensible number here and would be absurd for a planet.
          </Callout>
        </Step>

        <Step title="Add a second system and connect them">
          <P>
            A <strong>gate</strong> is the in-system object a ship flies to. A{' '}
            <strong>hyperlane</strong> is the galaxy-level edge that pathfinding walks. They are two
            different things, and you usually want both: the gate is what the player sees, the lane
            is what <C>findRoute()</C> reads.
          </P>
          <CodeBlock
            lang="ts"
            code={`// …inside Sol
gates: [{ name: 'Sol Gate', orbit: 300, angle: 45, links: ['vega'] }],

// …a second system, and the lane between them
{ id: 'vega', name: 'Vega', x: 420, y: 160, star: { class: 'A', radius: 22 } },

// …at the root of the input
lanes: [{ from: 'sol', to: 'vega' }],`}
          />
        </Step>

        <Step title="Build it">
          <P>
            <C>createGalaxy()</C> takes your description, fills in what it can compute, checks the
            result, and hands back a <C>Galaxy</C>.
          </P>
          <CodeBlock lang="ts" code={`const galaxy = createGalaxy(input)`} />
          <P>
            If anything is inconsistent it throws — and it reports <em>every</em> problem it found,
            not just the first. More on that <A href="#safety-net">below</A>.
          </P>
        </Step>
      </Steps>

      <H2 id="filled-in">What the library filled in</H2>
      <P>
        You never wrote an id for the star, the planets, the station, the gate or the lane. They are
        all there, derived from the parent id and the array position:
      </P>

      <CodeBlock
        lang="ts"
        code={`galaxy.systems[0].star.id                        // 'sol-star'
galaxy.systems[0].planets[0].id                  // 'sol-p0'
galaxy.systems[0].planets[1].id                  // 'sol-p1'
galaxy.systems[0].planets[1].stations[0].id      // 'sol-p1-st0'
galaxy.systems[0].gates[0].id                    // 'sol-gate0'
galaxy.lanes[0].id                               // 'lane-sol-vega'`}
      />

      <P>So are the values that follow from what you gave it:</P>

      <CodeBlock
        lang="ts"
        code={`galaxy.lanes[0].length          // 449.44 — the distance between (0,0) and (420,160)
galaxy.systems[0].outerLimit    // 300    — the reach of the outermost object, the gate
galaxy.meta.planetCount         // 2
galaxy.meta.stationCount        // 1
galaxy.meta.galaxyRadius        // 449.44
galaxy.meta.formatVersion       // 2

// And the defaults, for what you left out:
galaxy.systems[0].planets[0].angle   // 0 — "starts where the axis points"
galaxy.systems[1].star.name          // 'Vega' — falls back to the system name`}
      />

      <P>
        One rule governs all of it, and it is worth committing to memory because it predicts the
        entire API:
      </P>

      <Quote>Compute what is derivable. Never invent a value that carries meaning.</Quote>

      <P>
        An id, a counter, a distance, a system&apos;s edge — all of those follow from what you
        wrote, so the library fills them in. A planet&apos;s <C>type</C>, a system&apos;s{' '}
        <C>faction</C>, a field&apos;s <C>richness</C> do not follow from anything, so they stay{' '}
        <C>undefined</C>. The library will never quietly decide your world is &ldquo;rocky&rdquo;.
      </P>

      <Callout tone="warning" title="Derived ids can collide">
        The pattern is <C>{`<parent>-p<rank>`}</C>. If you give one planet the explicit id{' '}
        <C>sol-p1</C> and let another land on that name by position, validation catches it and
        throws. Give explicit ids to the objects your game refers to by name — they read better in
        save files anyway.
      </Callout>

      <H2 id="query">Ask it questions</H2>
      <P>
        A <C>Galaxy</C> is a tree, which is excellent for serializing and awkward for lookups. The
        query helpers build the indexes a game needs constantly.
      </P>

      <P>
        <strong>Build the index once</strong> and keep it. Every call walks the whole universe, so
        doing it per frame is the one performance mistake that is easy to make here.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { indexGalaxy, findRoute, systemOf, stationsOf } from '@cotontigeh/starmap'

const index = indexGalaxy(galaxy)   // built once, kept around
index.size                          // 8 — every object, all kinds mixed

// Each entry carries its kind, so a check narrows the type with no cast.
const entry = index.get('sol-p1-st0')
if (entry?.kind === 'station') {
  entry.obj.docks       // 8 — typed as Station here
  entry.systemId        // 'sol'
}

// Shortest path, weighted by lane length.
findRoute(galaxy, 'sol', 'vega')
// { systemIds: ['sol', 'vega'], distance: 449.44, jumps: 1 }

// Which system does this object belong to? Works for any id.
systemOf(galaxy, 'sol-p1')?.name    // 'Sol'
systemOf(index, 'sol-p1')?.name     // same answer, no rescan — prefer this

// Every station in a system, across all its planets.
stationsOf(galaxy.systems[0]).map((s) => s.name)   // ['High Anchorage']`}
      />

      <Callout tone="tip" title="systemOf takes the index too">
        Passing the <C>Galaxy</C> re-indexes the whole universe on every call. Passing the{' '}
        <C>GalaxyIndex</C> is a map lookup. In a render loop, always pass the index.
      </Callout>

      <H2 id="animate">Make it move</H2>
      <P>
        Orbits are computed, never stored. You give a time <C>t</C> in seconds and get back where
        everything is at that instant.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { systemPositions } from '@cotontigeh/starmap'

const at = systemPositions(galaxy.systems[0], 6)   // t = 6 seconds
at.get('sol-p0')        // { x: -90, y: 0 }  — Aurelia, half way round its 12s orbit
at.get('sol-p1-st0')    // { x: -89, y: 129.9 } — the station, carried by its planet`}
      />

      <P>
        Notice the station. Its position is <strong>relative to its planet</strong>, so it follows
        Vesper around while turning on its own four-second orbit. You never compute that yourself.
      </P>

      <P>Which makes a render loop about as simple as it can be:</P>

      <CodeBlock
        lang="ts"
        code={`let t = 0

function frame(dt: number) {
  t += dt
  const at = systemPositions(system, t)

  for (const planet of system.planets) {
    const { x, y } = at.get(planet.id)!
    drawPlanet(x, y, planet.radius)   // your renderer, your rules
  }

  requestAnimationFrame(() => frame(1 / 60))
}`}
      />

      <Callout tone="note" title="Nothing to cache">
        One call costs a single pass over the objects of one system — a few dozen. Call it every
        frame and move on; memoising it would cost more than it saves.
      </Callout>

      <P>
        A <C>period</C> of <C>0</C> means &ldquo;never moves&rdquo;, which is the default. A static
        system is not a special case — it is just a universe where nothing has a period.
      </P>

      <H2 id="safety-net">The safety net</H2>
      <P>
        <C>createGalaxy()</C> validates what it built, so a structurally broken <C>Galaxy</C> is not
        a state you can reach through the front door. Try a dangling reference:
      </P>

      <CodeBlock
        lang="ts"
        code={`createGalaxy({
  systems: [{ id: 'sol', name: 'Sol', x: 0, y: 0, star: { radius: 18 } }],
  lanes: [{ from: 'sol', to: 'nowhere' }],
})

// GalaxyValidationError: Invalid universe (1 problem(s)):
//   • lanes[0].to: unknown system: "nowhere"`}
      />

      <P>
        The error carries <C>issues</C>, an array of <C>{`{ path, message }`}</C> — every problem,
        located precisely. That is the point: fixing five mistakes should take one run, not five.
      </P>

      <P>
        TypeScript&apos;s guarantees do not survive <C>JSON.parse</C>, so there is a non-throwing
        version for data coming back from disk or from a server:
      </P>

      <CodeBlock
        lang="ts"
        code={`import { validateGalaxy, type Galaxy } from '@cotontigeh/starmap'

const galaxy = JSON.parse(saveFile) as Galaxy
const issues = validateGalaxy(galaxy)      // never throws, whatever you pass it

if (issues.length) {
  console.error('This save is not loadable:', issues)
}`}
      />

      <P>
        One last check, and it is the one people forget. The library verifies that your{' '}
        <em>references</em> resolve; it does not decide whether your <em>network</em> makes sense. A
        system nobody can fly to is valid data and a broken game:
      </P>

      <CodeBlock
        lang="ts"
        code={`import { connectedComponents } from '@cotontigeh/starmap'

const parts = connectedComponents(galaxy)  // [['sol', 'vega']] — one group, healthy

if (parts.length > 1) {
  throw new Error(\`Stranded systems: \${parts.slice(1).flat().join(', ')}\`)
}`}
      />

      <Callout tone="warning" title="Run this once, at build time">
        Connectivity is exactly the kind of bug that survives every test and shows up in a playtest.
        Assert it where you generate or load your universe, not in the render loop.
      </Callout>

      <H2 id="recap">What you just learned</H2>
      <P>That is the whole library, in one sitting. You now know how to:</P>

      <UL>
        <LI>
          describe a universe as a typed object, and let <C>createGalaxy()</C> complete and check
          it;
        </LI>
        <LI>
          tell what is <strong>derived</strong> from what is <strong>yours to decide</strong>;
        </LI>
        <LI>build an index once and use it to look anything up by id, in any direction;</LI>
        <LI>turn a time value into positions, with stations carried by their planets;</LI>
        <LI>catch broken data at the door, and stranded systems before a player finds them.</LI>
      </UL>

      <P>Where to go next, depending on what you are doing:</P>

      <UL>
        <LI>
          <A href={routes.page('starmap', 'data-model')}>Data model</A> — every field of every
          object, what is required, and what gets filled in.
        </LI>
        <LI>
          <A href={routes.page('starmap', 'querying')}>Querying a galaxy</A> — the index, routes and
          neighbours in depth, with their costs.
        </LI>
        <LI>
          <A href={routes.page('starmap', 'randomness')}>Deterministic randomness</A> — if you want
          to generate universes from a seed rather than write them by hand.
        </LI>
        <LI>
          <A href={routes.page('starmap', 'recipes')}>Recipes</A> — save files, game state, colours,
          scaling up.
        </LI>
      </UL>
    </>
  )
}
