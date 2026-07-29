# Architecture

How the package is built, file by file. Read this before changing the code.

For what the library does, see the [README](../README.md). For every field, see
[data-model.md](data-model.md). For why the lines are drawn where they are, see
[design.md](design.md).

## Contents

- [The map](#the-map)
- [The pipeline](#the-pipeline)
- [Two layers of types](#two-layers-of-types)
- [`types.ts` — the data contract](#typests--the-data-contract)
- [`input.ts` — the input schema](#inputts--the-input-schema)
- [`create.ts` — normalization](#createts--normalization)
- [`validate.ts` — checking](#validatets--checking)
- [`geometry.ts` — positions](#geometryts--positions)
- [`query.ts` — reading a galaxy](#queryts--reading-a-galaxy)
- [`rng.ts` — deterministic randomness](#rngts--deterministic-randomness)
- [`index.ts` — the public surface](#indexts--the-public-surface)
- [Invariants](#invariants)
- [The rules the tooling enforces](#the-rules-the-tooling-enforces)
- [The tests](#the-tests)
- [Where to change what](#where-to-change-what)

## The map

```
packages/starmap/
  src/
    index.ts          public API — the only file that re-exports
    core/
      types.ts        the output contract: Galaxy and everything in it
      input.ts        the input schema: GalaxyInput and everything in it
      create.ts       createGalaxy() and normalization
      validate.ts     validateGalaxy(), assertValidGalaxy(), the error class
      geometry.ts     orbital positions at time t
      query.ts        indexes, neighbours, connectivity, routes
      rng.ts          seeded PRNG
  tests/
    fixture.ts        one hand-written universe, shared by the tests
    creation.test.ts  what normalization fills in and leaves alone
    validation.test.ts what is rejected and what is accepted
    queries.test.ts   indexes, routes, connectivity, positions
    purity.test.ts    the house rule, checked file by file
  docs/               data-model, recipes, design, this file
```

Around 1200 lines of source. Every file in `core/` is standalone except for the
dependencies drawn below.

```
index.ts ──► create.ts ──► input.ts ──► types.ts
                 │
                 ├──► geometry.ts (round) ──► types.ts
                 └──► validate.ts ──────────► types.ts

         ──► query.ts ────────────────────► types.ts
         ──► rng.ts   (depends on nothing)
```

`rng.ts` imports nothing. `query.ts` and `geometry.ts` import only types. The
graph has no cycles and never will: `types.ts` is at the bottom and imports
nothing.

## The pipeline

```
GalaxyInput ──► normalize ──► validate ──► Galaxy ──► query
 (your object)  (create.ts)  (validate.ts)          ──► geometry
```

One pass, no state, no side effects. `createGalaxy()` reads no clock, calls no
`Math.random`, and does not mutate the object you hand it. Call it twice on the
same input and you get two equal galaxies.

The two steps have opposite jobs, and that split is the core of the design:

- **normalize** never rejects anything. It fills in ids, counts, lengths and
  empty arrays, and it copies through whatever else it was given.
- **validate** never fixes anything. It walks the finished galaxy and reports
  what is wrong.

That is why normalization tolerates broken input. `normalizeSystem` reads
`input.star?.radius`, even though `SystemInput.star` is required, and
`normalizeLane` falls back to a length of `0` when an endpoint does not exist:

```ts
// create.ts
const a = byId.get(input.from)
const b = byId.get(input.to)
// Unknown endpoint: validation reports it, so don't fail here.
length = a && b ? round(Math.hypot(b.x - a.x, b.y - a.y)) : 0
```

If normalization threw on the first missing field, you would get one error at a
time. Instead it builds a galaxy that may be wrong, and validation reports
**every** problem at once.

The only thing `createGalaxy()` throws by itself is a `TypeError`, when the
argument is not an object with a `systems` array. There is nothing to normalize
in that case.

## Two layers of types

Every object exists twice: `PlanetInput` and `Planet`, `SystemInput` and
`StarSystem`, and so on.

```ts
// input.ts — what you write
interface PlanetInput {
  id?: string // derived if you leave it out
  name: string
  orbit: number
  radius: number
  angle?: number // 0 if you leave it out
  stations?: StationInput[]
}

// types.ts — what you get back
interface Planet {
  id: string // always there
  name: string
  index: number // added
  orbit: number
  radius: number
  angle: number // always a number
  stations: Station[] // always an array, possibly empty
}
```

The input type is forgiving. The output type tells the truth: a field is
optional in `Planet` only when the library genuinely cannot know it (`type`,
`moons`, `habitable`). Nothing is optional in the output just because it was
optional in the input.

Keep the two files in sync by hand. There is no generated mapping, on purpose —
the differences between the layers are the whole point, and a mapped type would
hide them.

## `types.ts` — the data contract

Pure type declarations, no runtime code. Three things worth knowing.

**Open unions.** `PlanetType`, `StarClass`, `StationType`, `FactionId`,
`Richness`, `GateStatus` and `RouteType` all go through one helper:

```ts
type Known<T extends string> = T | (string & {})
```

The listed values show up in autocomplete, any other string is still accepted.
`(string & {})` is what stops TypeScript from collapsing the union down to
`string`. The library imposes no vocabulary; it only suggests one.

**`Rock` is a tuple.** `[x, y, radius]`, not `{ x, y, r }`. A field can hold
hundreds of rocks, and the object form is four times the size in JSON.

**No rendering fields.** No `color`, no display label, no drawable shape. The
model holds facts about the world: geometry, topology, identity, and gameplay
attributes such as `security`, `docks`, `habitable`. See
[design.md](design.md#2-the-library-does-not-draw).

## `input.ts` — the input schema

The mirror of `types.ts`, with the derivable parts made optional. Pure type
declarations again, no runtime code.

Its file header carries the two tables users read first — required fields per
object, and what gets filled in. Those tables also appear in the README and in
[data-model.md](data-model.md). Change a required field and all three need the
edit.

## `create.ts` — normalization

`createGalaxy()` is 30 lines: normalize the systems, normalize the lanes against
a `Map` of the systems, count everything into `meta`, then validate unless the
caller opted out.

Below it, one `normalizeX` function per object kind. They all have the same
shape — take the input, take the parent id and the array index, return the
finished object:

```ts
function normalizePlanet(input: PlanetInput, systemId: string, index: number): Planet
function normalizeStation(input: StationInput, planetId: string, index: number): Station
function normalizeGate(input: GateInput, systemId: string, index: number): Gate
```

### Derived ids

| object      | pattern                 | example           |
| ----------- | ----------------------- | ----------------- |
| star        | `<systemId>-star`       | `sol-star`        |
| planet      | `<systemId>-p<rank>`    | `sol-p2`          |
| station     | `<planetId>-st<rank>`   | `sol-p2-st0`      |
| gate        | `<systemId>-gate<rank>` | `sol-gate0`       |
| field       | `<systemId>-ast<rank>`  | `sol-ast0`        |
| hyperlane   | `lane-<from>-<to>`      | `lane-sol-vega`   |
| local route | `<fromId>><toId>`       | `earth>sol-gate0` |

`rank` is the index in the array. An id you provide is always kept, which means
a derived id can collide with one you wrote by hand. That is reported by
validation, not patched up silently.

### `outerLimit`

`outerLimitOf()` returns how far a system's contents reach, with no margin:

```ts
max(star.radius, planet.orbit + planet.radius, gate.orbit, field reach)
```

A belt reaches `orbit + width / 2`; a cluster reaches `hypot(x, y) + radius`.
Non-finite values are filtered out, so a broken input still produces a number
and validation gets to report the real problem. An `outerLimit` you provide is
kept as is.

### Rounding

Every computed length goes through `round()` from `geometry.ts`. Without it the
serialized galaxy is full of `0.30000000000000004` and twice the size, for no
useful precision.

## `validate.ts` — checking

`validateGalaxy()` returns `GalaxyIssue[]` and never throws, whatever you pass
it — including `null`, or an object parsed from a save file with the wrong
shape. `assertValidGalaxy()` wraps it and throws `GalaxyValidationError`, whose
`issues` property holds the full list.

Every issue carries a path you can jump to:

```
systems[3].planets[0].orbit: must be strictly positive
```

The paths are built by string concatenation as the walk descends. There is no
schema library and no reflection: the checks are hand-written, which is why the
messages read the way they do.

### The four passes

1. **Claim every id.** One `Map<string, { kind, systemId }>` named `owners`,
   built over systems, stars, planets, stations, gates and fields. A second
   claim on the same id is a duplicate. This map is what later passes use to
   resolve references.
2. **Check each system's contents.** Types, ranges, and `planet.index` against
   the real array position.
3. **Check the network.** Lane ids, endpoints, self-links, duplicate pairs,
   lengths.
4. **Check `meta`.** Every counter is recomputed from the contents and compared.

Pass 1 has to finish before pass 2 starts, because a gate in the first system
may link to the last one.

### Lane ids are not in `owners`

Hyperlane ids count towards global uniqueness but live in their own `Set`:

```ts
if (owners.has(l.id) || laneIds.has(l.id)) add(`${p}.id`, `duplicate id: "${l.id}"`)
else laneIds.add(l.id)
```

If lanes were in `owners`, a gate could "link" to a hyperlane and pass the
check. Keeping them separate makes that impossible.

### The small helpers

`number()`, `optionalNumber()`, `text()`, `isId()` and `each()` are the whole
vocabulary. `each()` returns `[]` for anything that is not an array, so the walk
never crashes on malformed input — the missing array is reported by its own
check.

`checkRef()` is the one with a rule you might not expect: a local route may only
point at objects **in its own system**. A route from a gate in `sol` to a
station in `vega` is rejected.

What is rejected and what is accepted is a design decision, written down in
[design.md](design.md#validation). Read it before adding a check.

## `geometry.ts` — positions

Four functions, 75 lines, no state.

```ts
orbitPos(orbit, angleDeg, period, t) // one position on one orbit
systemPositions(system, t) // every position in a system, keyed by id
fieldCenter(field) // middle of a belt's arc, or a cluster's center
;(toRad(deg), round(n, d)) // helpers
```

`orbitPos` is the only formula in the package:

```ts
const a = toRad(angleDeg + (period ? (t / period) * 360 : 0))
return { x: Math.cos(a) * orbit, y: Math.sin(a) * orbit }
```

`period === 0` means "never moves", so it is guarded rather than divided by.

`systemPositions` places the star at `(0, 0)`, then each planet on its orbit,
then each station **relative to its planet** — a station's `x`/`y` is the sum of
the two, so it follows the planet around. Gates and fields never move; they go
through `orbitPos` with `period` and `t` set to `0`.

`t` is simulation seconds, compared against each object's `period`. The library
keeps no clock. One call costs one pass over one system's objects, so there is
nothing worth caching.

## `query.ts` — reading a galaxy

A `Galaxy` is a tree, which is good for serializing and bad for lookups. These
helpers build the lookups a game needs constantly. Every one of them walks the
whole structure, so callers build an index once and keep it.

| function              | cost                          |
| --------------------- | ----------------------------- |
| `indexSystems`        | one pass over the systems     |
| `indexGalaxy`         | one pass over everything      |
| `lanesOf`             | one pass over the lanes       |
| `neighboursOf`        | builds an index, then filters |
| `stationsOf`          | one pass over one system      |
| `systemOf`            | two lookups, index or not     |
| `connectedComponents` | BFS over the whole network    |
| `findRoute`           | Dijkstra, see below           |

`IndexEntry` is a discriminated union on `kind`, so `entry.kind === 'station'`
narrows `entry.obj` to `Station` with no cast.

`systemOf` is the one helper that reads ownership upwards. Only `station` holds a
pointer to its parent, so the round trip goes through the index instead:
`id → entry.systemId → the system entry`. It takes `Galaxy | GalaxyIndex` — the
galaxy for a one-off call, an index you already built for a render loop. The two
are told apart by `Array.isArray(source.systems)`, not `instanceof Map`, which
would fail on a map built in another realm.

`connectedComponents` builds an adjacency map, flood-fills from each unseen
system, and returns the groups largest first. A healthy galaxy returns exactly
one. The library never calls this itself: a split network is a design choice,
and the check is yours to run.

`findRoute` is Dijkstra with a naive priority queue — a linear scan over a
`Set` of pending systems. That is `O(n²)`, fine up to a few thousand systems. If
that ever becomes the bottleneck, the fix is to index the graph once and swap
the scan for a binary heap; the signature does not have to change.

## `rng.ts` — deterministic randomness

`hashSeed()` is FNV-1a: any string becomes an unsigned 32-bit integer.
`mulberry32()` turns that integer into a generator. `createRng()` puts the two
together and adds `rand`, `randInt`, `pick`, `chance` and `weighted`.

It is not cryptographic, and it is not meant to be. It is 32 bits of state, very
fast, and good enough for content generation.

`weighted()` ends with a deliberate safety net:

```ts
for (const e of table) if ((r -= e.w) <= 0) return e
// Safety net: floating-point drift can leave `r > 0` past the last entry.
return table[table.length - 1]
```

This module is the one piece of a procedural generator the library keeps. The
generator itself belongs in your app — see
[design.md](design.md#1-the-library-does-not-generate).

## `index.ts` — the public surface

The only file that re-exports. It is grouped by role — building, input schema,
checking, randomness, geometry, reading, data contract — and each group is one
comment line.

If a symbol is not listed here, it is not public. `core/` is an implementation
detail: `package.json` exposes a single export path, so nobody can reach into
it.

## Invariants

The code relies on these. Break one and something downstream breaks quietly.

- **Ids are unique across the whole galaxy**, hyperlanes included. Indexing,
  references and routing all assume it.
- **`planet.index` equals its position in the array.** Validation checks it.
- **`station.planetId` points at its parent planet.** Validation checks it.
- **A star sits at `(0, 0)`.** All system coordinates are relative to it.
- **A `Galaxy` is never mutated.** It is frozen terrain. Game state lives in a
  separate object keyed by the same ids — see
  [recipes.md](recipes.md#keep-game-state-alongside).
- **Angles are degrees, clockwise, `0` points right. Y points down**, as in SVG.
- **Periods are simulation seconds**, not wall-clock seconds.

## The rules the tooling enforces

**`src/` knows nothing about UI, the DOM, or rendering.** This is the house
rule. `tests/purity.test.ts` walks every source file and rejects:

- imports that are not relative;
- `document`, `window`, `navigator`, `localStorage`, `requestAnimationFrame`;
- `Math.random`, `new Date(`, `Date.now(`;
- `color`, `#rrggbb`, `svg`, `canvas`, `viewBox`;
- any `.tsx`, `.jsx` or `.css` file under `src/`.

It reads the sources, not the bundle, so it needs no build. Comments are
stripped first — a JSDoc example may legitimately import
`@cotontigeh/starmap`, and the word "document" is fine in prose.

**`tsconfig.base.json` drops `DOM` from `lib`.** A stray `document.` does not
compile, so the purity test is the second line of defence, not the first.

**`isolatedDeclarations` is on, repo-wide.** Every exported declaration carries
an explicit type. That keeps the public API readable, and it lets tsdown use the
`oxc` declaration generator, which works in memory instead of writing `.d.ts`
files next to the sources.

## The tests

| file                 | covers                                                    |
| -------------------- | --------------------------------------------------------- |
| `fixture.ts`         | one universe, written the way a user would write one      |
| `creation.test.ts`   | what normalization fills in, and what it leaves alone     |
| `validation.test.ts` | each rejected case, and the accepted-but-implausible ones |
| `queries.test.ts`    | indexes, neighbours, components, routes, positions        |
| `purity.test.ts`     | the house rule, file by file                              |

The fixture is deliberately uneven: some ids given, some derived, some optional
fields present and others left out. Those omissions are what exercise
normalization. When you add a field, the fixture is usually where the test
starts.

Validation tests come in pairs — one that the check fires, one that a valid
galaxy stays valid. A check that never passes is as broken as one that never
fires.

## Where to change what

| you want to                       | touch                                                                    |
| --------------------------------- | ------------------------------------------------------------------------ |
| add a field to an object          | `input.ts`, `types.ts`, `create.ts`, `validate.ts`, `docs/data-model.md` |
| change what a field derives to    | `create.ts`, `creation.test.ts`, `docs/data-model.md`                    |
| add or relax a check              | `validate.ts`, `validation.test.ts`, `docs/design.md`                    |
| add a query helper                | `query.ts`, `index.ts`, `queries.test.ts`, the API table in the README   |
| change the orbital model          | `geometry.ts`, `queries.test.ts`, the conventions table in the README    |
| add a PRNG method                 | `rng.ts`, `index.ts`, `docs/recipes.md`                                  |
| break the shape of a saved galaxy | `FORMAT_VERSION` in `create.ts`, plus everything above                   |

The checklists for each of these are in [CONTRIBUTING.md](../CONTRIBUTING.md).
