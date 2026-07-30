import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { A, C, H2, LI, Lead, P, UL } from '@/components/docs/prose'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'files', title: 'Export a set of files', depth: 2 },
  { id: 'server', title: 'Render on a server', depth: 2 },
  { id: 'react', title: 'Use it in React', depth: 2 },
  { id: 'overlay', title: 'Draw your own overlay', depth: 2 },
  { id: 'route', title: 'Show a route on the map', depth: 2 },
  { id: 'thumbnails', title: 'Thumbnails', depth: 2 },
  { id: 'testing', title: 'Test a drawing', depth: 2 },
  { id: 'looking', title: 'Actually look at it', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        Task-by-task answers. Everything here is a consequence of the same fact — the output is a
        string, so it goes wherever a string goes.
      </Lead>

      <H2 id="files">Export a set of files</H2>
      <P>
        The whole universe as browsable assets: one file per system, one for the map. No browser
        involved.
      </P>

      <CodeBlock
        lang="ts"
        filename="export.ts"
        code={`import { indexSystems } from '@industrieh/starmap'
import { renderGalaxy, renderSystem } from '@industrieh/starmap-render'

const systems = indexSystems(galaxy)

await Bun.write('out/galaxy.svg', renderGalaxy(galaxy, { title: 'The known galaxy' }))

for (const system of galaxy.systems) {
  await Bun.write(
    \`out/\${system.id}.svg\`,
    renderSystem(system, {
      title: system.name,
      idPrefix: system.id,   // each file is its own document, but this keeps them safe to inline later
      systems,               // so gate labels name where they lead
    }),
  )
}`}
      />

      <H2 id="server">Render on a server</H2>
      <P>
        The client ships no renderer at all — it receives an image. Because the output is
        deterministic, it caches like a static asset.
      </P>

      <CodeBlock
        lang="ts"
        code={`Bun.serve({
  routes: {
    '/system/:id.svg': (request) => {
      const system = systems.get(request.params.id)
      if (!system) return new Response('Not found', { status: 404 })

      return new Response(renderSystem(system, { title: system.name }), {
        headers: {
          'content-type': 'image/svg+xml',
          // Same input, same bytes — so this is safe.
          'cache-control': 'public, max-age=3600',
        },
      })
    },
  },
})`}
      />

      <Callout tone="tip" title="A moving drawing is still cacheable">
        Round <C>t</C> to the granularity you actually need — <C>Math.floor(t)</C> gives you one
        distinct image per second, and a whole minute of animation is sixty cache entries.
      </Callout>

      <H2 id="react">Use it in React</H2>
      <P>
        There is no component to import, and that is the point. Two ways in, depending on whether
        you need to click things.
      </P>

      <CodeBlock
        lang="tsx"
        code={`import { useMemo } from 'react'
import { renderSystem } from '@industrieh/starmap-render'

// Interactive: the SVG becomes part of the DOM, so data-id is reachable.
function SystemView({ system, t }: { system: StarSystem; t: number }) {
  const svg = useMemo(() => renderSystem(system, { idPrefix: system.id, t }), [system, t])
  return <div className="h-full" dangerouslySetInnerHTML={{ __html: svg }} />
}

// Static: cheaper, isolated from your CSS, and nothing inside is clickable.
function SystemThumb({ system }: { system: StarSystem }) {
  const src = useMemo(
    () => \`data:image/svg+xml;utf8,\${encodeURIComponent(renderSystem(system, { backdrop: 0 }))}\`,
    [system],
  )
  return <img src={src} alt={system.name} width={96} height={96} />
}`}
      />

      <Callout tone="note" title="dangerouslySetInnerHTML is fine here">
        The name is about untrusted HTML. Every name in the galaxy goes through XML escaping before
        it reaches the string, so a system called <C>&lt;script&gt;</C> comes out as text. The
        danger the prop warns about is the one the package already removed.
      </Callout>

      <H2 id="overlay">Draw your own overlay</H2>
      <P>
        Ships, range circles, a selection ring — anything the model does not know about. The string
        primitives are exported for this, and your overlay goes last so it is drawn on top.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { systemPositions } from '@industrieh/starmap'
import {
  el, group, text, renderSystemContent, systemViewBox, viewBoxAttr,
} from '@industrieh/starmap-render'

function draw(system: StarSystem, t: number, ships: Ship[]) {
  const at = systemPositions(system, t)

  const fleet = group(
    { 'data-layer': 'fleet' },              // your own layer name
    ships.map((ship) =>
      group({ 'data-kind': 'ship', 'data-id': ship.id }, [
        el('circle', { cx: ship.x, cy: ship.y, r: 3, fill: '#fff' }),
        text(ship.name, { x: ship.x + 6, y: ship.y, 'font-size': 8, fill: '#fff' }),
      ]),
    ),
  )

  return \`<svg viewBox="\${viewBoxAttr(systemViewBox(system))}">\` +
    renderSystemContent(system, { t }) +
    fleet +
    '</svg>'
}`}
      />

      <UL>
        <LI>
          <C>el()</C> formats numbers to two decimals and escapes attributes, so your overlay gets
          the same treatment as the package&apos;s own output;
        </LI>
        <LI>
          <C>group()</C> drops empty parts — no ships means no <C>fleet</C> layer at all;
        </LI>
        <LI>
          <C>text()</C> escapes its content, which matters the moment a ship is named{' '}
          <C>Ohm &amp; Sons</C>.
        </LI>
      </UL>

      <Callout tone="tip" title="Match the theme">
        <C>resolveTheme()</C> and <C>pickColor()</C> are exported too. Colour your overlay from the
        same table and it stays consistent when someone switches to a light theme.
      </Callout>

      <H2 id="route">Show a route on the map</H2>
      <P>
        The core returns exactly what the renderer expects, which is not a coincidence — it is why{' '}
        <C>Route.systemIds</C> is an ordered array.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { findRoute } from '@industrieh/starmap'
import { renderGalaxy } from '@industrieh/starmap-render'

const route = findRoute(galaxy, 'sol', 'vega')

const map = renderGalaxy(galaxy, {
  highlight: route?.systemIds,
  title: route ? \`\${route.jumps} jumps, \${Math.round(route.distance)} units\` : 'No route',
})`}
      />

      <P>
        Order matters: consecutive entries light the lane between them. Passing an unordered set of
        ids highlights the systems and none of the lanes.
      </P>

      <H2 id="thumbnails">Thumbnails</H2>
      <P>
        The same drawing at 64 pixels. Two options are worth turning off, and neither has anything
        to do with size:
      </P>

      <CodeBlock
        lang="ts"
        code={`renderSystem(system, {
  width: 64,
  height: 64,
  labels: false,    // unreadable at this size, and a third of the string
  backdrop: 0,      // a few hundred circles nobody will see
  margin: 0.1,      // crop closer — a thumbnail wants the subject, not the void
})`}
      />

      <P>
        Everything else scales on its own, because sizes inside the drawing are fractions of the
        view rather than pixels. See{' '}
        <A href={`${routes.page('starmap-render', 'drawing')}#scale`}>Two kinds of size</A>.
      </P>

      <H2 id="testing">Test a drawing</H2>
      <P>
        Assert on <strong>what must be true</strong>, never on the markup. A test that pins a stroke
        width fails the next time someone tunes it, and tells you nothing.
      </P>

      <CodeBlock
        lang="ts"
        code={`// Good — survives any visual change that keeps the meaning.
expect(svg).toContain('data-kind="planet" data-id="earth"')
expect(svg.match(/data-kind="planet"/g)).toHaveLength(3)
expect(svg).not.toContain('data-layer="backdrop"')   // when backdrop: 0

// Bad — breaks on the next tweak, for no benefit.
expect(svg).toContain('<circle r="6" fill="#4fae6a" stroke-width="0.87"/>')`}
      />

      <P>
        Because the output is deterministic, a snapshot test is also viable —{' '}
        <C>expect(renderSystem(sol, {'{ t: 3 }'})).toMatchSnapshot()</C>. It will fail on every
        visual change, which is either exactly what you want or exactly what you do not.
      </P>

      <Callout tone="warning" title="Cover the degenerate cases">
        The core makes most fields optional, so the renderer meets them constantly. A system with no
        planets, a planet with no <C>type</C>, an empty galaxy, a non-square <C>width</C>/
        <C>height</C>. That last one is what catches a background that does not cover the
        letterboxed bands.
      </Callout>

      <H2 id="looking">Actually look at it</H2>
      <P>
        Tests do not tell you whether a drawing looks right. This is the shortest path from a change
        to a picture:
      </P>

      <CodeBlock
        lang="bash"
        code={`bun -e '
  import { renderSystem } from "@industrieh/starmap-render"
  import { galaxy } from "./universe"
  await Bun.write("/tmp/sol.svg", renderSystem(galaxy.systems[0], { t: 3, width: 700, height: 700 }))
' && open /tmp/sol.svg`}
      />

      <P>Worth a look every time you change something visual:</P>

      <UL>
        <LI>a large system and a small one — the two ends of the scale problem;</LI>
        <LI>a system with no planets;</LI>
        <LI>the drawing at 64 pixels;</LI>
        <LI>
          a non-square <C>width</C>/<C>height</C> — the letterboxing case.
        </LI>
      </UL>
    </>
  )
}
