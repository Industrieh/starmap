import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { A, C, H2, LI, Lead, P, Quote, UL } from '@/components/docs/prose'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'strings', title: 'Strings, not components', depth: 2 },
  { id: 'no-interaction', title: 'No interaction', depth: 2 },
  { id: 'pure', title: 'A drawing is a pure function', depth: 2 },
  { id: 'separate', title: 'Why two packages', depth: 2 },
  { id: 'svg', title: 'Why SVG', depth: 2 },
  { id: 'tradeoffs', title: 'What this costs you', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        Four decisions shape this package, and each one closes a door on purpose. Here is what is
        behind each door, and what you get for not opening it.
      </Lead>

      <H2 id="strings">Strings, not components</H2>
      <P>
        The obvious API would be{' '}
        <C>
          &lt;StarSystem system={'{'}sol{'}'} /&gt;
        </C>
        . It would also pick a framework for you, and then a version of it, and then a rendering
        model.
      </P>

      <Quote>A component is consumed in one place. A string is consumed everywhere.</Quote>

      <P>What a string buys, concretely:</P>

      <UL>
        <LI>
          <strong>It works on a server.</strong> No DOM, no jsdom, no headless browser — render
          where the data is and send an image.
        </LI>
        <LI>
          <strong>It works in a worker.</strong> Off the main thread, for a galaxy big enough to
          matter.
        </LI>
        <LI>
          <strong>It works as a file.</strong> A build script that writes assets needs no runtime at
          all.
        </LI>
        <LI>
          <strong>It works in every framework</strong>, including the one you switch to next year.
        </LI>
      </UL>

      <P>
        The cost is one line of glue at the boundary — <C>innerHTML</C>,{' '}
        <C>dangerouslySetInnerHTML</C>, <C>Bun.write</C>. See{' '}
        <A href={`${routes.page('starmap-render', 'framing')}#embedding`}>Four ways to embed it</A>.
      </P>

      <H2 id="no-interaction">No interaction</H2>
      <P>
        Pan, zoom, selection, hover, the clock — none of it is here. Not because it is hard, but
        because it is <strong>application state</strong>, and every project holds it differently:
        React state, a store, a game loop, a server session.
      </P>

      <P>
        A package that owned the camera would have to own the event handling, then the state
        container, then the framework. So instead it draws <strong>one frame for one moment</strong>{' '}
        and labels everything it draws:
      </P>

      <CodeBlock
        lang="ts"
        noCopy
        code={`<g data-layer="planets">
  <g data-kind="planet" data-id="sol-p1">…</g>
</g>`}
      />

      <P>
        Three attributes are the whole interaction API. They are enough for click, hover, selection,
        layer toggling and pan-zoom — the{' '}
        <A href={routes.page('starmap-render', 'interactivity')}>guide</A> builds all five, and none
        of them needs the package to change.
      </P>

      <H2 id="pure">A drawing is a pure function</H2>
      <P>
        Same data, same <C>t</C>, same theme, same string — byte for byte. No clock, no{' '}
        <C>Math.random()</C>, no ambient state anywhere in the package.
      </P>

      <P>That is not purity for its own sake. It is what makes four things possible:</P>

      <UL>
        <LI>
          <strong>caching</strong>, including HTTP caching, because the same request really does
          produce the same bytes;
        </LI>
        <LI>
          <strong>snapshot tests</strong>, which would be worthless against a moving target;
        </LI>
        <LI>
          <strong>diffing two drawings</strong> to see what a change did;
        </LI>
        <LI>
          <strong>a server and a client agreeing</strong> without exchanging anything but <C>t</C>.
        </LI>
      </UL>

      <Callout tone="note" title="Even the backdrop is deterministic">
        The decorative star field is seeded, so it does not flicker between frames. And it runs on{' '}
        <em>its own</em> seed rather than the galaxy&apos;s — otherwise changing the number of
        background stars would shift the whole universe a generator produced.
      </Callout>

      <H2 id="separate">Why two packages</H2>
      <P>One line, and it is the reason this package exists at all:</P>

      <Quote>No colour in the core, and no world fact in the theme.</Quote>

      <P>
        A <C>color</C> field in the model looks convenient and forces a UI decision at the moment
        you are describing your world. It stops being usable the day the project needs a light
        theme, a colourblind mode, or a brand palette — and by then it is in every save file.
      </P>

      <P>
        The other direction matters just as much. This package never asks for a field to be added to
        the model for the sake of a drawing. If a value describes the universe, it belongs to the
        core; if it describes the picture, it belongs to the theme.
      </P>

      <Callout tone="note" title="Two mechanisms enforce it, so it does not rely on review">
        A purity test walks every source file and rejects any import that is not the core or a
        relative path, plus browser globals, <C>Math.random</C> and <C>Date</C>. And the TypeScript
        config drops <C>DOM</C> from <C>lib</C>, so a stray <C>document.</C> does not compile.
      </Callout>

      <H2 id="svg">Why SVG</H2>
      <P>
        Canvas would be the other obvious choice. SVG wins here for reasons that are specific to
        what this draws:
      </P>

      <UL>
        <LI>
          <strong>It is text.</strong> Which is what makes the whole strings-not-components decision
          available in the first place.
        </LI>
        <LI>
          <strong>It scales for free.</strong> One document is a thumbnail and a wall map — the{' '}
          <C>viewBox</C> does the work, and zooming costs one attribute write.
        </LI>
        <LI>
          <strong>It is inspectable.</strong> <C>data-id</C> in the DOM means the browser does your
          hit-testing. On a canvas you would write that yourself, in world coordinates, per object.
        </LI>
        <LI>
          <strong>It is accessible.</strong> A <C>&lt;title&gt;</C> and a <C>role</C> are announced.
          A canvas is an opaque rectangle.
        </LI>
      </UL>

      <P>
        Canvas wins on raw object count. If you are drawing a hundred thousand stars at sixty frames
        a second, this is the wrong tool — and the core, which knows nothing about rendering, is
        still the right one.
      </P>

      <H2 id="tradeoffs">What this costs you</H2>
      <P>Being honest about the other half of each decision:</P>

      <UL>
        <LI>
          <strong>You write the glue.</strong> No component to drop in. One line, but it is a line.
        </LI>
        <LI>
          <strong>You write the interaction.</strong> Click, hover, pan and zoom are yours — the
          guide makes them short, not free.
        </LI>
        <LI>
          <strong>Rebuilding a string per frame has a ceiling.</strong> Fine for one system, not for
          twelve. Past that you keep the SVG in the DOM and move groups yourself, which costs you
          the determinism that made the package pleasant.
        </LI>
        <LI>
          <strong>SVG has a ceiling too.</strong> Tens of thousands of elements is where a browser
          starts to struggle, and a very large galaxy gets there.
        </LI>
        <LI>
          <strong>No layout engine.</strong> Labels are placed by a simple rule, and in a dense
          system they can overlap. There is no collision avoidance, because doing it properly is a
          package of its own.
        </LI>
      </UL>

      <P>
        If those trades sound wrong for what you are building, that is useful to know early — which
        is why they are written down rather than discovered.
      </P>
    </>
  )
}
