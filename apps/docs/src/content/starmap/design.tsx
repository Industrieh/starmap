import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { A, C, H2, H3, LI, Lead, P, Quote, UL } from '@/components/docs/prose'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'pipeline', title: 'The shape of it', depth: 2 },
  { id: 'no-generate', title: 'It does not generate', depth: 2 },
  { id: 'no-draw', title: 'It does not draw', depth: 2 },
  { id: 'no-judge', title: 'It checks, but does not judge', depth: 2 },
  { id: 'accepted', title: 'What is accepted', depth: 3 },
  { id: 'all-errors', title: 'Every error, not the first', depth: 3 },
  { id: 'frozen', title: 'Frozen terrain', depth: 2 },
  { id: 'tradeoffs', title: 'What this costs you', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        Why the library draws its lines where it does — and, just as usefully, what it gives up in
        exchange.
      </Lead>

      <H2 id="pipeline">The shape of it</H2>
      <P>The whole library is one pass with no state and no side effects:</P>

      <CodeBlock
        lang="bash"
        noCopy
        code={`     GalaxyInput  (your object)
            │
            ▼
     normalize  ──────────►  derived ids, empty collections,
                             index, planetId, lengths, outerLimit, meta
            │
            ▼
     validate  ───────────►  GalaxyIssue[]  →  GalaxyValidationError
            │
            ▼
         Galaxy  ──────────►  queries    (indexes, neighbours, routes)
                       └────►  geometry  (positions at time t)`}
      />

      <P>
        <C>createGalaxy()</C> reads no clock, calls no <C>Math.random()</C>, touches no filesystem,
        and does not mutate the object you hand it — nor keep any part of it: every object and array
        is copied, so the galaxy shares nothing with your description. Call it twice on the same
        input and you get two equal galaxies. Everything downstream is a pure read.
      </P>

      <H2 id="no-generate">It does not generate</H2>
      <P>
        Procedural generation is <strong>game design</strong>, not infrastructure. The shape of a
        galaxy, the faction table, how many planets a system gets — those are decisions about your
        game.
      </P>

      <P>Building them into a library leaves two bad options:</P>

      <UL>
        <LI>
          <strong>expose every knob</strong>, until configuring the generator is harder than writing
          the twenty lines it replaced;
        </LI>
        <LI>
          <strong>pick one universe for everybody</strong>, which is fine until your game needs a
          different one.
        </LI>
      </UL>

      <P>
        So <C>createGalaxy()</C> takes the finished description, and the script that builds it lives
        in your app. What the library keeps is the one genuinely reusable piece of a generator:{' '}
        <A href={routes.page('starmap', 'randomness')}>a seeded PRNG</A>.
      </P>

      <H2 id="no-draw">It does not draw</H2>
      <P>
        No components, no hooks, no stylesheet — and, less obviously,{' '}
        <strong>no display fields in the data model</strong>. There is no <C>color</C>, no{' '}
        <C>typeName</C>, no drawable shape.
      </P>

      <P>
        A colour in the model looks convenient and forces a UI decision at the moment you are
        describing your world. It also stops being usable the day the project needs a dark theme, a
        colourblind mode, or a fixed brand palette. The mapping is one line, written where the
        context to write it exists:
      </P>

      <CodeBlock
        lang="ts"
        code={`const COLORS: Record<string, string> = { terran: '#4fae6a', gas: '#d8a06a' }`}
      />

      <P>
        What stays in the model are <strong>facts about the world</strong>: geometry, topology,
        identity, and gameplay attributes like <C>security</C>, <C>docks</C>, <C>habitable</C>,{' '}
        <C>resources</C>, <C>richness</C>. Nothing that assumes how you look at them.
      </P>

      <Callout tone="note" title="Two mechanisms enforce this, so it does not rely on review">
        A purity test walks every source file and rejects non-relative imports, browser globals,{' '}
        <C>Math.random</C>, <C>Date</C>, and any trace of <C>color</C>, <C>#rrggbb</C>, <C>svg</C>,{' '}
        <C>canvas</C> or <C>viewBox</C>. And the TypeScript config drops <C>DOM</C> from <C>lib</C>,
        so a stray <C>document.</C> does not even compile.
      </Callout>

      <H2 id="no-judge">It checks, but does not judge</H2>
      <P>
        Validation covers <strong>structural and referential integrity</strong> — the things that
        are unambiguously broken:
      </P>

      <UL>
        <LI>
          the format: a galaxy built for another <C>FORMAT_VERSION</C> is reported as such — one
          issue, and nothing else checked, because its shape belongs to another contract;
        </LI>
        <LI>
          runtime types and shapes: <C>x</C> really is a finite number, <C>name</C> a non-empty
          string, <C>planets</C> an array of objects;
        </LI>
        <LI>ids unique across the whole galaxy, hyperlanes and local routes included;</LI>
        <LI>
          documented ranges: <C>security</C> and <C>density</C> in <C>[0, 1]</C>, <C>arcSweep</C> in{' '}
          <C>[0, 360]</C>, radii and orbits strictly positive;
        </LI>
        <LI>
          every reference by id resolves to an object that exists and has the right kind — and a
          hyperlane or a local route never links something to itself;
        </LI>
        <LI>
          the counters in <C>meta</C> match the real contents.
        </LI>
      </UL>

      <H3 id="accepted">What is accepted</H3>
      <P>
        Everything else. Orbits that shrink as they go outward, planets that overlap, a gate inside
        its own star, a network split in two — all of it passes.
      </P>

      <Quote>
        Those are design choices, and they are yours to make. A library that rejects a
        &ldquo;wrong&rdquo; universe is a library that decides what your game is about.
      </Quote>

      <P>
        The one you most likely care about is connectivity — and because it is a judgement call, it
        is offered as a question rather than enforced as a rule:
      </P>

      <CodeBlock
        lang="ts"
        code={`const parts = connectedComponents(galaxy)
if (parts.length > 1) throw new Error('Stranded systems')   // your rule, your call`}
      />

      <H3 id="all-errors">Every error, not the first</H3>
      <P>
        <C>GalaxyValidationError.issues</C> holds <em>all</em> the problems found, each with the
        path of the offending value. Fixing five mistakes should take one run, not five.
      </P>

      <CodeBlock
        lang="ts"
        code={`// GalaxyValidationError: Invalid universe (3 problem(s)):
//   • systems[0].planets[1].orbit: must be strictly positive
//   • systems[2].id: duplicate id: "vega"
//   • lanes[4].to: unknown system: "nowhere"`}
      />

      <H2 id="frozen">Frozen terrain</H2>
      <P>
        A <C>Galaxy</C> describes what the world <em>is</em>, never what is happening in it. No
        ownership, no stock, no visited flag.
      </P>

      <P>That single rule pays for itself repeatedly:</P>

      <UL>
        <LI>
          <strong>an index never goes stale</strong>, because the thing it indexes never changes;
        </LI>
        <LI>
          <strong>a save file is small</strong> — your state, not a copy of the universe;
        </LI>
        <LI>
          <strong>a generated universe rebuilds from its seed</strong>, so you can ship the recipe
          instead of the result;
        </LI>
        <LI>
          <strong>nothing needs to be defensively cloned</strong>, because nothing writes — and{' '}
          <C>createGalaxy()</C> copies every object and array of your description, so the galaxy
          cannot change behind your back when that description does.
        </LI>
      </UL>

      <P>
        The practical shape of this is in{' '}
        <A href={routes.page('starmap', 'recipes')}>Keep game state alongside</A>.
      </P>

      <H2 id="tradeoffs">What this costs you</H2>
      <P>
        Every one of these lines buys something and costs something. Being honest about the second
        half:
      </P>

      <UL>
        <LI>
          <strong>You write the generator.</strong> There is no <C>generateGalaxy(seed, 40)</C> to
          call on day one. The Quickstart is longer than it would be otherwise.
        </LI>
        <LI>
          <strong>You write the renderer</strong>, or reach for{' '}
          <A href={routes.library('starmap-render')}>starmap-render</A>. The library hands you
          numbers, not pixels.
        </LI>
        <LI>
          <strong>An invalid-but-accepted universe is on you.</strong> Overlapping orbits will not
          be caught. If your game cares, assert it yourself.
        </LI>
        <LI>
          <strong>Circles only.</strong> No ellipses, no inclination, no n-body anything. If you are
          writing an orbital-mechanics simulator, this is the wrong model.
        </LI>
      </UL>

      <P>
        If those trades sound wrong for what you are building, that is useful information early —
        which is the point of writing them down.
      </P>
    </>
  )
}
