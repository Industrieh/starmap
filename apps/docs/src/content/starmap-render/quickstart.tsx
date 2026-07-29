import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { A, C, H2, LI, Lead, P, Quote, UL } from '@/components/docs/prose'
import { Step, Steps } from '@/components/docs/steps'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

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
          <CodeBlock
            lang="ts"
            filename="draw.ts"
            code={`import { createGalaxy } from '@cotontigeh/starmap'

const galaxy = createGalaxy({
  systems: [
    {
      id: 'sol', name: 'Sol', x: 0, y: 0,
      star: { class: 'G', radius: 18 },
      planets: [
        { name: 'Aurelia', type: 'rocky', orbit: 90, radius: 5, period: 12 },
        { name: 'Vesper', type: 'terran', orbit: 150, radius: 6, angle: 30, period: 24,
          habitable: true,
          stations: [{ name: 'High Anchorage', type: 'trade', orbit: 14, period: 4 }] },
      ],
      gates: [{ name: 'Sol Gate', orbit: 300, angle: 45, links: ['vega'] }],
    },
    { id: 'vega', name: 'Vega', x: 420, y: 160, star: { class: 'A', radius: 22 } },
  ],
  lanes: [{ from: 'sol', to: 'vega' }],
})`}
          />
        </Step>

        <Step title="Draw one system">
          <P>One call. It returns a complete, standalone SVG document.</P>
          <CodeBlock
            lang="ts"
            code={`import { renderSystem } from '@cotontigeh/starmap-render'

const svg = renderSystem(galaxy.systems[0], { t: 3 })

svg.length   // 17647 — a string, nothing more`}
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
      <P>Open the string and it is readable. Here is how it starts:</P>

      <CodeBlock
        lang="ts"
        noCopy
        code={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-435 -435 870 870"
     width="700" height="700" preserveAspectRatio="xMidYMid meet" role="img">
<title>Sol</title>
<defs>…</defs>
<rect x="-1305" y="-1305" width="2610" height="2610" fill="#070b16"/>
<g data-layer="backdrop">…</g>
<g data-layer="orbits">…</g>
<g data-layer="planets">
  <g data-kind="planet" data-id="sol-p1">…</g>
</g>
<g data-layer="gates">…</g>
</svg>`}
      />

      <P>Three things in there are worth noticing right away.</P>

      <P>
        <strong>
          The <C>viewBox</C> is in world units, not pixels.
        </strong>{' '}
        Sol&apos;s <C>outerLimit</C> is <C>300</C>, and the default margin adds 45% — hence{' '}
        <C>-435 -435 870 870</C>. Nothing in this package is ever converted to pixels, which is
        exactly why the same string works as a 32-pixel thumbnail and as a full-screen map.
      </P>

      <P>
        <strong>Every layer and every object is labelled.</strong> <C>data-layer</C> on the groups,{' '}
        <C>data-kind</C> and <C>data-id</C> on the objects. That is the entire interaction API — one{' '}
        <C>querySelector</C> and you have your planet.
      </P>

      <P>
        <strong>Empty layers do not exist.</strong> A system with no asteroid fields produces no{' '}
        <C>fields</C> group at all, rather than an empty one. In the document above there is no{' '}
        <C>routes</C> layer, because that system declares no local routes.
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
        code={`import { renderSystemContent, systemViewBox, viewBoxAttr } from '@cotontigeh/starmap-render'

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

      <Callout tone="note" title="Content, or document?">
        <C>renderSystem()</C> gives you a whole <C>&lt;svg&gt;</C> — right for a file or an{' '}
        <C>&lt;img&gt;</C>. <C>renderSystemContent()</C> gives you the layers alone, so <em>you</em>{' '}
        own the root element and its <C>viewBox</C> — which is what pan and zoom need. Same drawing,
        two wrappings.
      </Callout>

      <Callout tone="warning" title="Rebuilding a string every frame is not free">
        It is fine for one system at sixty frames a second, and it is not fine for a dozen. If you
        get there, keep the SVG in the DOM and move the groups by their <C>data-id</C> instead of
        re-rendering — <A href={routes.page('starmap-render', 'recipes')}>Recipes</A> shows both.
      </Callout>

      <H2 id="galaxy">Draw the whole map</H2>
      <P>
        The other renderer. Systems become dots, hyperlanes become the network between them, and{' '}
        <strong>nothing moves</strong> — at galaxy scale a planet is smaller than a rounding error,
        so this drawing takes no <C>t</C> at all.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { findRoute } from '@cotontigeh/starmap'
import { renderGalaxy } from '@cotontigeh/starmap-render'

const route = findRoute(galaxy, 'sol', 'vega')

const map = renderGalaxy(galaxy, {
  highlight: route?.systemIds,   // exactly what findRoute returns
})`}
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
  theme: { background: '#000', planets: { terran: '#7ee787' } },
})

// background  → '#000'      your value
// terran      → '#7ee787'   your value
// gas         → '#d8a06a'   still the default — tables merge key by key`}
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
