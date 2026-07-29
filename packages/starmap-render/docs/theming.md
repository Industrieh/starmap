# Theming

Every colour in a drawing comes from a theme you pass. The core carries none —
`planet.type → appearance` is a decision of the project that displays it, and a
colour baked into the data is useless the day that project needs a light mode.

For the shapes those colours are applied to, see [drawing.md](drawing.md).

## Contents

- [Two layers](#two-layers)
- [The tables](#the-tables)
- [The single colours](#the-single-colours)
- [Route styles](#route-styles)
- [Every default](#every-default)
- [A light theme](#a-light-theme)
- [Reusing the theme in your own code](#reusing-the-theme-in-your-own-code)

## Two layers

`ThemeInput` is what you write, `Theme` is what the drawing functions read, and
`resolveTheme()` goes from one to the other. It is the same split the core makes
between `GalaxyInput` and `Galaxy`.

```ts
import { renderSystem, resolveTheme } from '@cotontigeh/starmap-render'

// Inline: resolved on every call.
renderSystem(system, { theme: { background: '#000' } })

// Resolved once, then reused. Do this if you render every frame.
const theme = resolveTheme({ background: '#000' })
renderSystem(system, { theme })
```

Merging goes one level deep. A table you pass is merged **key by key**, so
overriding one planet colour keeps the other ten:

```ts
resolveTheme({ planets: { terran: '#7ee787' } }).planets.gas // still '#d8a06a'
```

Nothing is merged deeper than that. A `RouteStyle` is replaced whole, because a
dash pattern without its width is not a style.

## The tables

Five fields are tables keyed by a value from the model:

| table      | keyed by          | drawn as                                |
| ---------- | ----------------- | --------------------------------------- |
| `stars`    | `star.class`      | the stellar disc, its halo, system dots |
| `planets`  | `planet.type`     | the planet disc and its ring            |
| `stations` | `station.type`    | the station diamond                     |
| `factions` | `faction.id`      | the ring around a system on the map     |
| `routes`   | `localRoute.type` | the stroke of a local route             |

Every table carries a `default` entry, and it is required. The core's
vocabularies are open unions: a project may invent `'shattered'` and the model
accepts it. A table can therefore never be exhaustive, and `default` is what
keeps the drawing complete.

```ts
const theme = resolveTheme({ planets: { shattered: '#7d7d8b' } })
pickColor(theme.planets, 'shattered') // '#7d7d8b'
pickColor(theme.planets, 'crystal') // the default — nothing goes missing
pickColor(theme.planets, undefined) // the same: the field was left out
```

The last line is the common case. `type`, `class`, `faction` and friends are all
optional in the model, and a drawing still has to put something on screen.

## The single colours

| field          | where it shows                                      |
| -------------- | --------------------------------------------------- |
| `background`   | fills the drawing, behind everything                |
| `backdropStar` | the decorative star field, and the system halo      |
| `label`        | every piece of text                                 |
| `font`         | the font stack written on the label groups          |
| `orbit`        | planet orbit circles                                |
| `gateOrbit`    | gate orbit circles, dashed                          |
| `lane`         | hyperlanes on the galaxy map                        |
| `highlight`    | systems and lanes on a highlighted path             |
| `habitable`    | the ring around a planet whose `habitable` is true  |
| `gate`         | the gate body                                       |
| `gateUnstable` | the ring around a gate whose `status` is `unstable` |
| `field`        | the outline of a belt or a cluster                  |
| `rock`         | the rocks inside them                               |

## Route styles

A route style is three fields:

```ts
{ stroke: '#5f7fa8', dash: '6 8', width: 1.1 }
```

`dash` is an SVG `stroke-dasharray`, and each route type gets a distinct
pattern on purpose: the map stays readable in greyscale, and to a colourblind
reader.

`width` and the dash lengths are scaled with the view before they are written
out, so a route stays a thin line in a system of any size. Think of them as
relative, not as world units.

## Every default

```ts
DEFAULT_THEME = {
  background: '#070b16',
  backdropStar: '#cdd9ff',
  label: '#dbe4f5',
  font: 'ui-sans-serif, system-ui, sans-serif',
  orbit: '#2b3d63',
  gateOrbit: '#43356e',
  lane: '#39507a',
  highlight: '#9a7bff',
  habitable: '#4fd8a5',
  gate: '#9a7bff',
  gateUnstable: '#ff6b81',
  field: '#6b5a2a',
  rock: '#a89468',

  stars: {
    O: '#9bb0ff',
    B: '#aabfff',
    A: '#cad7ff',
    F: '#f8f7ff',
    G: '#ffe9a8',
    K: '#ffc16f',
    M: '#ff8f5a',
    default: '#ffe9a8',
  },

  planets: {
    lava: '#e2542c',
    rocky: '#a08d7d',
    desert: '#d9a45b',
    barren: '#8b8377',
    terran: '#4fae6a',
    ocean: '#2f8fd8',
    toxic: '#9ac93b',
    gas: '#d8a06a',
    'ice-giant': '#6fb6d9',
    frozen: '#cfe4f0',
    default: '#8b8377',
  },

  stations: {
    trade: '#61d6c4',
    mining: '#c9a227',
    military: '#ff6b81',
    research: '#7fb3ff',
    shipyard: '#d0a6ff',
    default: '#9fb4d8',
  },

  factions: {
    neutral: '#8e9bb3',
    consortium: '#4ea3ff',
    covenant: '#ff5c72',
    syndicate: '#c78bff',
    pilgrims: '#4fd8a5',
    default: '#8e9bb3',
  },

  routes: {
    orbital: { stroke: '#5f7fa8', dash: '6 8', width: 1.1 },
    shortcut: { stroke: '#43607f', dash: '2 10', width: 0.9 },
    docking: { stroke: '#61d6c4', dash: '3 4', width: 0.8 },
    'jump-lane': { stroke: '#9a7bff', dash: '10 6', width: 1.4 },
    mining: { stroke: '#c9a227', dash: '4 6', width: 0.9 },
    default: { stroke: '#5f7fa8', dash: '6 8', width: 1.1 },
  },
}
```

The star colours follow spectral class — blue for O, orange-red for M — and the
planet colours follow the usual reading of each type. They are calibrated
against each other, which is the only reason they are the default. Replace them
freely.

## A light theme

Nothing in the package assumes a dark background. The one thing to remember is
that the star halo and the planet shading are drawn with fixed white and black
gradients, so a very light background flattens the star.

```ts
const light = resolveTheme({
  background: '#f6f7fb',
  backdropStar: '#c3cadb',
  label: '#1c2333',
  orbit: '#c8d1e4',
  gateOrbit: '#cfc4e8',
  lane: '#a9b6cf',
  field: '#d8c89a',
  rock: '#b8a274',
})
```

Turning the backdrop off (`backdrop: 0`) usually reads better in light mode.

## Reusing the theme in your own code

`pickColor` and `pickRouteStyle` are exported, so an overlay you draw yourself
picks its colours the same way the package does:

```ts
import { DEFAULT_THEME, el, pickColor } from '@cotontigeh/starmap-render'

const marker = (planet: Planet) =>
  el('circle', {
    r: planet.radius + 4,
    fill: 'none',
    stroke: pickColor(DEFAULT_THEME.planets, planet.type),
  })
```

They are also the right way to build a legend: iterate over the table you care
about, skip `default`, and you have every colour with its label.
