# Architecture

How the package is built, file by file. Read this before changing the code.

For what it does, see the [README](../README.md). For what a drawing is made of,
see [drawing.md](drawing.md).

## Contents

- [The map](#the-map)
- [The pipeline](#the-pipeline)
- [`svg.ts` — the string primitives](#svgts--the-string-primitives)
- [`theme.ts` — the look](#themets--the-look)
- [`geometry.ts` — framing and shapes](#geometryts--framing-and-shapes)
- [`root.ts` — the `<svg>` element](#rootts--the-svg-element)
- [`system.ts` and `galaxy.ts` — the drawings](#systemts-and-galaxyts--the-drawings)
- [`index.ts` — the public surface](#indexts--the-public-surface)
- [Rules the code holds itself to](#rules-the-code-holds-itself-to)
- [The tests](#the-tests)
- [Where to change what](#where-to-change-what)

## The map

```
packages/starmap-render/
  src/
    index.ts          public API — the only file that re-exports
    core/
      svg.ts          escaping, number formatting, element building
      theme.ts        Theme, ThemeInput, DEFAULT_THEME, resolveTheme
      geometry.ts     framing, scales, arcs, backdrop
      root.ts         the <svg> element around a drawing
      system.ts       renderSystem(), renderSystemContent()
      galaxy.ts       renderGalaxy(), renderGalaxyContent()
  tests/
    fixture.ts        one universe with one of everything drawable
    xml.ts            a thirty-line well-formedness check
    svg.test.ts       the primitives
    theme.test.ts     merging and fallbacks
    geometry.test.ts  framing, arcs, determinism
    system.test.ts    the system drawing
    galaxy.test.ts    the galaxy drawing
    snapshots.test.ts golden drawings, kept in __snapshots__/ as .svg files
    purity.test.ts    the house rule, file by file
  docs/               theming, drawing, recipes, this file
```

```
index.ts ──► system.ts ──┬──► root.ts ──► geometry.ts ──► @industrieh/starmap
         ──► galaxy.ts ──┤              └► svg.ts
                         ├──► theme.ts
                         ├──► geometry.ts
                         └──► svg.ts
```

No cycles. `theme.ts` imports nothing at all; `svg.ts` imports the core's
`round()` and one type.

## The pipeline

A drawing is built in one pass, bottom up:

```
data + options
      │
      ▼
resolveTheme()      colours filled in from the default
systemViewBox()     the frame — everything else is a fraction of it
systemPositions()   where every object is at t          (from the core)
      │
      ▼
draw* functions     one per layer, each returning a string — only the layers
      │             asked for are computed (`layers`, in SYSTEM_LAYERS order)
      ▼
join('\n')          the layers                          → renderSystemContent()
svgDocument()       the <svg> around them               → renderSystem()
```

Two properties fall out of that shape, and both are worth keeping:

**A drawing is a pure function.** Same data, same `t`, same theme, same string —
byte for byte. That is what makes a snapshot test, an HTTP cache or a diff
possible downstream, and it is why `Math.random` and `Date` are banned rather
than merely discouraged.

**The layers exist without the document.** `renderSystemContent()` is not a
convenience wrapped around `renderSystem()`; it is the other way round.
An application that pans and zooms owns the root element, so it must be able to
get the body alone.

## `svg.ts` — the string primitives

Seven functions, and the only place in the package where a `<` is written:

| function                 | what it does                                       |
| ------------------------ | -------------------------------------------------- |
| `escapeXml(value)`       | `&`, `<`, `>`, `"`, `'` — `&` first                |
| `num(value)`             | two decimals, no exponent, `0` for non-finite      |
| `el(name, attrs, kids?)` | one element, self-closing when it has no children  |
| `group(attrs, parts)`    | a `<g>`, one part per line, empty when it is empty |
| `text(content, attrs)`   | a `<text>` whose content is escaped                |
| `dash(...lengths)`       | a `stroke-dasharray`                               |
| `background(view, fill)` | the rectangle behind everything                    |

Centralising them is what makes escaping and rounding unmissable: a drawing
function cannot forget them, because it never builds a tag itself.

Two details that look arbitrary and are not:

- `el` drops attributes that are `undefined` or `false`, and keeps `0`. That is
  what lets a call site write `stroke-dasharray: on ? undefined : dash(...)`
  instead of branching around the whole element.
- `dash` exists because a dash pattern is the one length that would otherwise be
  interpolated into a string, escaping `num` — and putting
  `3.2624999999999997` in the output.

`background()` draws a rectangle three times the size of the `viewBox`.
`preserveAspectRatio` letterboxes a drawing whose box does not match the space it
is given, and those bands sit outside the `viewBox`: a rectangle of exactly the
right size leaves them transparent, showing the page through them.

## `theme.ts` — the look

`ThemeInput` → `resolveTheme()` → `Theme`, mirroring the core's `GalaxyInput` →
`createGalaxy()` → `Galaxy`. Tables merge key by key; a `RouteStyle` is replaced
whole.

Every table carries a required `default`. The core's vocabularies are open
unions, so a table can never be exhaustive, and `pickColor()` always has
something to return. Fields like `planet.type` are optional in the model too, so
the `undefined` key is the common case, not the edge case.

`stripUndefined()` is the one subtlety: without it, `{ background: undefined }`
would spread over the default and punch a hole in the theme.

## `geometry.ts` — framing and shapes

Everything the core deliberately does not carry, because it is about drawing
rather than about the world:

- `systemViewBox`, `galaxyViewBox` — the frame. Both guard against degenerate
  input: a system whose `outerLimit` is `0`, a galaxy with one system or none,
  systems in a straight line. A box with no area renders as nothing at all.
- `arcPath` — belts. Past 359.5° it emits two half circles, because one SVG arc
  cannot close a circle.
- `backdropStars` — scenery, on its own seed. It reuses `mulberry32` and
  `hashSeed` from the core rather than carrying its own PRNG. It sows a square
  centred on the origin: the system drawing is centred there already, and the
  galaxy drawing offsets the stars onto the centre of its view.
- `systemScale`, `galaxyScale` — the size units of each drawing, exported so an
  overlay can match them.

The `scale` parameter on `backdropStars` is there because dots are sized in
world units: a galaxy-wide view needs bigger ones than a single system for the
sky to look the same.

## `root.ts` — the `<svg>` element

One function, `svgDocument(view, body, options)`. It writes `xmlns` — which is
what makes the string usable outside an HTML parser — `viewBox`,
`preserveAspectRatio`, optional pixel dimensions, and an optional `<title>` with
`role="img"` beside it. `role: false` drops the role for an interactive drawing,
whose objects `role="img"` would hide from assistive technology.

The file is called `root.ts` and not `document.ts` because `purity.test.ts`
rejects the word `document` anywhere in the sources, import paths included. The
check is worth more than the better file name.

## `system.ts` and `galaxy.ts` — the drawings

Both files have the same shape: a public pair (`renderX` / `renderXContent`), a
scale computed from the view, then one `draw*` function per layer, each
returning a string and none of them touching anything outside its arguments. A
record maps each layer name to its function, and `renderXContent()` walks
`SYSTEM_LAYERS` / `GALAXY_LAYERS` in order, calling only the ones asked for —
system positions are computed only if a layer needs them.

The gradient ids are prefixed with `idPrefixOf(options.idPrefix ?? …)`, which
replaces anything an XML id cannot hold. The system's default prefix is built
from its id, so drawings of different systems never share a gradient.

`systemScale()` returns the scale that matters most:

| name   | value          | used for                        |
| ------ | -------------- | ------------------------------- |
| `u`    | `view.w / 200` | glyph sizes, gaps, dash lengths |
| `k`    | `view.w / 800` | stroke widths                   |
| `font` | `view.w / 65`  | labels                          |

A system may be 300 world units across or 30 000. Anything sized absolutely
would fill the view in one and vanish in the other. What keeps its real size is
everything the model states: star radius, planet radius, orbits, belt width,
rock positions.

`galaxy.ts` has its own scale, `galaxyScale()`, expressed as fractions of the
largest dimension, and one thing `system.ts` does not: `pathPairs()` turns the
`highlight` path into the set of lane keys to light. A lane key is its two
endpoints in order, as JSON, because a hyperlane is undirected — `['a','b']` and
`['b','a']` are the same lane — and JSON keeps ids holding any separator apart.

Both draw functions tolerate references that resolve to nothing. A lane whose
endpoint does not exist, a route pointing at a missing object: they are skipped
rather than crashed on, because these functions also run on galaxies parsed from
disk, which the type system says nothing about.

## `index.ts` — the public surface

The only file that re-exports, grouped by role. Anything not listed there is an
implementation detail — `package.json` exposes a single export path, so `core/`
is unreachable from outside.

## Rules the code holds itself to

- **Import the core, or something relative. Nothing else.** No DOM, no
  framework, no stylesheet.
- **No clock, no unseeded randomness.** A drawing is a function of its
  arguments.
- **Every string that comes from data is escaped.** Names are user data.
- **Every number that reaches the output goes through `num()`.**
- **An empty layer is not emitted.**
- **The world keeps its units; the drawing scales with the view.**

The first two are enforced by `tests/purity.test.ts`, and by
`tsconfig.base.json` dropping `DOM` from `lib`.

## The tests

| file                | covers                                                  |
| ------------------- | ------------------------------------------------------- |
| `fixture.ts`        | one universe with one of everything drawable            |
| `xml.ts`            | tag balance and unescaped text, without a parser        |
| `svg.test.ts`       | escaping, rounding, attribute dropping, empty groups    |
| `theme.test.ts`     | merging, fallbacks, and that the default is not mutated |
| `geometry.test.ts`  | framing, degenerate galaxies, arcs, scales, determinism |
| `system.test.ts`    | layers, ids, positions at `t`, options, labels          |
| `galaxy.test.ts`    | lanes, highlighting, escaping, backdrop, an empty map   |
| `snapshots.test.ts` | three golden drawings, kept as real `.svg` files        |
| `purity.test.ts`    | the house rule, file by file                            |

The assertions are on what ends up in the string — an object's group, an id, a
colour — not on exact markup. Pinning the markup down would turn every visual
improvement into a failing test.

The one exception is `snapshots.test.ts`, deliberately: three drawings pinned to
`tests/__snapshots__/*.svg`, which open as pictures. Loose assertions let a
visual regression through — the galaxy backdrop once covered only a corner of
any map not centred on the origin — and a golden file does not. When a change to
the look is intended, open the new files, then run `bunx vitest run -u`.

The fixture is built with `createGalaxy()`, so it is validated on the way in.
A drawing test can never fail because the fixture drifted out of the data
contract.

## Where to change what

| you want to                       | touch                                                         |
| --------------------------------- | ------------------------------------------------------------- |
| change how an object looks        | the `draw*` function in `system.ts`, `docs/drawing.md`        |
| add a colour                      | `theme.ts` (both `Theme` and `ThemeInput`), `docs/theming.md` |
| add a render option               | the options interface, the destructuring, the README table    |
| add a layer                       | the layer type and list, the `draw` record, `docs/drawing.md` |
| change the framing                | `geometry.ts`, `geometry.test.ts`                             |
| add an attribute to every element | `svg.ts`, and nowhere else                                    |
| draw a new kind of object         | a new `draw*` function, plus its place in the layer order     |

The checklists for each are in [CONTRIBUTING.md](../CONTRIBUTING.md).
