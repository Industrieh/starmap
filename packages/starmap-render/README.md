# @industrieh/starmap-render

Turn a [`@industrieh/starmap`](../starmap) universe into SVG.

```ts
import { createGalaxy } from '@industrieh/starmap'
import { renderSystem } from '@industrieh/starmap-render'

const galaxy = createGalaxy({
  systems: [
    {
      id: 'sol',
      name: 'Sol',
      x: 0,
      y: 0,
      star: { class: 'G', radius: 18 },
      planets: [{ name: 'Earth', type: 'terran', orbit: 150, radius: 6, period: 24 }],
    },
  ],
})

const svg = renderSystem(galaxy.systems[0], { t: 12.5 })
// '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-226.2 -226.2 452.4 452.4">…'

await Bun.write('sol.svg', svg)
```

It returns a **string**. No DOM, no framework, no stylesheet. One dependency:
the core.

## Contents

- [Install](#install)
- [What it does](#what-it-does)
- [Draw a system](#draw-a-system)
- [Draw a galaxy](#draw-a-galaxy)
- [Use the output](#use-the-output)
- [Animate it](#animate-it)
- [Theme it](#theme-it)
- [Make it interactive](#make-it-interactive)
- [API](#api)
- [Guides](#guides)
- [Working with an AI](#working-with-an-ai)

## Install

```bash
bun add @industrieh/starmap @industrieh/starmap-render
```

Not on npm yet. Until then, install it from a path or from git:

```bash
bun add @industrieh/starmap-render@file:../starmap/packages/starmap-render
```

The core is a real dependency, not a peer one, and it is never bundled in — your
application ends up with one copy of it.

## What it does

| It does                                        | It does not                |
| ---------------------------------------------- | -------------------------- |
| turn a system or a galaxy into an SVG string   | touch the DOM              |
| place everything at a moment `t` you choose    | run a clock                |
| take its colours from a theme you pass         | ship a stylesheet          |
| tag every object with its id, for hit-testing  | handle clicks, pan or zoom |
| give you the layers without the `<svg>` around | pick a framework for you   |

A string is consumed everywhere: a `.svg` file, a `data:` URI, an `<img src>`, a
server-rendered thumbnail, `innerHTML`, `dangerouslySetInnerHTML`. A component
would only work in one framework.

Interaction follows the same line. Pan, zoom, selection and the clock are
application state, and every project handles them its own way. This package
draws one frame.

## Draw a system

`renderSystem(system, options)` returns a complete document.

```ts
import { indexSystems } from '@industrieh/starmap'
import { renderSystem } from '@industrieh/starmap-render'

const svg = renderSystem(galaxy.systems[0], {
  t: 12.5, // simulation seconds — where the planets are
  width: 800, // optional; without it the drawing fills its container
  height: 800,
  title: 'The Sol system', // announced by a screen reader
  systems: indexSystems(galaxy), // lets a gate label say where it leads
})
```

What ends up in the drawing, back to front: the background, a field of
decorative stars, orbit circles, asteroid fields, local routes, the star,
planets with their stations, then gates.

| option            | default     | what it does                                           |
| ----------------- | ----------- | ------------------------------------------------------ |
| `t`               | `0`         | simulation time, in seconds                            |
| `theme`           | dark        | colours, merged over the default                       |
| `margin`          | `0.45`      | space around the system, as a fraction of `outerLimit` |
| `labels`          | `true`      | draw names                                             |
| `backdrop`        | `260`       | how many background stars; `0` for none                |
| `idPrefix`        | `'starmap'` | prefix of the gradient ids — see below                 |
| `systems`         | —           | `indexSystems(galaxy)`, to name gate destinations      |
| `width`, `height` | —           | pixel size attributes                                  |
| `title`           | —           | accessible name                                        |

**Two drawings on one page need two `idPrefix` values.** A page shares one id
namespace, so two systems drawn with the same prefix would both use the first
one's star colour. The system's own id makes a good prefix.

## Draw a galaxy

`renderGalaxy(galaxy, options)` draws the network: systems as points, hyperlanes
as the lines between them.

```ts
import { findRoute } from '@industrieh/starmap'
import { renderGalaxy } from '@industrieh/starmap-render'

const route = findRoute(galaxy, 'sol', 'kepler')
const svg = renderGalaxy(galaxy, { highlight: route?.systemIds })
```

`highlight` takes an ordered list of system ids — exactly what `findRoute()`
returns. Every system in it is emphasised, and so is every lane between two
consecutive entries.

Nothing moves here, so there is no `t`. At galaxy scale a planet is smaller than
a rounding error.

| option                     | default     | what it does                            |
| -------------------------- | ----------- | --------------------------------------- |
| `theme`                    | dark        | colours, merged over the default        |
| `margin`                   | `0.12`      | space around the systems                |
| `labels`                   | `true`      | draw system names                       |
| `backdrop`                 | `400`       | how many background stars; `0` for none |
| `idPrefix`                 | `'starmap'` | prefix of the gradient id               |
| `highlight`                | —           | a path to bring forward                 |
| `width`, `height`, `title` | —           | same as above                           |

## Use the output

```ts
// A file
await Bun.write('sol.svg', renderSystem(system))

// An <img>, with no second request
const uri = `data:image/svg+xml,${encodeURIComponent(renderSystem(system))}`

// A page, on the server or in the browser
const html = `<figure>${renderSystem(system)}</figure>`
```

In React: `dangerouslySetInnerHTML={{ __html: renderSystem(system) }}`. The
string is built from your own data, and every name in it is escaped on the way
out.

## Animate it

`t` is simulation seconds, compared against each object's `period`. The package
keeps no clock: your loop decides how fast time moves, whether it pauses, and
whether it runs backwards.

```ts
let t = 0
const frame = (): void => {
  t += 1 / 60
  container.innerHTML = renderSystem(system, { t })
  requestAnimationFrame(frame)
}
```

Rebuilding the whole string every frame is fine for a preview and wasteful for a
real map. When you get there, draw the layers once with `renderSystemContent()`
and move the objects yourself with `systemPositions()` from the core — the
`data-id` attributes are there for exactly that. See
[docs/recipes.md](docs/recipes.md).

## Theme it

The core carries no colour: `planet.type → appearance` is a decision of the
project that displays it. So it enters here.

```ts
const svg = renderSystem(system, {
  theme: {
    background: '#000',
    planets: { terran: '#7ee787', shattered: '#7d7d8b' },
  },
})
```

A table you pass is merged over the default one, key by key — overriding one
colour keeps the other twenty. Every table has a `default` entry, used for a
value it does not list, so a project that invents a planet type still gets a
complete drawing.

The whole theme is in [docs/theming.md](docs/theming.md).

## Make it interactive

Every object is drawn in a group that says what it is and which object it is:

```html
<g data-kind="planet" data-id="earth" transform="translate(129.9 75)"></g>
```

One listener on the container is enough — no per-object handlers, and the markup
can be replaced wholesale on the next frame:

```ts
container.addEventListener('click', (event) => {
  const node = (event.target as Element).closest('[data-id]')
  if (node) select(node.getAttribute('data-id'))
})
```

Layers carry `data-layer` (`backdrop`, `orbits`, `fields`, `routes`, `planets`,
`gates`, `lanes`, `systems`), which is what you style or hide from CSS.

For pan and zoom, take the layers without the document around them and own the
`viewBox` yourself:

```ts
import { renderSystemContent, systemViewBox, viewBoxAttr } from '@industrieh/starmap-render'

const box = systemViewBox(system)
svgElement.setAttribute('viewBox', viewBoxAttr(box)) // then change it as you zoom
svgElement.innerHTML = renderSystemContent(system, { t })
```

## API

### Drawing

| function                             | what it does                         |
| ------------------------------------ | ------------------------------------ |
| `renderSystem(system, options?)`     | one system, as a full SVG document   |
| `renderSystemContent(system, opts?)` | the same layers, without the `<svg>` |
| `renderGalaxy(galaxy, options?)`     | the network, as a full SVG document  |
| `renderGalaxyContent(galaxy, opts?)` | the same layers, without the `<svg>` |
| `svgDocument(view, body, options?)`  | wrap your own layers in a document   |

### Framing and shapes

| function                                     | what it does                       |
| -------------------------------------------- | ---------------------------------- |
| `systemViewBox(system, margin?)`             | the box a system is drawn in       |
| `galaxyViewBox(galaxy, margin?)`             | the box a galaxy is drawn in       |
| `viewBoxAttr(view)`                          | that box, as the attribute string  |
| `arcPath(r, startDeg, sweepDeg)`             | the `d` of an arc — asteroid belts |
| `backdropStars(count, radius, seed, scale?)` | a deterministic field of dots      |

### Theme

| export                       | what it is                               |
| ---------------------------- | ---------------------------------------- |
| `DEFAULT_THEME`              | the dark theme, complete                 |
| `resolveTheme(input?)`       | fill a partial theme in from the default |
| `pickColor(table, key)`      | a colour, falling back to `default`      |
| `pickRouteStyle(table, key)` | a route style, same rule                 |

### SVG string building blocks

`el`, `group`, `text`, `escapeXml`, `num`, `dash`, `background` — the functions
this package builds every tag with. Use them to draw your own overlays in the
same document.

```ts
import { el, group } from '@industrieh/starmap-render'

const ships = group(
  { 'data-layer': 'ships' },
  fleet.map((s) => el('circle', { cx: s.x, cy: s.y, r: 3, fill: '#fff' })),
)
const svg = renderSystem(system, { t }).replace('</svg>', `${ships}</svg>`)
```

### Units and conventions

Inherited from the core, unchanged: positions in world units, Y pointing down,
angles in degrees measured clockwise with `0` pointing right, periods in
simulation seconds. A system's star sits at `(0, 0)`.

Sizes that belong to the drawing rather than to the world — glyphs, labels,
stroke widths — are fractions of the view, so a system 300 units across and one
30 000 units across look the same.

## Guides

- [docs/theming.md](docs/theming.md) — every colour, and how to replace it
- [docs/drawing.md](docs/drawing.md) — how a star, a planet and a belt are built
- [docs/recipes.md](docs/recipes.md) — files, thumbnails, React, pan and zoom,
  animation, overlays
- [docs/architecture.md](docs/architecture.md) — how the code is built, file by
  file
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to work on the package

## Working with an AI

This library is younger than the training data of most assistants, so a model
asked about it cold will invent an API that looks plausible and does not exist.
Two files exist to prevent that:

| file                                                             | what it is                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [`/llms.txt`](https://starmap.industrieh.dev/llms.txt)           | the map — every documentation page with a one-line description, a few kilobytes |
| [`/llms-full.txt`](https://starmap.industrieh.dev/llms-full.txt) | everything — both packages' READMEs and guides in one file, ~120 KB             |

In an agent that reads project instructions — Claude Code, Cursor, Copilot — one
line does it:

```md
When writing code against @industrieh/starmap-render, read
https://starmap.industrieh.dev/llms-full.txt first. It is the complete
documentation of the renderer and of the core it draws.
```

In a chat, paste the URL. Offline, download the file and attach it — both are
plain text.

Two things worth telling a model up front, because nothing in the types says so:

- **This package returns strings, not components.** If it suggests a `<Galaxy />`
  or a hook, it is inventing. `renderGalaxy()` gives you SVG markup, and where it
  goes is your decision.
- **It draws one frame, for one moment.** Pan, zoom, hover and selection are not
  here on purpose — `data-id` and `data-kind` are the hooks, the handlers are
  yours.

## Developing

This package lives in a Bun monorepo. See the [root README](../../README.md) for
the repo-wide commands.

```
packages/starmap-render/
  src/
    index.ts            public API
    core/
      svg.ts            escaping, number formatting, element building
      theme.ts          Theme, ThemeInput, DEFAULT_THEME
      geometry.ts       framing, arcs, backdrop
      root.ts           the <svg> element
      system.ts         renderSystem()
      galaxy.ts         renderGalaxy()
  tests/                svg, theme, geometry, system, galaxy, purity
  docs/                 theming, drawing, recipes, architecture
```

| command              | what it does                 |
| -------------------- | ---------------------------- |
| `bun run build`      | build to `dist/` with tsdown |
| `bun run test`       | Vitest                       |
| `bun run test:watch` | Vitest in watch mode         |
| `bun run typecheck`  | `tsc --noEmit`               |

**The house rule: `src/` imports the core and nothing else.** No DOM, no
framework, no stylesheet, no clock, no unseeded randomness.
`tests/purity.test.ts` checks that file by file, and `tsconfig.base.json` drops
`DOM` from `lib` so a slip is a compile error.
