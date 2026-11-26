import { findRoute } from '@industrieh/starmap'
import {
  renderGalaxy,
  renderSystem,
  SYSTEM_MARGIN,
  systemViewBox,
  viewBoxAttr,
} from '@industrieh/starmap-render'
import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { A, C, H2, LI, Lead, P, Quote, UL } from '@/components/docs/prose'
import { RenderCompare, RenderPreview } from '@/components/docs/render-preview'
import { Step, Steps } from '@/components/docs/steps'
import type { TocEntry } from '@/content/registry'
import { FIXTURE_SOURCE, GALAXY, SOL } from '@/content/starmap-render/fixture'
import { routes } from '@/lib/routes'
import { outlineSvg } from '@/lib/svg-outline'

/**
 * Every drawing on this page, rendered at build time.
 *
 * Each names its own `idPrefix`. A system's default prefix comes from its id, so
 * two *different* systems never collide — but these all draw the same Sol, one of
 * them recoloured, and the same system twice on a page is exactly the case where
 * two drawings would share gradient ids (see the Framing page).
 */
const FIRST = renderSystem(SOL, { t: 3, idPrefix: 'qs-first' })
const MOVED = renderSystem(SOL, { t: 16, idPrefix: 'qs-moved' })
const MAP = renderGalaxy(GALAXY, {
  highlight: findRoute(GALAXY, 'altair', 'lyra')?.systemIds,
  idPrefix: 'qs-map',
})
const RECOLOURED = renderSystem(SOL, {
  t: 3,
  idPrefix: 'qs-recoloured',
  theme: { background: '#0b0f0d', planets: { terran: '#7ee787', rocky: '#8b949e' } },
})

/**
 * "What came out", folded from the real output of the very call the page shows
 * — `renderSystem(galaxy.systems[0], { t: 3 })` — rather than typed next to it.
 * The planets layer is opened one level, to show the objects inside a layer.
 */
const LISTING = outlineSvg(renderSystem(SOL, { t: 3 }), (tag) =>
  tag.includes('data-layer="planets"'),
)

export const toc: readonly TocEntry[] = [
  { id: 'mental-model', title: 'The mental model', depth: 2 },
  { id: 'first', title: 'Your first drawing', depth: 2 },
  { id: 'inside', title: 'What came out', depth: 2 },
  { id: 'move', title: 'Make it move', depth: 2 },
  { id: 'galaxy', title: 'Draw the whole map', depth: 2 },
  { id: 'colours', title: 'Change a colour', depth: 2 },
  { id: 'recap', title: 'What you just learned', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        Ten minutes from a galaxy to a picture that moves. Every string and number on this page is
        real — it came from running the code.
      </Lead>

      <H2 id="mental-model">The mental model</H2>
      <P>One idea, and it explains every decision in this package:</P>

      <Quote>
        It is a function from data to a string. It draws one frame, for one moment, and hands it
        back. What happens to that string is entirely yours.
      </Quote>

      <P>Three consequences worth having in mind before you start:</P>

      <UL>
        <LI>
          <strong>No components.</strong> A component would pick a framework for you. A string goes
          in a file, a page, a <C>data:</C> URI, a server response, a worker message.
        </LI>
        <LI>
          <strong>No interaction.</strong> Pan, zoom, hover, selection and the clock are application
          state. The package gives you the hooks —{' '}
          <A href={routes.page('starmap-render', 'interactivity')}>
            <C>data-id</C>, <C>data-kind</C>, <C>data-layer</C>
          </A>{' '}
          — and stays out of the way.
        </LI>
        <LI>
          <strong>Same input, same bytes.</strong> No clock, no unseeded randomness. Which means you
          can cache it, diff it, or snapshot-test it.
        </LI>
      </UL>

      <H2 id="first">Your first drawing</H2>

      <Steps>
        <Step title="Build a universe">
          <P>
            The renderer draws what the core produces, so everything starts with a <C>Galaxy</C>. If
            this part is unfamiliar, the{' '}
            <A href={routes.page('starmap', 'quickstart')}>core Quickstart</A> covers it.
          </P>
          {/* FIXTURE_SOURCE rather than a literal: this is the universe every
              drawing below is actually made from, so the two cannot drift. */}
          <CodeBlock lang="ts" filename="universe.ts" code={FIXTURE_SOURCE} />
        </Step>

        <Step title="Draw one system">
          <P>One call. It returns a complete, standalone SVG document.</P>
          <CodeBlock
            lang="ts"
            code={`import { renderSystem } from '@industrieh/starmap-render'

const svg = renderSystem(galaxy.systems[0], { t: 3 })`}
          />
          <RenderPreview
            svg={FIRST}
            alt="The Sol system at t = 3: a yellow star, two planets on their orbits, an asteroid belt, a cluster and a gate."
            height="lg"
            caption="That string, rendered. Every drawing on this page was produced by the call above it while the page was being built — none of them is a screenshot."
          />
        </Step>

        <Step title="Put it somewhere">
          <P>
            Because it is a string, there is no single right answer — pick whichever fits where you
            are:
          </P>
          <CodeBlock
            lang="ts"
            code={`// A file
await Bun.write('sol.svg', svg)

// A page
container.innerHTML = svg

// An <img>, with no parsing at all
img.src = \`data:image/svg+xml;utf8,\${encodeURIComponent(svg)}\`

// A server response
return new Response(svg, { headers: { 'content-type': 'image/svg+xml' } })`}
          />
          <Callout tone="tip" title="Give it a size, or let it fill its box">
            By default the drawing carries no <C>width</C> or <C>height</C>, so it fills whatever
            container it is put in. Pass them when you need a fixed size —{' '}
            <C>{`renderSystem(system, { width: 700, height: 700 })`}</C>.
          </Callout>
        </Step>
      </Steps>

      <H2 id="inside">What came out</H2>
      <P>
        Open the string and it is readable. Here it is, with the content of each layer folded away —
        the real output of the call above, not a retyped copy:
      </P>

      <CodeBlock lang="xml" noCopy code={LISTING} />

      <P>Three things in there are worth noticing right away.</P>

      <P>
        <strong>
          The <C>viewBox</C> is in world units, not pixels.
        </strong>{' '}
        Sol&apos;s <C>outerLimit</C> is <C>{SOL.outerLimit}</C>, and the default margin adds{' '}
        {Math.round(SYSTEM_MARGIN * 100)}% — hence <C>{viewBoxAttr(systemViewBox(SOL))}</C>. Nothing
        in this package is ever converted to pixels, which is exactly why the same string works as a
        32-pixel thumbnail and as a full-screen map.
      </P>

      <P>
        <strong>Every layer and every object is labelled.</strong> <C>data-layer</C> on the groups,{' '}
        <C>data-kind</C> and <C>data-id</C> on the objects. That is the entire interaction API — one{' '}
        <C>querySelector</C> and you have your planet.
      </P>

      <P>
        <strong>Empty layers do not exist.</strong> A system with no asteroid fields produces no{' '}
        <C>fields</C> group at all, rather than an empty one. Sol has something in every layer, so
        all of them are above; Rigel, which has nothing but its star, comes out as the gradients,
        the background, the backdrop and the star — and nothing else.
      </P>

      <H2 id="move">Make it move</H2>
      <P>
        <C>t</C> is simulation time in seconds, and it is the only thing that changes between
        frames. Nothing is stored — render at <C>t</C>, render again at <C>t + dt</C>, and the
        planets have moved.
      </P>

      <CodeBlock
        lang="ts"
        filename="animate.ts"
        code={`import { renderSystemContent, systemViewBox, viewBoxAttr } from '@industrieh/starmap-render'

// The framing does not change, so compute it once.
const box = viewBoxAttr(systemViewBox(system))
let t = 0

function frame() {
  t += 1 / 60
  // Only the layers — the application owns the <svg> element.
  container.innerHTML = \`<svg viewBox="\${box}">\${renderSystemContent(system, { t })}</svg>\`
  requestAnimationFrame(frame)
}

frame()`}
      />

      <RenderCompare
        left={{
          svg: FIRST,
          alt: 'The Sol system at t = 3.',
          label: <>The same system at t = 3.</>,
        }}
        right={{
          svg: MOVED,
          alt: 'The Sol system at t = 16: the planets and the station have moved along their orbits.',
          label: (
            <>
              And at t = 16 — Aurelia has come round, Vesper has moved on, and its station went with
              it.
            </>
          ),
        }}
      />

      <Callout tone="note" title="Content, or document?">
        <C>renderSystem()</C> gives you a whole <C>&lt;svg&gt;</C> — right for a file or an{' '}
        <C>&lt;img&gt;</C>. <C>renderSystemContent()</C> gives you the layers alone, so <em>you</em>{' '}
        own the root element and its <C>viewBox</C> — which is what pan and zoom need. Same drawing,
        two wrappings.
      </Callout>

      <Callout tone="warning" title="Rebuilding a string every frame is not free">
        It is fine for one system at sixty frames a second, and it is not fine for a dozen. If you
        get there, redraw only what moves — the <C>layers</C> option draws just <C>routes</C> and{' '}
        <C>planets</C>, the only two that depend on <C>t</C> — or keep the SVG in the DOM and move
        the groups by their <C>data-id</C>.{' '}
        <A href={`${routes.page('starmap-render', 'interactivity')}#perf`}>Making it interactive</A>{' '}
        shows both.
      </Callout>

      <H2 id="galaxy">Draw the whole map</H2>
      <P>
        The other renderer. Systems become dots, hyperlanes become the network between them, and{' '}
        <strong>nothing moves</strong> — at galaxy scale a planet is smaller than a rounding error,
        so this drawing takes no <C>t</C> at all.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { findRoute } from '@industrieh/starmap'
import { renderGalaxy } from '@industrieh/starmap-render'

const route = findRoute(galaxy, 'altair', 'lyra')

const map = renderGalaxy(galaxy, {
  highlight: route?.systemIds,   // exactly what findRoute returns
})`}
      />

      <RenderPreview
        svg={MAP}
        alt="The galaxy map with the route from Altair to Lyra highlighted: Altair, Sol, Rigel and Lyra are ringed in the highlight colour, Vega is not."
        height="lg"
        caption={
          <>
            The route from Altair to Lyra, brought forward. Every system carries a ring: dashed and
            in its faction&apos;s colour normally, solid and in the highlight colour when it is on
            the path. Vega is the only one here that is not.
          </>
        }
      />

      <P>
        <C>highlight</C> takes an ordered list of system ids. Every listed system is brought
        forward, and so is every lane between two <em>consecutive</em> entries — which is why the
        order matters: <C>[&apos;a&apos;, &apos;b&apos;]</C> lights the lane between them,{' '}
        <C>[&apos;a&apos;, &apos;z&apos;]</C> lights nothing if they are not neighbours.
      </P>

      <H2 id="colours">Change a colour</H2>
      <P>
        The theme is a parameter, and it is <strong>merged</strong> over the default one. Changing
        one colour does not mean restating the other twenty.
      </P>

      <CodeBlock
        lang="ts"
        code={`const svg = renderSystem(system, {
  t: 3,
  theme: { background: '#0b0f0d', planets: { terran: '#7ee787', rocky: '#8b949e' } },
})

// background  → '#0b0f0d'   your value
// terran      → '#7ee787'   your value
// rocky       → '#8b949e'   your value
// gas         → '#d8a06a'   still the default — tables merge key by key`}
      />

      <RenderCompare
        left={{
          svg: FIRST,
          alt: 'The Sol system in the default theme.',
          label: <>The default theme.</>,
        }}
        right={{
          svg: RECOLOURED,
          alt: 'The Sol system recoloured: a near-black green background, a green terran planet and a grey rocky one.',
          label: (
            <>
              Three values changed — the background, and two planet colours. Everything else,
              including the star and the orbits, is still the default.
            </>
          ),
        }}
      />

      <Callout tone="tip" title="Every table has a default entry">
        The core&apos;s vocabularies are open unions: a project can invent{' '}
        <C>type: &apos;shattered&apos;</C> and the model accepts it. A colour table therefore cannot
        be exhaustive, and every one of them carries a <C>default</C> used for any key it does not
        list. That is why a drawing is never missing a colour.
      </Callout>

      <H2 id="recap">What you just learned</H2>
      <UL>
        <LI>
          <C>renderSystem()</C> and <C>renderGalaxy()</C> return complete SVG documents;
        </LI>
        <LI>
          the <C>…Content()</C> pair returns the layers alone, for when you own the root element;
        </LI>
        <LI>
          <C>t</C> is the only thing that changes between frames, and nothing is stored;
        </LI>
        <LI>
          <C>data-layer</C>, <C>data-kind</C> and <C>data-id</C> are how an application finds
          anything;
        </LI>
        <LI>the theme merges over the default, table by table, key by key.</LI>
      </UL>

      <P>Where to go next:</P>
      <UL>
        <LI>
          <A href={routes.page('starmap-render', 'drawing')}>Drawing</A> — the layers, and how each
          object is constructed.
        </LI>
        <LI>
          <A href={routes.page('starmap-render', 'theming')}>Theming</A> — every colour, with its
          default.
        </LI>
        <LI>
          <A href={routes.page('starmap-render', 'interactivity')}>Making it interactive</A> —
          click, hover, pan and zoom.
        </LI>
      </UL>
    </>
  )
}
