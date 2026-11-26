import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { PropsTable } from '@/components/docs/props-table'
import { A, C, H2, LI, Lead, P, Quote, UL } from '@/components/docs/prose'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'not-here', title: 'None of it is in the package', depth: 2 },
  { id: 'hooks', title: 'The three hooks', depth: 2 },
  { id: 'click', title: 'Click and hover', depth: 2 },
  { id: 'selection', title: 'Showing a selection', depth: 2 },
  { id: 'pan-zoom', title: 'Pan and zoom', depth: 2 },
  { id: 'layers', title: 'Toggling a layer', depth: 2 },
  { id: 'perf', title: 'When re-rendering gets expensive', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        The package has no click handler, no hover state, no pan and no zoom. This page is how you
        build all four on top of it — which is easier than it sounds, because the drawing tells you
        what everything is.
      </Lead>

      <H2 id="not-here">None of it is in the package</H2>
      <P>
        That is a decision, not an omission. Selection, hover, the camera and the clock are{' '}
        <strong>application state</strong>, and every project holds them differently — in React
        state, in a store, in a game loop, on a server.
      </P>

      <Quote>
        The package draws one frame for one moment. What is selected, where the camera is and what
        time it is are yours.
      </Quote>

      <P>
        What it does instead is label everything it draws, so your code can find any object without
        knowing how the drawing is built.
      </P>

      <H2 id="hooks">The three hooks</H2>
      <PropsTable
        rows={[
          {
            name: 'data-layer',
            type: 'on each <g>',
            description: (
              <>
                <C>backdrop</C>, <C>orbits</C>, <C>fields</C>, <C>routes</C>, <C>planets</C>,{' '}
                <C>gates</C> for a system; <C>backdrop</C>, <C>lanes</C>, <C>systems</C> for a
                galaxy.
              </>
            ),
          },
          {
            name: 'data-kind',
            type: 'on each object',
            description: (
              <>
                <C>star</C>, <C>planet</C>, <C>station</C>, <C>gate</C>, <C>field</C>, <C>route</C>{' '}
                in a system; <C>system</C> and <C>lane</C> on the galaxy map.
              </>
            ),
          },
          {
            name: 'data-id',
            type: 'on each object',
            description: (
              <>
                The model&apos;s own id — the same string you would pass to <C>indexGalaxy()</C>.
                That is what makes the two libraries line up.
              </>
            ),
          },
        ]}
      />

      <CodeBlock
        lang="ts"
        noCopy
        code={`<g data-layer="planets">
  <g data-kind="planet" data-id="sol-p1">
    …
    <g data-kind="station" data-id="sol-p1-st0">…</g>
  </g>
</g>`}
      />

      <Callout tone="tip" title="The id is the join between the two packages">
        A click gives you <C>sol-p1</C>. <C>indexGalaxy(galaxy).get(&apos;sol-p1&apos;)</C> gives
        you the object, its kind and its system. You never have to thread anything through the
        drawing. Lanes and local routes are the two exceptions: they are not objects of the index,
        so read their <C>data-kind</C> first and look them up in <C>galaxy.lanes</C> or the
        system&apos;s <C>localRoutes</C>.
      </Callout>

      <H2 id="click">Click and hover</H2>
      <P>
        One listener on the container, and <C>closest()</C> to find which object was hit. No
        listener per element, and nothing to re-attach when you re-render. Listen for{' '}
        <C>pointerdown</C> rather than <C>click</C>: a click needs the press and the release to land
        on the same element, and a drawing re-rendered between the two has replaced that element —
        at sixty frames a second, an ordinary click is often simply lost.
      </P>

      <CodeBlock
        lang="ts"
        filename="interaction.ts"
        code={`import { indexGalaxy } from '@industrieh/starmap'
import { renderSystem } from '@industrieh/starmap-render'

const index = indexGalaxy(galaxy)          // built once
container.innerHTML = renderSystem(system, { t: 0 })

// pointerdown, not click: it fires on the element under the pointer at the press,
// whatever the next frame does to the markup.
container.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return             // the primary button only
  const target = (event.target as Element).closest('[data-id]')
  if (!target) return

  const id = target.getAttribute('data-id')!
  const entry = index.get(id)

  if (entry?.kind === 'planet') {
    console.log(\`\${entry.obj.name} — \${entry.obj.stations.length} stations\`)
  }
})`}
      />

      <P>
        Hover is the same shape with <C>pointerover</C>. Because the handler sits on the container,
        it keeps working after every re-render. For a drawing you render once and never replace,{' '}
        <C>click</C> is fine — it is the replacing that loses it. The other way out is to stop
        replacing what is under the pointer: draw the still layers once and redraw only the ones
        that move, <A href="#perf">below</A>.
      </P>

      <Callout tone="warning" title="An &lt;img&gt; is not clickable">
        A drawing embedded as a <C>data:</C> URI or an <C>&lt;img src&gt;</C> is a sealed document —
        the browser never puts its contents in your DOM, so there is nothing to click. Inline it if
        you want interaction.
      </Callout>

      <H2 id="selection">Showing a selection</H2>
      <P>
        Two ways, and the difference is worth understanding because it decides how much work a
        selection costs.
      </P>

      <P>
        <strong>With CSS</strong> — nothing is re-rendered. The drawing is already in the DOM, so a
        stylesheet reaches it:
      </P>

      <CodeBlock
        lang="ts"
        code={`/* Your stylesheet, not the package's — it ships none. */
[data-kind='planet'][data-selected] circle {
  stroke: #fff;
  stroke-width: 2;
}`}
      />

      <CodeBlock
        lang="ts"
        code={`// Then just move an attribute around.
function select(id: string) {
  container.querySelector('[data-selected]')?.removeAttribute('data-selected')
  container.querySelector(\`[data-id="\${id}"]\`)?.setAttribute('data-selected', '')
}`}
      />

      <P>
        <strong>By drawing it yourself</strong> — when the highlight is a shape rather than a style.
        The string primitives are exported for exactly this:
      </P>

      <CodeBlock
        lang="ts"
        code={`import { systemPositions } from '@industrieh/starmap'
import {
  el,
  renderSystemContent,
  systemScale,
  systemViewBox,
  viewBoxAttr,
} from '@industrieh/starmap-render'

const view = systemViewBox(system)
const { u, k } = systemScale(view)   // the drawing's own spacing and stroke units

const at = systemPositions(system, t)
const p = at.get(selectedId)

const ring = p
  ? el('circle', { cx: p.x, cy: p.y, r: u * 4, fill: 'none', stroke: '#fff', 'stroke-width': k * 2 })
  : ''

// Your overlay goes last, so it is drawn on top.
container.innerHTML =
  \`<svg viewBox="\${viewBoxAttr(view)}">\` +
  renderSystemContent(system, { t }) +
  ring +
  '</svg>'`}
      />

      <Callout tone="note" title="Your overlay is in world units too">
        The positions come from the core, in the same units the drawing uses, and{' '}
        <C>systemScale()</C> gives you the sizes the drawing derives from its view — so a ring sized
        in <C>u</C> stays in proportion in a system of any size. There is no conversion step, which
        is the point of never using pixels internally.
      </Callout>

      <H2 id="pan-zoom">Pan and zoom</H2>
      <P>
        This is where <C>renderSystemContent()</C> earns its place. Pan and zoom are{' '}
        <strong>nothing but a different viewBox</strong> — so the application owns the root element,
        and the drawing inside it never changes.
      </P>

      <CodeBlock
        lang="ts"
        filename="camera.ts"
        code={`import { galaxyViewBox, renderGalaxyContent, viewBoxAttr } from '@industrieh/starmap-render'

const base = galaxyViewBox(galaxy)
const svg = document.querySelector('svg')!

// The layers are rendered once — they do not depend on the camera.
svg.innerHTML = renderGalaxyContent(galaxy)

let camera = { ...base }

function apply() {
  svg.setAttribute('viewBox', viewBoxAttr(camera))
}

function zoom(factor: number, cx: number, cy: number) {
  const w = camera.w * factor
  const h = camera.h * factor
  // Keep the point under the cursor fixed.
  camera = { x: cx - (cx - camera.x) * factor, y: cy - (cy - camera.y) * factor, w, h }
  apply()
}

function pan(dx: number, dy: number) {
  camera = { ...camera, x: camera.x - dx, y: camera.y - dy }
  apply()
}

apply()`}
      />

      <P>
        Zooming costs one attribute write. Nothing is re-rendered, no string is rebuilt, and the
        browser scales vector geometry it already has — which is why this stays smooth on a large
        galaxy.
      </P>

      <Callout tone="tip" title="Screen pixels to world units">
        A drag gives you pixels. Multiply by <C>camera.w / svg.clientWidth</C> to get world units,
        and pan by that. The ratio is also your current zoom level.
      </Callout>

      <H2 id="layers">Toggling a layer</H2>
      <P>
        <C>data-layer</C> makes this a one-liner, and it needs no re-render either:
      </P>

      <CodeBlock
        lang="ts"
        code={`function setLayer(name: string, visible: boolean) {
  const layer = container.querySelector(\`[data-layer="\${name}"]\`)
  if (layer instanceof SVGElement) layer.style.display = visible ? '' : 'none'
}

setLayer('backdrop', false)   // a cleaner map for a screenshot
setLayer('orbits', false)     // just the bodies`}
      />

      <P>
        Or skip it at render time — <C>{`{ backdrop: 0 }`}</C> and <C>{`{ labels: false }`}</C>{' '}
        produce a smaller string in the first place.
      </P>

      <H2 id="perf">When re-rendering gets expensive</H2>
      <P>
        Rebuilding the string every frame is fine for one system. It stops being fine when you have
        several on screen, or a galaxy with thousands of systems. In order of how much they buy you:
      </P>

      <UL>
        <LI>
          <strong>Do not re-render what did not change.</strong> The galaxy map takes no <C>t</C> —
          render it once and only touch its <C>viewBox</C>.
        </LI>
        <LI>
          <strong>Redraw only the layers that move.</strong> Only <C>routes</C> and <C>planets</C>{' '}
          depend on <C>t</C>. The <C>layers</C> option draws a subset, so the still ones — a few
          hundred backdrop circles among them — can be drawn once.
        </LI>
        <LI>
          <strong>Move groups instead of re-rendering.</strong> Keep the SVG in the DOM and set a{' '}
          <C>transform</C> on each planet&apos;s group from{' '}
          <A href={routes.page('starmap', 'animating')}>
            <C>systemPositions()</C>
          </A>
          . The package is no longer involved per frame.
        </LI>
        <LI>
          <strong>Resolve the theme once</strong>, outside the loop — a resolved theme is used as
          is, with no merge per frame.
        </LI>
      </UL>

      <CodeBlock
        lang="ts"
        code={`// Still layers once, moving layers per frame. The stack keeps its order: the star
// sits between the routes and the planets, the gates above them.
const theme = resolveTheme(myTheme)
const draw = (layers: SystemLayer[], t = 0) => renderSystemContent(system, { t, theme, layers })

svg.innerHTML =
  draw(['defs', 'background', 'backdrop', 'orbits', 'fields']) +
  '<g id="moving-routes"></g>' +
  draw(['star']) +
  '<g id="moving-planets"></g>' +
  draw(['gates'])

const routes = svg.querySelector('#moving-routes')!
const planets = svg.querySelector('#moving-planets')!

function frame(t: number) {
  routes.innerHTML = draw(['routes'], t)
  planets.innerHTML = draw(['planets'], t)
}`}
      />

      <CodeBlock
        lang="ts"
        code={`// Moving groups instead, concretely.
container.innerHTML = renderSystem(system, { t: 0 })   // once

function frame(t: number) {
  const at = systemPositions(system, t)
  for (const planet of system.planets) {
    const p = at.get(planet.id)!
    const g = container.querySelector(\`[data-id="\${planet.id}"]\`)
    g?.setAttribute('transform', \`translate(\${p.x} \${p.y})\`)
  }
}`}
      />

      <Callout tone="warning" title="Measure before you do any of this">
        One system is a few dozen objects and a 17 KB string. The naive loop is fast enough far
        longer than you would expect, and every optimisation above costs you the property that made
        the package pleasant: same input, same output.
      </Callout>
    </>
  )
}
