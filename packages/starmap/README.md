# @industrieh/starmap

Describe a star system in a plain object. Get back a checked, queryable universe.

```ts
import { createGalaxy } from '@industrieh/starmap'

const galaxy = createGalaxy({
  systems: [
    {
      id: 'sol',
      name: 'Sol',
      x: 0,
      y: 0,
      star: { class: 'G', radius: 18 },
      planets: [{ name: 'Earth', orbit: 150, radius: 6, period: 24 }],
    },
    { id: 'alpha', name: 'Alpha', x: 400, y: 300, star: { radius: 14 } },
  ],
  lanes: [{ from: 'sol', to: 'alpha' }],
})

galaxy.systems[0].planets[0].id // "sol-p0"  — filled in for you
galaxy.lanes[0].length // 500      — measured from the positions
galaxy.meta.planetCount // 1
```

No dependencies. No DOM. Nothing about rendering. The same code runs in a
browser, in Node or Bun, in a worker, on a server, under React Native, or inside
a game engine.

## Contents

- [Install](#install)
- [What it does](#what-it-does)
- [Build a universe](#build-a-universe)
- [Query it](#query-it)
- [Animate it](#animate-it)
- [Draw it](#draw-it)
- [Generate it with a script](#generate-it-with-a-script)
- [API](#api)
- [Guides](#guides)
- [Working with an AI](#working-with-an-ai)

## Install

```bash
bun add @industrieh/starmap
```

Not on npm yet. Until then, install it from a path or from git:

```bash
bun add @industrieh/starmap@file:../starmap/packages/starmap
bun add github:industrieh/starmap
```

Nothing to install alongside it — no dependencies, no peer dependencies.

## What it does

| It does                                        | It does not                           |
| ---------------------------------------------- | ------------------------------------- |
| give you a typed schema to describe a universe | generate a universe for you           |
| check that your description holds together     | judge whether your world is plausible |
| fill in ids, counts, distances, boundaries     | invent factions, types, or colors     |
| index it and answer questions about it         | draw anything                         |
| tell you where everything is at time `t`       | run a clock or a render loop          |

Both columns are deliberate.

Procedural generation is **game design**. The shape of your galaxy, your faction
table, how many planets a system gets — those are your decisions, not a
library's.

Rendering is **UI design**. Every project redoes it to fit its own look.

What the two have in common is the data model. That is what this package is.

## Build a universe

`createGalaxy(input)` takes your description, fills in what it can compute,
checks the result, and hands back a `Galaxy`.

```ts
import { createGalaxy, type GalaxyInput } from '@industrieh/starmap'

const input: GalaxyInput = {
  systems: [
    {
      id: 'sol',
      name: 'Sol',
      x: 0,
      y: 0,
      faction: { id: 'consortium', name: 'Vega Consortium' },
      security: 0.9,
      star: { class: 'G', radius: 18 },
      planets: [
        { name: 'Sol I', type: 'rocky', orbit: 90, radius: 5, period: 12 },
        {
          id: 'earth', // give it a readable id — it becomes a game-state key
          name: 'Earth',
          type: 'terran',
          orbit: 150,
          radius: 6,
          angle: 30,
          period: 24,
          habitable: true,
          stations: [{ name: 'High Anchorage', type: 'trade', orbit: 14, period: 4, docks: 8 }],
        },
      ],
      gates: [{ name: 'Sol Gate', orbit: 300, angle: 45, links: ['alpha'] }],
    },
    { id: 'alpha', name: 'Alpha', x: 400, y: 300, star: { radius: 14 } },
  ],
  lanes: [{ from: 'sol', to: 'alpha' }],
}

const galaxy = createGalaxy(input)
```

### What you must provide

| object    | required fields                                  |
| --------- | ------------------------------------------------ |
| system    | `id`, `name`, `x`, `y`, `star`                   |
| star      | `radius`                                         |
| planet    | `name`, `orbit`, `radius`                        |
| station   | `name`, `orbit`                                  |
| gate      | `name`, `orbit`                                  |
| belt      | `name`, `orbit`, `width`, `arcStart`, `arcSweep` |
| cluster   | `name`, `x`, `y`, `radius`                       |
| hyperlane | `from`, `to`                                     |

Everything else is optional.

### What gets filled in

| field                              | value                                              |
| ---------------------------------- | -------------------------------------------------- |
| `star.id`, `star.name`             | `<systemId>-star`, and the system name             |
| `planet.id`, `planet.index`        | `<systemId>-p<rank>`, and its rank in the array    |
| `station.id`, `station.planetId`   | `<planetId>-st<rank>`, and its parent planet       |
| `gate.id`, `field.id`              | `<systemId>-gate<rank>`, `<systemId>-ast<rank>`    |
| `localRoute.id`                    | `<fromId>><toId>`                                  |
| `lane.id`, `lane.length`           | `lane-<from>-<to>`, and the straight-line distance |
| `system.outerLimit`                | how far the system's contents reach, no margin     |
| `meta.*Count`, `meta.galaxyRadius` | counted and measured from the real contents        |
| `angle`, `period`                  | `0` — "sits still at its starting position"        |
| omitted arrays                     | `[]`                                               |

An id you provide is always kept.

### What never gets filled in

`type`, `class`, `faction`, `security`, `resources`, `richness`, `docks`,
`moons`, `habitable`, `density`. Leave one out and it stays `undefined`.

That is the whole rule of the library:

> **Compute what is derivable. Never invent a value that carries meaning.**

The library can work out that your second planet is `sol-p1`. It cannot work out
that it is a gas giant, so it will not pretend to.

### When your description is wrong

`createGalaxy()` throws a `GalaxyValidationError` listing **every** problem it
found, each with a path you can jump to.

```ts
try {
  createGalaxy(input)
} catch (e) {
  if (e instanceof GalaxyValidationError) {
    for (const issue of e.issues) console.error(`${issue.path}: ${issue.message}`)
    // systems[1].id: duplicate id: "sol"
    // lanes[0].to: unknown system: "vegaa"
    // systems[0].planets[0].orbit: must be strictly positive
  }
}
```

It rejects anything that makes the universe **unusable**: a duplicate id, a lane
pointing nowhere, a value out of range, a local route crossing into another
system.

It accepts anything merely **implausible**: orbits that shrink outward,
overlapping planets, a gate inside its star, a network split in two. Those are
design choices, and they are yours.

The one exception you probably care about is connectivity — see below.

## Query it

Build the indexes once after `createGalaxy()` and keep them. Each call walks the
whole universe.

```ts
import {
  connectedComponents,
  findRoute,
  indexGalaxy,
  stationsOf,
  systemOf,
} from '@industrieh/starmap'

// Is every system reachable? The library does not check this for you.
const parts = connectedComponents(galaxy)
if (parts.length > 1) {
  throw new Error(`Stranded systems: ${parts.slice(1).flat().join(', ')}`)
}

// Look up any object by id. `kind` narrows the type, no cast needed.
const index = indexGalaxy(galaxy)
const entry = index.get('earth-st0')
if (entry?.kind === 'station') {
  entry.obj.docks // typed as Station
  entry.systemId // "sol"
}

// Shortest path, weighted by lane length.
const route = findRoute(galaxy, 'sol', 'alpha')
route?.jumps // 1
route?.systemIds // ["sol", "alpha"]

stationsOf(galaxy.systems[0]) // every station across every planet

// Walk ownership upwards: from any object id, its system — and everything in it.
systemOf(galaxy, 'earth')?.gates // every gate Earth can fly to, not just one
systemOf(index, 'earth')?.gates // same, reusing the index above
```

## Animate it

`systemPositions(system, t)` returns where everything is at time `t`, keyed by
id.

```ts
import { systemPositions } from '@industrieh/starmap'

const pos = systemPositions(galaxy.systems[0], 12.5)
pos.get('earth') // { x: -75, y: 130 }
pos.get('earth-st0') // the station, which follows its planet
```

`t` is **simulation** seconds, compared against each object's `period`. The
library keeps no clock: your loop decides how fast `t` moves, whether it pauses,
and whether it runs backwards.

Call it every frame. It costs one pass over the objects of one system — a few
dozen — so there is nothing worth caching.

## Draw it

The library gives you positions. The rest is yours.

```ts
// Colors live in your code, keyed by a field of the model.
const COLORS: Record<string, string> = { terran: '#4fae6a', gas: '#d8a06a' }

function draw(ctx: CanvasRenderingContext2D, system: StarSystem, t: number) {
  const pos = systemPositions(system, t)

  for (const p of system.planets) {
    const point = pos.get(p.id)
    if (!point) continue
    ctx.beginPath()
    ctx.arc(point.x, point.y, p.radius, 0, Math.PI * 2)
    ctx.fillStyle = COLORS[p.type ?? ''] ?? '#888'
    ctx.fill()
  }
}
```

There is no `color` or `typeName` field in the model, on purpose. A color baked
into the data forces a UI decision at the moment you describe your world, and it
is useless the moment a project has a dark theme or a fixed palette. Mapping
`planet.type` to an appearance is one line, written where you have the context to
write it.

If you want a picture rather than a drawing loop,
[`@industrieh/starmap-render`](../starmap-render) turns a system or a galaxy into
an SVG string, with the colors passed in as a theme.

## Generate it with a script

The library does not generate universes, but it ships the tool that makes your
generator deterministic.

```ts
import { createGalaxy, createRng, type SystemInput } from '@industrieh/starmap'

function generate(seed: string, count = 24) {
  const rng = createRng(seed)

  const systems: SystemInput[] = Array.from({ length: count }, (_, i) => {
    const angle = rng.next() * Math.PI * 2
    const radius = 1000 * Math.pow(rng.next(), 0.65) // denser toward the middle
    const name = `Sector-${i}`

    return {
      id: `sys-${i}`,
      name,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.72, // squash it: a flat disc reads as a target
      star: { class: rng.pick(['G', 'K', 'M'] as const), radius: rng.randInt(12, 30) },
      planets: Array.from({ length: rng.randInt(1, 8) }, (_, j) => ({
        name: `${name} ${j + 1}`,
        orbit: 60 + j * rng.rand(38, 62),
        radius: rng.randInt(3, 12),
        angle: rng.rand(0, 360),
        period: 8 + Math.pow(j + 1, 1.5) * 9, // simplified Kepler: T² ∝ a³
      })),
    }
  })

  const lanes = systems.slice(1).map((s, i) => ({ from: systems[i].id, to: s.id }))

  // `seed` is copied to meta.seed, so you can rebuild this exact universe later.
  return createGalaxy({ seed, systems, lanes })
}
```

Two things to know once you go further:

**The order of your draws becomes part of your contract.** Insert one extra
`rng.next()` in the middle and everything after it shifts, so the same seed now
produces a different universe. A snapshot test is the usual way to catch that.

**Keep your sequences separate.** `` `${seed}:${id}:${domain}` `` gives each
mechanic its own sequence, so adding one does not disturb the others.

## API

### Building and checking

| function                        | what it does                                |
| ------------------------------- | ------------------------------------------- |
| `createGalaxy(input, options?)` | fill in, check, and return a `Galaxy`       |
| `validateGalaxy(galaxy)`        | list the problems of a galaxy; never throws |
| `assertValidGalaxy(galaxy)`     | same, but throws a `GalaxyValidationError`  |
| `FORMAT_VERSION`                | version of the data contract                |

Pass `{ validate: false }` to skip the check on a hot path whose input you have
already validated.

`validateGalaxy()` is the one to reach for after `JSON.parse` — TypeScript's
guarantees do not survive serialization.

### Reading

| function                      | what it does                             |
| ----------------------------- | ---------------------------------------- |
| `indexGalaxy(galaxy)`         | `id → object`, every kind mixed together |
| `indexSystems(galaxy)`        | `id → system`                            |
| `lanesOf(galaxy, id)`         | lanes touching a system                  |
| `neighboursOf(galaxy, id)`    | systems one jump away                    |
| `connectedComponents(galaxy)` | groups of mutually reachable systems     |
| `stationsOf(system)`          | every station in a system                |
| `systemOf(source, id)`        | the system an object belongs to          |
| `findRoute(galaxy, a, b)`     | shortest weighted path (Dijkstra)        |

### Geometry

| function                            | what it does                    |
| ----------------------------------- | ------------------------------- |
| `systemPositions(system, t)`        | every position at time `t`      |
| `orbitPos(orbit, angle, period, t)` | one position on one orbit       |
| `fieldCenter(field)`                | the center of an asteroid field |
| `toRad(deg)`, `round(n, d)`         | small helpers                   |

### Randomness

`createRng(seed)` returns `next`, `rand`, `randInt`, `pick`, `chance` and
`weighted`. Use it for your own generator, or for reproducible game content —
loot, encounters, events.

### Units and conventions

| quantity        | unit                   | convention                       |
| --------------- | ---------------------- | -------------------------------- |
| positions       | arbitrary world units  | Y points down, as in SVG         |
| angles          | degrees                | clockwise, `0` points right      |
| orbital periods | **simulation** seconds | not wall-clock seconds           |
| `security`      | `0` to `1`             | `0` lawless, `1` safe            |
| `density`       | `0` to `1`             | a hint; do with it what you like |

A system's star always sits at `(0, 0)`.

## Guides

- [docs/data-model.md](docs/data-model.md) — every field, one by one
- [docs/recipes.md](docs/recipes.md) — save files, scaling, loading from JSON,
  attaching colors and labels
- [docs/design.md](docs/design.md) — why the library draws its lines where it
  does
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
When writing code against @industrieh/starmap, read
https://starmap.industrieh.dev/llms-full.txt first. It is the complete
documentation.
```

In a chat, paste the URL. Offline, download the file and attach it — both are
plain text.

Two things worth telling a model up front, because the type system will not
enforce either:

- **This package never draws.** If it suggests a `color` field or a `render()`
  here, it is thinking of `@industrieh/starmap-render`.
- **It never invents a value that carries meaning.** A missing `type` stays
  `undefined`; the library fills in only what follows from what you wrote.

## Developing

This package lives in a Bun monorepo. See the [root README](../../README.md) for
the repo-wide commands.

```
packages/starmap/
  src/
    index.ts            public API
    core/
      types.ts          the data contract (output)
      input.ts          the input schema
      create.ts         createGalaxy() and normalization
      validate.ts       validateGalaxy() and errors
      geometry.ts       orbital geometry
      query.ts          indexes, neighbours, connectivity, routes
      rng.ts            deterministic randomness
  tests/                creation, validation, queries, purity
  docs/                 data model, recipes, design, architecture
```

[docs/architecture.md](docs/architecture.md) walks through those files.
[CONTRIBUTING.md](CONTRIBUTING.md) has the checklists for adding a field, a
query or a check.

| command              | what it does                 |
| -------------------- | ---------------------------- |
| `bun run build`      | build to `dist/` with tsdown |
| `bun run test`       | Vitest                       |
| `bun run test:watch` | Vitest in watch mode         |
| `bun run typecheck`  | `tsc --noEmit`               |

**The house rule: `src/` knows nothing about UI, the DOM, or rendering.** No
non-relative imports, no browser globals, no `Math.random`, no `Date`, no colors,
no drawable shapes. `tests/purity.test.ts` checks that file by file, and
`tsconfig.base.json` drops `DOM` from `lib` so a slip is a compile error.

Second rule, repo-wide: `isolatedDeclarations` is on, so every exported
declaration carries an explicit type.
