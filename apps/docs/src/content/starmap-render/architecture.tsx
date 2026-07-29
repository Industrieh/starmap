import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { PropsTable } from '@/components/docs/props-table'
import { A, C, H2, LI, Lead, P, UL } from '@/components/docs/prose'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'map', title: 'The map', depth: 2 },
  { id: 'pipeline', title: 'The pipeline', depth: 2 },
  { id: 'svg-ts', title: 'One file writes tags', depth: 2 },
  { id: 'content-split', title: 'Why every renderer comes in two', depth: 2 },
  { id: 'root-name', title: 'A file named root.ts', depth: 2 },
  { id: 'adding', title: 'Adding something', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        How the source is laid out and where a change belongs. Six files, about 1,400 lines
        including the comments.
      </Lead>

      <H2 id="map">The map</H2>
      <CodeBlock
        lang="bash"
        noCopy
        code={`src/
  index.ts          the public surface — exports, and nothing else
  core/
    svg.ts          the string primitives: el, group, text, num, escapeXml
    theme.ts        the colours, and how a ThemeInput resolves
    geometry.ts     framing, arcs, the decorative backdrop
    root.ts         the <svg> element that wraps a drawing
    system.ts       drawing one system
    galaxy.ts       drawing the whole map`}
      />

      <P>
        That is also the reading order. Each file opens with a header comment explaining what it is
        for, and each one only knows about the ones above it.
      </P>

      <PropsTable
        rows={[
          {
            name: 'svg.ts',
            type: 'imports: the core',
            description: (
              <>
                Only for <C>round()</C>. The bottom of the stack.
              </>
            ),
          },
          {
            name: 'theme.ts',
            type: 'imports nothing',
            description: 'Entirely standalone — colours know nothing about drawing.',
          },
          {
            name: 'geometry.ts',
            type: 'imports: the core',
            description: (
              <>
                <C>hashSeed</C>, <C>mulberry32</C>, <C>round</C>, <C>toRad</C>. Framing and arcs.
              </>
            ),
          },
          {
            name: 'root.ts',
            type: 'geometry, svg',
            description: 'Wraps finished layers. Knows nothing about what is inside them.',
          },
          {
            name: 'system.ts',
            type: 'all of the above',
            description: 'The largest file, and the only one that knows what a planet looks like.',
          },
          {
            name: 'galaxy.ts',
            type: 'all of the above',
            description: 'Its sibling. Shares no drawing code with it, on purpose.',
          },
        ]}
      />

      <Callout tone="note" title="system.ts and galaxy.ts share nothing but primitives">
        They draw different things at different scales — a planet has a real radius, a system dot is
        a fraction of the view. Factoring their <C>draw*</C> functions together would produce one
        function with a flag, which is how a renderer becomes unreadable.
      </Callout>

      <H2 id="pipeline">The pipeline</H2>
      <P>Both renderers have the same shape, and it is four steps long:</P>

      <CodeBlock
        lang="bash"
        noCopy
        code={`  options
     │
     ├─► resolveTheme(input)        a complete Theme
     ├─► systemViewBox(system)      the frame, in world units
     └─► systemPositions(system, t) where everything is  ← from the core
             │
             ▼
     draw each layer, in order      an array of strings
             │
             ▼
     drop the empty ones, join      the content
             │
             ▼
     svgDocument(view, content)     the <svg> around it`}
      />

      <P>
        No state, no mutation, no second pass. A layer that produces nothing is dropped before the
        join, which is why an empty group is never emitted.
      </P>

      <H2 id="svg-ts">One file writes tags</H2>
      <P>
        <C>svg.ts</C> is the only place in the package where a <C>&lt;</C> character is written.
        That is deliberate, and it is what makes two mistakes impossible rather than merely
        discouraged:
      </P>

      <UL>
        <LI>
          <strong>Forgetting to escape.</strong> Every name in a galaxy is user data. A drawing
          function never builds a tag itself, so it cannot skip <C>escapeXml()</C>.
        </LI>
        <LI>
          <strong>Forgetting to round.</strong> Coordinates come out of trigonometry. <C>num()</C>{' '}
          catches them all — including <C>NaN</C>, which becomes <C>0</C> rather than the string{' '}
          <C>NaN</C> that no SVG reader accepts.
        </LI>
      </UL>

      <CodeBlock
        lang="ts"
        code={`el('circle', { r: 4.005, fill: '#fff' })      // '<circle r="4" fill="#fff"/>'
el('circle', { r: 1, hidden: false })         // '<circle r="1"/>'  — false drops the attribute
num(130.00000000000003)                       // '130'
num(NaN)                                      // '0'
dash(3.2624999999999997, 4)                   // '3.26 4'
escapeXml('Ohm & <Sons>')                     // 'Ohm &amp; &lt;Sons&gt;'
group({ id: 'x' }, ['', ''])                  // ''  — an empty group is not emitted`}
      />

      <Callout tone="warning" title="A change here reaches every drawing">
        Which is why a change to <C>svg.ts</C> comes with its tests first, and the change to the
        callers second.
      </Callout>

      <H2 id="content-split">Why every renderer comes in two</H2>
      <P>
        <C>renderSystem()</C> and <C>renderSystemContent()</C> are the same drawing, wrapped
        differently. The split exists because of one use case:
      </P>

      <UL>
        <LI>
          <strong>An application that pans and zooms owns the root element</strong>, because pan and
          zoom <em>are</em> the <C>viewBox</C>. It needs the layers, not a document.
        </LI>
        <LI>
          <strong>Everything else wants a document</strong> — a file, an <C>&lt;img&gt;</C>, a
          server response.
        </LI>
      </UL>

      <P>
        So the content function is the real one, and the document function is three lines around it:
      </P>

      <CodeBlock
        lang="ts"
        code={`export function renderSystem(system: StarSystem, options: RenderSystemOptions = {}): string {
  const view = systemViewBox(system, options.margin ?? SYSTEM_MARGIN)
  return svgDocument(view, renderSystemContent(system, options), options)
}`}
      />

      <P>
        <C>systemViewBox()</C> is exported for the same reason — an application owning the root
        element still wants the framing the package would have chosen.
      </P>

      <H2 id="root-name">A file named root.ts</H2>
      <P>
        It wraps a drawing in an <C>&lt;svg&gt;</C> element, so it should be called{' '}
        <C>document.ts</C>. It is not, and the reason is worth knowing before you rename it:
      </P>

      <Callout tone="note" title="The purity test rejects the word document">
        Anywhere in the sources, <strong>import paths included</strong> — because that is how you
        catch a stray <C>document.querySelector</C> in a package that must never touch the DOM. A
        file named <C>document.ts</C> would make every import of it a false positive, and the check
        is worth more than the better file name.
      </Callout>

      <H2 id="adding">Adding something</H2>
      <P>Four common changes, and what each one touches.</P>

      <P>
        <strong>Change how an object looks</strong> — the matching <C>draw*</C> function in{' '}
        <C>system.ts</C> or <C>galaxy.ts</C>. Then{' '}
        <A href={`${routes.page('starmap-render', 'recipes')}#looking`}>look at it</A>: a visual
        change needs eyes on it, not only a green test run. Sizes go through the file&apos;s{' '}
        <C>Scale</C> — <C>u</C>, <C>k</C>, <C>font</C> — never in absolute units.
      </P>

      <P>
        <strong>Add a colour</strong> — it goes in <C>theme.ts</C>, in <strong>both</strong>{' '}
        <C>Theme</C> and <C>ThemeInput</C>, with a value in <C>DEFAULT_THEME</C>. A new keyed table
        also needs merging in <C>resolveTheme()</C> and a required <C>default</C> entry.
      </P>

      <P>
        <strong>Add a render option</strong> — the options interface, then the destructuring at the
        top of <C>renderXContent()</C> with its default value. An option that only one of the two
        renderers honours is a smell; if it applies to both, put it in both.
      </P>

      <P>
        <strong>Add a drawable object</strong> — a <C>draw*</C> function returning a string, and its
        place in the layer order. Order <em>is</em> the composition. Give its group a{' '}
        <C>data-kind</C> and a <C>data-id</C> so an application can find it, and its colour a home
        in the theme.
      </P>

      <P>
        The full checklists, with the tests and docs each change needs, are in{' '}
        <A href={routes.page('starmap-render', 'contributing')}>Contributing</A>.
      </P>
    </>
  )
}
