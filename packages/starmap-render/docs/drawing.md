# How things are drawn

What the SVG is actually made of, object by object. Read this before changing
what a drawing looks like, and when you want to draw something in the same
style.

Everything here uses native SVG primitives only. No filter, no texture, no
bitmap, no drawing library.

## Contents

- [Layers](#layers)
- [The three gradients](#the-three-gradients)
- [A star](#a-star)
- [A planet](#a-planet)
- [A ring](#a-ring)
- [A station](#a-station)
- [A gate](#a-gate)
- [An asteroid field](#an-asteroid-field)
- [A local route](#a-local-route)
- [The galaxy map](#the-galaxy-map)
- [Two scales](#two-scales)
- [Where the coordinates come from](#where-the-coordinates-come-from)

## Layers

A drawing is a flat list of groups, back to front. The order is the whole
composition — there is no `z-index` in SVG, only document order.

| system view    | galaxy view | holds                                       |
| -------------- | ----------- | ------------------------------------------- |
| the background | ✓           | one rectangle, three times the `viewBox`    |
| `backdrop`     | ✓           | decorative stars                            |
| `orbits`       | —           | planet circles, gate circles                |
| `fields`       | —           | belts, clusters and their rocks             |
| `routes`       | —           | local routes, so they pass under everything |
| the star       | —           | halo and disc                               |
| `planets`      | —           | planets, each with its stations             |
| `gates`        | —           | gates and their labels                      |
| —              | `lanes`     | hyperlanes                                  |
| —              | `systems`   | system dots, rings and names                |

Each group carries `data-layer`, which is what an application styles or hides.
A layer with nothing in it is not emitted at all: a system with no gates
produces no gate group, rather than an empty one.

## The three gradients

Declared once in `<defs>` and referenced by everything that needs them. They are
what gives the drawing its volume — and they replace a blur filter, which is the
expensive part of rasterizing an SVG.

```
<radialGradient id="{prefix}-glow">    the star's halo
  0%   star colour, opacity 0.85
  35%  star colour, opacity 0.22
  100% star colour, opacity 0

<radialGradient id="{prefix}-core">    the stellar disc
  0%   white
  60%  star colour
  100% star colour, opacity 0.85

<radialGradient id="{prefix}-shade" cx="0.32" cy="0.3" r="0.85">   planet volume
  0%   white, opacity 0.28
  45%  black, opacity 0
  100% black, opacity 0.6
```

`shade` is off-centre on purpose: the lit side is up and to the left. The light
does **not** follow the real position of the star. At these sizes the difference
is invisible, and one shared gradient beats one gradient per planet.

The ids are prefixed because a page shares one id namespace. Two drawings with
the same prefix would both resolve `url(#starmap-core)` to the first one's
gradient, so the second system would wear the first one's star colour. Hence
`idPrefix`.

## A star

Two circles, centred on the origin:

```html
<circle r="{radius * 6}" fill="url(#{prefix}-glow)" />
<circle r="{radius}" fill="url(#{prefix}-core)" />
```

The halo is six times the disc. That ratio is what reads as brightness — a
smaller one looks like a flat dot with an outline.

## A planet

A stack of circles inside a group translated to the planet's position:

```html
<g data-kind="planet" data-id="earth" transform="translate(129.9 75)">
  <ellipse … />
  <!-- only for a ringed giant -->
  <circle r="6" fill="{type colour}" />
  <!-- the disc -->
  <circle r="6" fill="url(#…-shade)" />
  <!-- the volume -->
  <circle r="6.9" … />
  <!-- only if habitable -->
  <text …>Earth</text>
  <g data-kind="station" … />
  <!-- each station -->
</g>
```

The shading circle is exactly the size of the disc and sits on top of it. The
habitable marker is a thin ring just outside the disc, in the theme's
`habitable` colour.

## A ring

An `<ellipse>` wider than it is tall, rotated slightly, with no fill and a thick
stroke in the planet's own colour:

```html
<ellipse rx="{r * 1.9}" ry="{r * 0.55}" stroke-width="{r * 0.28}" transform="rotate(-18)" />
```

It is drawn **before** the disc, so the disc hides its near half. That overlap is
the entire trick that reads as perspective — nothing else about the drawing is
three-dimensional.

A planet gets one when its type is `gas` or `ice-giant` **and** it has three
moons or more. Moons themselves are never drawn; the count is only used as a
hint that the planet is a big one.

## A station

A small square turned 45°, positioned **relative to its planet** — the enclosing
group already carries the planet's translation, so the station only needs the
difference between the two positions. That is what makes it follow its planet
around the orbit for free.

Its colour comes from the `stations` table, keyed by `station.type`.

## A gate

Four parts, in order: a translucent disc, a square rotated by `45 + gate.angle`,
an optional dashed warning ring when `status` is `'unstable'`, and a label.

The square turns with the gate so that a ring of gates does not look stamped
from one mould.

The label is the gate's name, or `Sol Gate → Vega` when the `systems` option
gives the renderer an index to resolve `gate.links` with.

## An asteroid field

A belt is one thick stroke along an arc:

```html
<path
  d="M 187.94 68.4 A 200 200 0 0 1 -187.94 68.4"
  stroke-width="{width + 2u}"
  stroke-opacity="0.22"
/>
```

`arcPath()` builds that `d`. A single SVG arc cannot describe a full circle — its
end point would be its start point, and the arc would be empty — so past 359.5°
it becomes two half circles.

A cluster is a dashed circle instead, centred on its own `x`/`y`.

Both then draw whatever `rocks` the model carries, as plain circles. The library
never invents rocks: an empty `rocks` array draws an empty field, which is the
honest picture.

## A local route

A straight line between the two positions of this frame. Both ends are looked up
by id in the same map the planets came from, so a route to a station follows it
around its planet.

Routes are drawn before every object, so they pass underneath rather than across.

## The galaxy map

Each system is three circles and a name: a halo, a faction ring, and a dot
coloured by the star's class. The faction ring is dashed, and becomes solid and
thicker when the system is on the highlighted path — a difference that survives
greyscale.

Hyperlanes are dashed lines between the two system positions. A highlighted lane
is solid, thicker and in the `highlight` colour.

Nothing on this map moves, so there is no `t`.

## Two scales

A system can be 300 world units across or 30 000. Anything sized in absolute
units would fill the view in one and vanish in the other, so decorations are
fractions of the view instead:

| name   | value          | used for                        |
| ------ | -------------- | ------------------------------- |
| `u`    | `view.w / 200` | glyph sizes, gaps, dash lengths |
| `k`    | `view.w / 800` | stroke widths                   |
| `font` | `view.w / 65`  | labels                          |

What keeps its real size is everything that belongs to the world: star radius,
planet radius, orbits, belt widths, rock positions. That is the line — if the
model says how big it is, it is drawn that big.

## Where the coordinates come from

`systemPositions(system, t)` in the core, always. This package computes no
orbital position of its own; it asks for the whole map of them once per drawing
and looks each object up by id.

Everything is drawn in the system's own frame — star at `(0, 0)`, distances in
world units — and the `viewBox` does the scaling. No coordinate is ever
converted to pixels, which is what lets one string be a 32-pixel thumbnail and a
full-screen map.
