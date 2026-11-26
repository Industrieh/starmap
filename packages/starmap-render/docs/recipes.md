# Recipes

Task by task. Every snippet assumes a `galaxy` built with `createGalaxy()`.

- [Write a file](#write-a-file)
- [Show it in a page](#show-it-in-a-page)
- [Put it in an `<img>`](#put-it-in-an-img)
- [Render it on a server](#render-it-on-a-server)
- [Use it in React](#use-it-in-react)
- [Animate it](#animate-it)
- [Animate it without rebuilding the string](#animate-it-without-rebuilding-the-string)
- [Pan and zoom](#pan-and-zoom)
- [Handle clicks](#handle-clicks)
- [Draw your own overlay](#draw-your-own-overlay)
- [Show a route on the map](#show-a-route-on-the-map)
- [Make a thumbnail](#make-a-thumbnail)
- [Put several drawings on one page](#put-several-drawings-on-one-page)
- [Style it with CSS](#style-it-with-css)

## Write a file

```ts
import { renderSystem } from '@industrieh/starmap-render'

await Bun.write('sol.svg', renderSystem(galaxy.systems[0], { t: 0 }))
```

The output carries its `xmlns`, so the file opens in any viewer.

## Show it in a page

```ts
document.querySelector('#map').innerHTML = renderSystem(system, { t })
```

Without `width` and `height`, the drawing fills its container and keeps its
aspect ratio. The background rectangle is deliberately larger than the `viewBox`,
so the letterboxed bands are filled too.

## Put it in an `<img>`

```ts
const uri = `data:image/svg+xml,${encodeURIComponent(renderSystem(system))}`
img.src = uri
```

Note that an SVG loaded through `<img>` is isolated: your page's CSS does not
reach inside it. Everything it needs is already in the string.

## Render it on a server

```ts
Bun.serve({
  routes: {
    // `/system/:id.svg` would not work: Bun names that parameter `id.svg`.
    '/system/:id': (req) => {
      const system = index.get(req.params.id.replace(/\.svg$/, ''))
      if (!system) return new Response('unknown system', { status: 404 })
      return new Response(renderSystem(system, { title: system.name }), {
        headers: { 'content-type': 'image/svg+xml' },
      })
    },
  },
})
```

Rendering is a pure function of `(system, t, theme)`, so the same request always
produces the same bytes. Cache it as aggressively as you like.

## Use it in React

```tsx
function SystemView({ system, t }: { system: StarSystem; t: number }) {
  const svg = useMemo(() => renderSystem(system, { t }), [system, t])
  return <figure dangerouslySetInnerHTML={{ __html: svg }} />
}
```

The `dangerously` prefix is about untrusted HTML. This string is built from your
own data by this package, and every name it contains is escaped on the way out.

## Animate it

```ts
let t = 0
let last = performance.now()

const frame = (now: number): void => {
  t += (now - last) / 1000 // one simulation second per real second
  last = now
  container.innerHTML = renderSystem(system, { t })
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
```

Speed and pause are yours: multiply the increment, or stop adding to `t`.
Negative works too.

## Animate it without rebuilding the string

Replacing the whole markup 60 times a second is fine for a preview and wasteful
for a real map: most of it — the backdrop alone is about 80 % of the output —
never moves. Only two layers depend on `t`, `routes` and `planets` (stations
ride with their planet). Draw everything else once, and redraw just those two:

```ts
import {
  renderSystemContent,
  systemViewBox,
  viewBoxAttr,
  type SystemLayer,
} from '@industrieh/starmap-render'

const still = (layers: SystemLayer[]) => renderSystemContent(system, { layers })

svgElement.setAttribute('viewBox', viewBoxAttr(systemViewBox(system)))
// The layers keep their order: what is under the routes, the routes, the star,
// the planets, and the gates on top.
svgElement.innerHTML = [
  still(['defs', 'background', 'backdrop', 'orbits', 'fields']),
  '<g data-part="routes"></g>',
  still(['star']),
  '<g data-part="planets"></g>',
  still(['gates']),
].join('')

const routes = svgElement.querySelector('[data-part="routes"]')
const planets = svgElement.querySelector('[data-part="planets"]')

function update(t: number): void {
  routes.innerHTML = renderSystemContent(system, { t, layers: ['routes'] })
  planets.innerHTML = renderSystemContent(system, { t, layers: ['planets'] })
}
```

`layers` draws only what it lists, always in the usual order, and
`SYSTEM_LAYERS` lists them all, bottom to top. Moving the planets' groups by hand
— setting their `transform` from `systemPositions()` — works too, but then the
local routes stay where they were: redraw that layer as well.

## Pan and zoom

Own the root element, and pan and zoom become one attribute:

```ts
import { renderSystemContent, systemViewBox, viewBoxAttr } from '@industrieh/starmap-render'

let view = systemViewBox(system)
svgElement.innerHTML = renderSystemContent(system, { t })

function zoom(factor: number): void {
  const cx = view.x + view.w / 2
  const cy = view.y + view.h / 2
  view = { w: view.w * factor, h: view.h * factor, x: 0, y: 0 }
  view.x = cx - view.w / 2
  view.y = cy - view.h / 2
  svgElement.setAttribute('viewBox', viewBoxAttr(view))
}
```

Panning is the same idea: add your drag delta, in world units, to `view.x` and
`view.y`. Nothing is re-rendered.

## Handle clicks

One listener on the container, because the markup can be replaced at any time —
and on `pointerdown` rather than `click` if it is replaced every frame: a click
needs the press and the release on the same element, and an animation that
redraws between the two swallows it.

```ts
import { indexGalaxy } from '@industrieh/starmap'

const index = indexGalaxy(galaxy)

container.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return // the primary button only
  const node = (event.target as Element).closest('[data-id]')
  if (!node) return
  const entry = index.get(node.getAttribute('data-id'))
  if (entry?.kind === 'station') console.log(entry.obj.docks, 'docks')
})
```

`data-kind` is on the same group when you only need the kind, without a lookup.
Hyperlanes and local routes carry one too — `lane` and `route` — so a handler
can tell them from the objects: their ids are not in `indexGalaxy()`.

A small planet is hard to hit. If that matters, widen the target with CSS —
`[data-kind="planet"] { stroke: transparent; stroke-width: 12 }` — rather than
changing the drawing.

## Draw your own overlay

The building blocks the package uses are exported, so an overlay comes out in
the same style, in the same coordinate system.

```ts
import {
  el,
  group,
  renderSystemContent,
  svgDocument,
  systemScale,
  systemViewBox,
} from '@industrieh/starmap-render'

const view = systemViewBox(system)
const { u } = systemScale(view) // the spacing unit the drawing itself uses

const ships = group(
  { 'data-layer': 'ships', fill: '#fff' },
  fleet.map((s) => el('circle', { cx: s.x, cy: s.y, r: u * 0.8, 'data-id': s.id })),
)

const svg = svgDocument(view, `${renderSystemContent(system, { t })}\n${ships}`, {
  title: system.name,
})
```

Coordinates in an overlay are world units in the system's frame — the same ones
`systemPositions()` returns. Sizes come from `systemScale()` (or `galaxyScale()`
on the map), so a marker keeps its size against the drawing whatever the size of
the system.

## Show a route on the map

```ts
import { findRoute } from '@industrieh/starmap'

const route = findRoute(galaxy, 'sol', 'kepler')
const svg = renderGalaxy(galaxy, { highlight: route?.systemIds })
```

`highlight` is an ordered path: consecutive entries light the lane between them.
Passing two systems that are not neighbours highlights the systems and no lane,
which is exactly what it should look like.

## Make a thumbnail

```ts
const thumb = renderSystem(system, {
  width: 64,
  height: 64,
  labels: false, // unreadable at this size
  backdrop: 0, // noise at this size
  margin: 0.1, // fill the frame
})
```

Labels and the backdrop are the two things that cost the most and read the least
when small.

## Put several drawings on one page

Nothing to do:

```ts
const svgs = galaxy.systems.map((s) => renderSystem(s, { width: 200, height: 200 }))
```

Gradient ids are global to the page, so each drawing's are prefixed with its
system's id — `starmap-sol-glow`, `starmap-vega-glow` — and never collide. Pass
an `idPrefix` only to draw the **same** system twice on one page with two
themes, or to put two galaxy maps with different themes side by side.

## Style it with CSS

An inline SVG is styleable like anything else, and the layers are addressable:

```css
[data-layer='backdrop'] {
  opacity: 0.4;
}
[data-layer='routes'] {
  display: none;
}
[data-kind='planet']:hover circle {
  stroke: #fff;
  stroke-width: 1;
}
```

Attributes written by the package are presentation attributes, so any CSS rule
wins over them. That is the cheap way to add a hover or a selection state
without re-rendering.
