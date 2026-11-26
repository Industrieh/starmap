# Design

Why the library draws its lines where it does. For field-level detail see
[data-model.md](data-model.md); for how-to answers see [recipes.md](recipes.md).

## The shape of it

```
     GalaxyInput  (your object)
            │
            ▼
     normalize  ──────────►  derived ids, empty collections,
     (create.ts)             index, planetId, lengths, outerLimit, meta
            │
            ▼
     validate  ───────────►  GalaxyIssue[]  →  GalaxyValidationError
     (validate.ts)
            │
            ▼
         Galaxy  ──────────►  query.ts     (indexes, neighbours, routes)
                       └────►  geometry.ts  (positions at time t)
```

One pass, no state, no side effects. `createGalaxy()` reads no clock, calls no
`Math.random`, touches no filesystem, and does not mutate the object you hand it.
Call it twice on the same input and you get two equal galaxies.

## Three lines we decided not to cross

### 1. The library does not generate

Procedural generation is **game design**, not infrastructure. The shape of a
galaxy, the faction table, how many planets a system gets — those are game
decisions. Locking them into a library leaves two bad options: expose every knob,
until the configuration is harder to write than the script it replaced; or pick
one universe for everybody.

So `createGalaxy()` takes the finished universe. The script that builds it lives
in your app. The library keeps `createRng()`, which is the one genuinely reusable
piece of a generator: a seeded PRNG.

### 2. The library does not draw

No components, no hooks, no stylesheet — and, less obviously, **no display fields
in the data model**. There is no `color`, no `typeName`, and no drawable shape.

A color in the model looks convenient, and it forces a UI decision at the moment
you describe your world. It also stops being usable the day a project needs a
dark theme, a colorblind mode, or a fixed brand palette. The mapping
`planet.type → color` is one line, written where the context to write it exists:

```ts
const COLORS: Record<string, string> = { terran: '#4fae6a', gas: '#d8a06a' }
```

What stays in the model are **facts about the world**: geometry, topology,
identity, gameplay attributes (`security`, `docks`, `habitable`, `resources`,
`richness`). Nothing that assumes how you look at them.

Two mechanisms enforce this, so it does not rely on review:

- `tests/purity.test.ts` walks every source file and rejects non-relative
  imports, browser globals, `Math.random`, `Date`, and any trace of `color`,
  `#rrggbb`, `svg`, `canvas` or `viewBox`;
- `tsconfig.base.json` drops `DOM` from `lib`, so a stray `document.` does not
  compile.

### 3. The library checks, but does not judge

See [Validation](#validation) below. The line between what is rejected and what
is accepted is a choice, so it is written down.

## Normalization

One rule governs the whole file:

> **Compute what is derivable. Never invent a value that carries meaning.**

That settles every "what if the user left X out?" question in advance. Two
buckets, nothing in between.

**Derived** — the value follows from what you gave, so the library computes it:
ids (`sol-p2-st0`), `Planet.index`, `Station.planetId`, `Hyperlane.length`,
`StarSystem.outerLimit`, every counter in `meta`, `meta.galaxyRadius`. An omitted
collection becomes an empty array.

**Left empty** — the value is a design decision, so the library abstains:
`faction`, `security`, `type`, `class`, `resources`, `richness`, `docks`,
`moons`, `habitable`, `density`. These are optional **in the output type too**:
the contract tells the truth about what may be missing, rather than promising a
made-up default.

One exception, on purpose: `angle` and `period` default to `0`. That is not an
invention but the literal reading of absence — "sits still at its starting
position". Without it, every static universe would repeat `angle: 0, period: 0`
on every object.

### Why `outerLimit` has no margin

A system's edge is the furthest its contents reach: `max(star radius, planet
orbit + radius, gate orbits, field reach)`. Nothing added.

An earlier version added 40 units of empty space. That was right for a renderer
and wrong for a library — a margin is an aesthetic decision. Pass `outerLimit`
yourself if you want one; a value you provide is always kept.

### Derived ids can collide

Derived ids follow the array position (`<systemId>-p<rank>`), so they can collide
with an id you provided elsewhere:

```ts
planets: [
  { name: 'P1', orbit: 50, radius: 2 }, // derives to 'a-p0'
  { id: 'a-p0', name: 'P2', orbit: 80, radius: 2 }, // collision
]
```

This is not silently patched up. It is **reported by validation**, because a
duplicate id breaks indexing and therefore everything that references by id. The
message points at the second occurrence.

## Validation

### What is rejected

Structural and referential integrity — without which the galaxy is unusable:

- runtime types of fields (`x` really is a finite number, `name` a non-empty
  string), because TypeScript's guarantees do not survive `JSON.parse`;
- the format: a galaxy built for another `FORMAT_VERSION` is reported as such,
  and nothing else is checked;
- ids unique across the **whole** universe, local routes and hyperlanes
  included;
- documented ranges: `security` and `density` in `[0, 1]`, `arcSweep` in
  `[0, 360]`, radii and orbits strictly positive;
- **every reference by id**: a hyperlane links two systems that exist and does
  not loop on itself, a pair of systems is linked at most once, a gate reaches
  only existing systems and never its own, a local route links two different
  objects of the **same** system and declares the right `kind`;
- the counters in `meta` matching the real contents.

### What is accepted

Whether the world is plausible is not checked. Orbits that shrink outward,
overlapping planets, a gate inside its star, a system with no planets, a network
split in two — all fine.

This is the most arguable decision in the library, so here is the reasoning:
those rules are game rules. Co-orbital planets are a bug in a simulator and a
feature in a puzzle game. A library that decides for the game gets forked.

The cost is that guarantees an earlier procedural generator provided are now
yours to enforce. For the one that matters most — network connectivity —
`connectedComponents()` exists so the check is two lines.

### All the errors, not the first

`validateGalaxy()` **never throws**. It returns every problem, each with a `path`
(`systems[3].planets[0].orbit`) and a message. That is what lets you fix a
content file in one pass instead of ten round trips. `createGalaxy()` builds on
it and throws a `GalaxyValidationError` carrying the whole list in
`error.issues`.

The consequence is that validation must survive **any** input — `null`, an array
where an object belongs, a field missing halfway down. Hence the defensive
helpers (`each()`, `isId()`, `isObject()`), which tolerate nonsense so they can
report it instead of crashing on it — and a deterministic fuzz test that
corrupts a valid galaxy thousands of times to hold the promise.

Normalization follows the same rule from the other side: it never guesses at a
shape. An entry that is not an object, or a collection that is not an array, is
passed through untouched, so `createGalaxy()` on a malformed JSON description
throws a `GalaxyValidationError` naming every problem — never an internal
`TypeError`.

## Queries

A `Galaxy` is a tree of nested objects: easy to serialize, awkward to query.
Build an index **once** after `createGalaxy()` and keep it — each call walks the
whole universe.

`indexGalaxy()` returns a `Map<id, IndexEntry>` where `IndexEntry` is
discriminated by `kind`. That is what makes a fully typed `switch` possible with
no casting, and what lets you recover an object's system from its id alone
(`entry.systemId`).

`findRoute()` is **Dijkstra with a binary heap**: O((V + E) log V). Among equally
short routes it always returns the same one — ties are broken by the systems'
order in the galaxy. Handed a galaxy it indexes the network first; build that
index once with `indexNetwork()` and pass it when you query often.

It returns `null` when the two systems are in different components. That is a
real case, not a theoretical one, because the library no longer guarantees
connectivity.

## Geometry

Conventions: star at the origin, Y pointing down (as in SVG), angles in degrees
measured clockwise.

`systemPositions(system, t)` recomputes a whole system at time `t` and returns a
`Map<id, Vec2>`. Stations are composed onto their planet, so they follow it
around its orbit; gates and asteroid fields never move.

The cost is one pass over the objects of one system — a few dozen — so call it
every frame and cache nothing. This is also why local routes reference **ids**
rather than positions: nothing needs updating when planets move.

`t` is **simulation** seconds. The library keeps no clock. Your render loop or
your engine decides how fast it moves, which is also what makes all of this
testable with no environment.

## Frozen terrain, separate game state

A `Galaxy` is **terrain**, not a game. Nothing in it is mutable state: no station
owner, no market, no fleet, no discovery flags.

That is structural. Mutating the galaxy would give up the most useful property
here: a save reduces to `{ formatVersion, deltas }` plus whatever rebuilds the
terrain — a content file, or your generator's seed.

The pattern is a separate layer keyed by the same ids. See
[recipes.md](recipes.md#keep-game-state-alongside).

`FORMAT_VERSION` moves on every breaking change to the data contract. A game
compares `save.formatVersion` against it at load time and knows an old save no
longer reads back as it did.

## Where this could go

- **Freezing the galaxy** (`Object.freeze`, recursively) behind a development
  flag. Immutability is a documented convention today, not an enforced one.
- **Multiple stars** per system: the contract assumes exactly one.
- **A third dimension.** Everything is 2D. A Z coordinate would graft onto `Vec2`
  and onto system positions; orbits could stay planar with no change to
  `orbitPos`.
- **Lazy validation.** `createGalaxy()` checks the whole universe at once.
  Per-system, on-demand checking would be possible for very large galaxies —
  worth deciding before any save files exist.
