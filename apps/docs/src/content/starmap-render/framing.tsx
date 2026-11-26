import { renderSystem } from '@industrieh/starmap-render'
import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { PropsTable } from '@/components/docs/props-table'
import { A, C, H2, H3, LI, Lead, P, Quote, UL } from '@/components/docs/prose'
import { RenderCompare, RenderPreview } from '@/components/docs/render-preview'
import type { TocEntry } from '@/content/registry'
import { SOL } from '@/content/starmap-render/fixture'
import { routes } from '@/lib/routes'

const T = 4

// Each drawing below names its own prefix even though most need none: the same
// Sol appears on this page several times, and that is the one case where two
// drawings could share gradient ids.

const DEFAULT_MARGIN = renderSystem(SOL, { t: T, idPrefix: 'fr-default' })
const NO_MARGIN = renderSystem(SOL, { t: T, idPrefix: 'fr-crop', margin: 0 })
const BIG_MARGIN = renderSystem(SOL, { t: T, idPrefix: 'fr-room', margin: 1.2 })
const TITLED = renderSystem(SOL, {
  t: T,
  idPrefix: 'fr-titled',
  title: `${SOL.name} — ${SOL.planets.length} planets`,
})

export const toc: readonly TocEntry[] = [
  { id: 'world-units', title: 'Nothing is ever a pixel', depth: 2 },
  { id: 'viewbox', title: 'The two viewBoxes', depth: 2 },
  { id: 'margins', title: 'Margins', depth: 3 },
  { id: 'size', title: 'Giving it a size', depth: 2 },
  { id: 'letterbox', title: 'Why the background is oversized', depth: 2 },
  { id: 'embedding', title: 'Four ways to embed it', depth: 2 },
  { id: 'ids', title: 'Two drawings on one page', depth: 2 },
  { id: 'a11y', title: 'Accessibility', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        How a drawing decides what to show, how it scales to the space it is given, and the four
        places a string can go.
      </Lead>

      <H2 id="world-units">Nothing is ever a pixel</H2>
      <P>
        Every coordinate the renderer writes is in <strong>world units</strong> — the same units
        your galaxy is described in. A planet at <C>orbit: 150</C> is drawn at 150.
      </P>

      <Quote>
        The viewBox does the scaling. That is the whole reason one string is both a 32-pixel
        thumbnail and a full-screen map.
      </Quote>

      <P>
        Which means resizing costs nothing: the same document, in a bigger box, is bigger. There is
        no re-render, no recalculation, no second string.
      </P>

      <H2 id="viewbox">The two viewBoxes</H2>
      <P>Each renderer frames differently, because a system and a galaxy are shaped differently.</P>

      <H3 id="margins">Margins</H3>
      <PropsTable
        rows={[
          {
            name: 'systemViewBox',
            type: '(system, margin?) => ViewBox',
            defaultValue: 'SYSTEM_MARGIN = 0.45',
            description: (
              <>
                Square, centred on the origin — a system&apos;s star is always at <C>(0, 0)</C>. The
                span is <C>outerLimit</C> plus the margin, as a fraction of it.
              </>
            ),
          },
          {
            name: 'galaxyViewBox',
            type: '(galaxy, margin?) => ViewBox',
            defaultValue: 'GALAXY_MARGIN = 0.12',
            description: (
              <>
                The bounding box of the systems, plus a margin as a fraction of the largest
                dimension. <strong>Not centred</strong> — a galaxy keeps the coordinates you gave
                it.
              </>
            ),
          },
        ]}
      />

      <CodeBlock
        lang="ts"
        code={`import { systemViewBox, galaxyViewBox, viewBoxAttr } from '@industrieh/starmap-render'

// Sol's outerLimit is 300, and the default margin adds 45%.
systemViewBox(system)
// { x: -435, y: -435, w: 870, h: 870 }

systemViewBox(system, 0)          // crop to the outermost object
// { x: -300, y: -300, w: 600, h: 600 }

// Two systems at (0,0) and (420,160).
galaxyViewBox(galaxy)
// { x: -50.4, y: -50.4, w: 520.8, h: 260.8 }   ← wider than tall, like the galaxy

viewBoxAttr(systemViewBox(system))   // '-435 -435 870 870'`}
      />

      <RenderCompare
        left={{
          svg: NO_MARGIN,
          alt: 'The Sol system cropped tight to its gate orbit, with no margin around it.',
          label: (
            <>
              <C>margin: 0</C> — cropped to the outermost object, which here is the gate&apos;s
              orbit.
            </>
          ),
        }}
        right={{
          svg: DEFAULT_MARGIN,
          alt: 'The Sol system with the default margin around it.',
          label: (
            <>
              The default <C>0.45</C>. The same drawing, with room to breathe around it.
            </>
          ),
        }}
      />

      <Callout tone="tip" title="A bigger margin is how you leave room for your own overlay">
        Ship names, range circles, a selection ring — anything you draw yourself needs somewhere to
        go. Raising the margin gives it space without touching the model.
      </Callout>

      <RenderPreview
        svg={BIG_MARGIN}
        alt="The Sol system small in the middle of the frame, a wide empty margin around it."
        height="sm"
        code={`renderSystem(system, { margin: 1.2 })`}
        caption="margin: 1.2 — the system now occupies less than half the frame, and everything outside it is yours."
      />

      <P>Two degenerate cases are handled rather than left to break:</P>

      <UL>
        <LI>
          a system whose <C>outerLimit</C> is <C>0</C> or nonsense frames at <C>100</C>;
        </LI>
        <LI>
          a galaxy with one system — or several in a straight line — would have a box with zero
          width or height, which renders as nothing. Both are clamped to at least <C>1</C>.
        </LI>
      </UL>

      <H2 id="size">Giving it a size</H2>
      <P>
        By default the root <C>&lt;svg&gt;</C> carries no <C>width</C> and no <C>height</C>, so it
        fills whatever container it is put in. Pass them when you want a fixed size:
      </P>

      <CodeBlock
        lang="ts"
        code={`renderSystem(system)                              // fills its box
renderSystem(system, { width: 700, height: 700 }) // exactly 700×700 pixels`}
      />

      <P>
        The document is always <C>preserveAspectRatio=&quot;xMidYMid meet&quot;</C>: the drawing is
        centred, and scaled until it fits entirely. It is never cropped and never stretched.
      </P>

      <H2 id="letterbox">Why the background is oversized</H2>
      <P>
        This is the one piece of the output that looks like a mistake and is not. The background
        rectangle is <strong>three times the viewBox</strong>, centred on it:
      </P>

      <CodeBlock
        lang="ts"
        noCopy
        code={`viewBox="-435 -435 870 870"
<rect x="-1305" y="-1305" width="2610" height="2610" fill="#070b16"/>
       ↑ three times as wide, and offset by one viewBox`}
      />

      <P>
        The reason is <C>preserveAspectRatio</C>. When the box you give a drawing does not have the
        same shape as its <C>viewBox</C>, the renderer letterboxes it — and{' '}
        <strong>those bands sit outside the viewBox</strong>. A rectangle of exactly the right size
        would leave them transparent, showing the page through them.
      </P>

      <Callout tone="note" title="What you would see without it">
        A square system drawn in a wide container would have two vertical strips of your page&apos;s
        own background down the sides. It reads as a rendering bug, and it is the first thing you
        notice on a non-square container — which is why it is worth testing one.
      </Callout>

      <RenderPreview
        svg={DEFAULT_MARGIN}
        alt="The Sol system in a frame wider than it is tall, its dark background running edge to edge."
        height="sm"
        caption="Every frame on this page is wider than it is tall, and the system inside it is square — so all of them are letterboxed. The reason you cannot tell is the oversized rectangle: the dark background runs edge to edge instead of stopping at the viewBox."
      />

      <H2 id="embedding">Four ways to embed it</H2>
      <P>It is a string, so there is no single right answer.</P>

      <CodeBlock
        lang="ts"
        code={`// 1. A file — the drawing is standalone, xmlns and all.
await Bun.write('sol.svg', renderSystem(system))

// 2. Inline in a page — the SVG becomes part of the DOM, so CSS and
//    event listeners reach inside it. This is what you want for interaction.
container.innerHTML = renderSystem(system)

// 3. An <img> — the browser never parses it into your document. Cheapest,
//    isolated from your CSS, and nothing inside is clickable.
img.src = \`data:image/svg+xml;utf8,\${encodeURIComponent(renderSystem(system))}\`

// 4. A server response — rendered where the data is, cached like an image.
return new Response(renderSystem(system), {
  headers: { 'content-type': 'image/svg+xml' },
})`}
      />

      <PropsTable
        rows={[
          {
            name: 'File',
            type: 'standalone',
            description: 'Assets, exports, documentation. Open it in anything.',
          },
          {
            name: 'Inline',
            type: 'in the DOM',
            description: (
              <>
                The only one where <C>data-id</C> is reachable. Costs a parse per render.
              </>
            ),
          },
          {
            name: 'data: URI',
            type: 'isolated',
            description:
              'Cheap and safe, but a sealed box: no clicks, no hover, no styling from outside.',
          },
          {
            name: 'Response',
            type: 'server-rendered',
            description: 'Cacheable like any image. The client ships no renderer at all.',
          },
        ]}
      />

      <Callout tone="warning" title="encodeURIComponent, not raw">
        A raw SVG in a <C>data:</C> URI breaks on the first <C>#</C> — which every hex colour in the
        theme contains. Encode it, always.
      </Callout>

      <H2 id="ids">Two drawings on one page</H2>
      <P>
        A drawing declares gradients in <C>&lt;defs&gt;</C>, and{' '}
        <strong>SVG ids are global to the page</strong>. Two drawings inlined side by side with the
        same prefix would both reference the first one&apos;s gradients — and the gradients carry
        the star&apos;s colour, so the second would wear the first one&apos;s.
      </P>

      <P>
        That is why a system&apos;s prefix defaults to <C>starmap-</C> followed by its own id: two
        different systems never collide, with nothing to pass. The one case left is the{' '}
        <em>same</em> system drawn twice, in themes that change its gradients — its star colours, or{' '}
        <C>light</C> and <C>shade</C>.
      </P>

      <CodeBlock
        lang="ts"
        code={`// Two systems: nothing to do.
container.innerHTML = renderSystem(sol) + renderSystem(vega)
// → #starmap-sol-glow and #starmap-vega-glow

// The same system twice, its star recoloured in one: give that one a prefix.
container.innerHTML =
  renderSystem(sol) +
  renderSystem(sol, { theme: { stars: { G: '#ff9d5c' } }, idPrefix: 'sol-warm' })`}
      />

      <P>
        A prefix is cleaned up on the way in: characters an XML id cannot hold become <C>_</C>, and
        a leading non-letter gets one in front — a system called <C>alpha centauri</C> declares{' '}
        <C>#starmap-alpha_centauri-glow</C>, not a broken reference. The galaxy map keeps a fixed
        default, <C>starmap</C>; two maps on one page need prefixes of their own only if their
        themes differ.
      </P>

      <Callout tone="tip" title="It only matters when inlining">
        A <C>data:</C> URI and an <C>&lt;img&gt;</C> each get their own document, so ids cannot
        collide. This is an inline-SVG problem exclusively.
      </Callout>

      <H2 id="a11y">Accessibility</H2>
      <P>
        Pass <C>title</C> and the document gains a <C>&lt;title&gt;</C> child and{' '}
        <C>role=&quot;img&quot;</C> — which is what makes a screen reader announce it instead of
        skipping it.
      </P>

      <CodeBlock
        lang="ts"
        code={`renderSystem(system, { title: \`\${system.name} — \${system.planets.length} planets\` })

// <svg … role="img">
//   <title>Sol — 2 planets</title>`}
      />

      <RenderPreview
        svg={TITLED}
        alt="The Sol system."
        height="sm"
        caption="Visually identical, and announced as “Sol — 2 planets” instead of skipped. Hover it and your browser will show the title too."
      />

      <P>
        Without it there is no <C>role</C> and no title, which is the right default for a purely
        decorative drawing. Say something useful, or say nothing.
      </P>

      <P>
        An interactive drawing wants something else again. <C>role=&quot;img&quot;</C> presents the
        drawing as one picture and hides everything inside it from assistive technology — the right
        call for an illustration, the wrong one for a map whose systems can be selected. Pass{' '}
        <C>role: false</C> to keep the title and drop the role, then make the objects reachable
        yourself:
      </P>

      <CodeBlock
        lang="ts"
        code={`renderSystem(system, { title: 'Sol', role: false })   // a <title>, no role="img"`}
      />

      <P>
        Colour is not the only channel:{' '}
        <A href={`${routes.page('starmap-render', 'theming')}#routes`}>route styles</A> carry
        distinct dash patterns for the same reason.
      </P>
    </>
  )
}
