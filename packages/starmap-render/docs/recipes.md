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
import { renderSystem } from '@cotontigeh/starmap-render'

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
    '/system/:id.svg': (req) => {
      const system = index.get(req.params.id)
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
  const svg = useMemo(() => renderSystem(system, { t, idPrefix: system.id }), [system, t])
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
for a real map. Draw the layers once, then move the objects — the `data-id`
attributes are there for exactly this.

```ts
import { systemPositions } from '@cotontigeh/starmap'
import { renderSystemContent, systemViewBox, viewBoxAttr } from '@cotontigeh/starmap-render'

svgElement.setAttribute('viewBox', viewBoxAttr(systemViewBox(system)))
svgElement.innerHTML = renderSystemContent(system, { t: 0 })

const moving = new Map(
  [...system.planets, ...system.gates].map((o) => [
    o.id,
    svgElement.querySelector(`[data-id="${o.id}"]`),
  ]),
)

function update(t: number): void {
  const pos = systemPositions(system, t)
  for (const [id, node] of moving) {
    const at = pos.get(id)
    if (at) node.setAttribute('transform', `translate(${at.x} ${at.y})`)
  }
}
```

Stations move with their planet on their own — their group sits inside the
planet's, and its transform is relative.

## Pan and zoom

Own the root element, and pan and zoom become one attribute:

```ts
import { renderSystemContent, systemViewBox, viewBoxAttr } from '@cotontigeh/starmap-render'

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

One listener on the container, because the markup can be replaced at any time:

```ts
import { indexGalaxy } from '@cotontigeh/starmap'

const index = indexGalaxy(galaxy)

container.addEventListener('click', (event) => {
  const node = (event.target as Element).closest('[data-id]')
  if (!node) return
  const entry = index.get(node.getAttribute('data-id'))
  if (entry?.kind === 'station') console.log(entry.obj.docks, 'docks')
})
```

`data-kind` is on the same group when you only need the kind, without a lookup.

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
  systemViewBox,
} from '@cotontigeh/starmap-render'

const ships = group(
  { 'data-layer': 'ships', fill: '#fff' },
  fleet.map((s) => el('circle', { cx: s.x, cy: s.y, r: 3, 'data-id': s.id })),
)

const svg = svgDocument(systemViewBox(system), `${renderSystemContent(system, { t })}\n${ships}`, {
  title: system.name,
})
```

Coordinates in an overlay are world units in the system's frame — the same ones
`systemPositions()` returns.

## Show a route on the map

```ts
import { findRoute } from '@cotontigeh/starmap'

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

Give each one its own `idPrefix`:

```ts
const svgs = galaxy.systems.map((s) => renderSystem(s, { idPrefix: s.id, width: 200, height: 200 }))
```

Gradient ids are global to the page. Without distinct prefixes, every drawing
after the first would use the first one's star colour.

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
