# Data model

Every field, one by one. What you pass to `createGalaxy()` on the left, what you
get back on the right.

The types live in `src/core/input.ts` (input) and `src/core/types.ts` (output).
Both are exported.

## How to read these tables

| status       | meaning                                              |
| ------------ | ---------------------------------------------------- |
| **required** | leave it out and validation rejects the universe     |
| **derived**  | computed for you; a value you provide is always kept |
| **default**  | replaced by a neutral value when absent              |
| **optional** | stays `undefined` when absent — nothing is invented  |

## Conventions

| quantity  | unit                   | convention                              |
| --------- | ---------------------- | --------------------------------------- |
| positions | arbitrary world units  | Y points down, as in SVG                |
| angles    | degrees                | clockwise, `0` points right             |
| orbits    | world units            | radius, measured from the parent body   |
| periods   | **simulation** seconds | not wall-clock seconds; `0` never moves |

A system's star always sits at `(0, 0)`.

Derived numbers are rounded to 2 decimals. Without that, the JSON fills up with
`0.30000000000000004` for no useful precision.

## Ids

Provide your own — they are more readable in a save file, and they do not move
when you reorder an array. Otherwise they are derived:

| shape                | example          | object         |
| -------------------- | ---------------- | -------------- |
| `<systemId>-star`    | `sol-star`       | star           |
| `<systemId>-p<j>`    | `sol-p2`         | planet         |
| `<planetId>-st<k>`   | `sol-p2-st0`     | station        |
| `<systemId>-gate<j>` | `sol-gate1`      | gate           |
| `<systemId>-ast<j>`  | `sol-ast0`       | asteroid field |
| `lane-<from>-<to>`   | `lane-sol-alpha` | hyperlane      |
| `<fromId>><toId>`    | `sol-p1>sol-p2`  | local route    |

Ids must be unique across the whole galaxy, local routes and hyperlanes
included.

Watch out for collisions between an id you provide and one that gets derived.
Validation catches them:

```ts
planets: [
  { name: 'P1', orbit: 50, radius: 2 }, // derives to 'a-p0'
  { id: 'a-p0', name: 'P2', orbit: 80, radius: 2 }, // collision, rejected
]
```

## `GalaxyInput` → `Galaxy`

| field         | status       | notes                                 |
| ------------- | ------------ | ------------------------------------- |
| `systems`     | **required** | may be empty                          |
| `lanes`       | default `[]` | the inter-system network              |
| `seed`        | optional     | free-form label, copied to `meta`     |
| `generatedAt` | optional     | free-form timestamp, copied to `meta` |

The output adds `meta`.

## `GalaxyMeta`

| field                | status  | notes                                                       |
| -------------------- | ------- | ----------------------------------------------------------- |
| `seed`               | copied  | the library never reads it — put your generator's seed here |
| `generatedAt`        | copied  | same                                                        |
| `formatVersion`      | derived | the `FORMAT_VERSION` in effect when the galaxy was built    |
| `systemCount`        | derived |                                                             |
| `laneCount`          | derived |                                                             |
| `planetCount`        | derived | across every system                                         |
| `stationCount`       | derived | across every planet                                         |
| `gateCount`          | derived |                                                             |
| `asteroidFieldCount` | derived |                                                             |
| `galaxyRadius`       | derived | radius of the disc enclosing every system                   |

`validateGalaxy()` re-checks the counters, so they stay honest even for a galaxy
read back from a hand-edited JSON file.

Compare `meta.formatVersion` against the exported `FORMAT_VERSION` when loading a
save, to detect that the data contract has moved on.

## `SystemInput` → `StarSystem`

| field            | status       | notes                                                |
| ---------------- | ------------ | ---------------------------------------------------- |
| `id`             | **required** | unique across the whole galaxy                       |
| `name`           | **required** |                                                      |
| `x`, `y`         | **required** | position in the galaxy                               |
| `star`           | **required** |                                                      |
| `planets`        | default `[]` | **in orbital order** — the rank becomes `index`      |
| `asteroidFields` | default `[]` |                                                      |
| `gates`          | default `[]` |                                                      |
| `localRoutes`    | default `[]` | the in-system travel network                         |
| `faction`        | optional     | `{ id, name }`                                       |
| `security`       | optional     | `0` lawless to `1` safe                              |
| `outerLimit`     | derived      | how far the contents reach, **with no margin added** |

`outerLimit` is `max(star radius, planet orbit + radius, planet orbit + station
orbit, gate orbits, field reach, rock reach)` — a station circles its planet, so
at its farthest it sits a full station orbit beyond the planet's, and a rock may
lie outside the shape of its field. If you want empty space past the outermost
object, pass the value yourself — a margin is an aesthetic choice, not a
calculation.

## `StarInput` → `Star`

| field    | status       | notes                                            |
| -------- | ------------ | ------------------------------------------------ |
| `radius` | **required** | in world units                                   |
| `id`     | derived      | `<systemId>-star`                                |
| `name`   | derived      | the system name                                  |
| `class`  | optional     | `O` `B` `A` `F` `G` `K` `M` are just suggestions |

## `PlanetInput` → `Planet`

| field       | status       | notes                                         |
| ----------- | ------------ | --------------------------------------------- |
| `name`      | **required** |                                               |
| `orbit`     | **required** | radius, measured from the star                |
| `radius`    | **required** |                                               |
| `id`        | derived      | `<systemId>-p<rank>`                          |
| `index`     | derived      | rank in the array, `0` first                  |
| `angle`     | default `0`  | where it sits at `t = 0`                      |
| `period`    | default `0`  | simulation seconds per orbit; `0` never moves |
| `stations`  | default `[]` |                                               |
| `type`      | optional     | your classification                           |
| `moons`     | optional     | **decorative** — no moon exists as an object  |
| `habitable` | optional     |                                               |
| `resources` | optional     |                                               |

## `StationInput` → `Station`

| field      | status       | notes                                         |
| ---------- | ------------ | --------------------------------------------- |
| `name`     | **required** |                                               |
| `orbit`    | **required** | radius, measured from the **planet's** center |
| `id`       | derived      | `<planetId>-st<rank>`                         |
| `planetId` | derived      | always its parent planet                      |
| `angle`    | default `0`  |                                               |
| `period`   | default `0`  | usually faster than the planet's own orbit    |
| `type`     | optional     |                                               |
| `docks`    | optional     | free-form; the library never reads it         |

Stations follow their planet: `systemPositions()` composes the two orbits.

## `GateInput` → `Gate`

| field    | status              | notes                                |
| -------- | ------------------- | ------------------------------------ |
| `name`   | **required**        |                                      |
| `orbit`  | **required**        | radius around the star               |
| `id`     | derived             | `<systemId>-gate<rank>`              |
| `angle`  | default `0`         |                                      |
| `links`  | default `[]`        | ids of the systems this gate reaches |
| `status` | default `'nominal'` | `'unstable'` is just a suggestion    |

Validation checks that every id in `links` names an existing system, and never
the gate's own system. An empty list is fine — a dead gate is a legitimate design
choice.

`status` has no mechanical effect in the library. It is a hook for your game:
risky jump, random destination, higher fuel cost.

## `AsteroidFieldInput` → `AsteroidField`

Discriminated by `kind`. Shared fields:

| field      | status       | notes                   |
| ---------- | ------------ | ----------------------- |
| `name`     | **required** |                         |
| `kind`     | **required** | `'belt'` or `'cluster'` |
| `id`       | derived      | `<systemId>-ast<rank>`  |
| `rocks`    | default `[]` | pre-placed rocks        |
| `density`  | optional     | `0` to `1`, a hint      |
| `richness` | optional     |                         |

`kind: 'belt'` — an arc of a ring:

| field      | status       | notes                                      |
| ---------- | ------------ | ------------------------------------------ |
| `orbit`    | **required** | radius of the ring                         |
| `width`    | **required** | radial thickness                           |
| `arcStart` | **required** | where the arc starts, in degrees           |
| `arcSweep` | **required** | how far it spans, `0`–`360`; `360` is full |

`kind: 'cluster'` — a local pocket:

| field    | status       | notes                         |
| -------- | ------------ | ----------------------------- |
| `x`, `y` | **required** | center, in system coordinates |
| `radius` | **required** | radius of the cluster         |

`Rock` is a `[x, y, radius]` tuple in system coordinates. A tuple rather than an
object on purpose: a field can hold hundreds of rocks, and `{"x":1,"y":2,"r":3}`
is four times the size of `[1,2,3]` in JSON.

The library never generates rocks. If you want a field you can draw, place them
yourself.

## `LaneInput` → `Hyperlane`

| field        | status       | notes                                              |
| ------------ | ------------ | -------------------------------------------------- |
| `from`, `to` | **required** | system ids. **Undirected** — order does not matter |
| `id`         | derived      | `lane-<from>-<to>`                                 |
| `length`     | derived      | straight-line distance between the two systems     |

Validation checks that both ends exist, that `from ≠ to`, and that the same pair
appears only once in either direction.

Provide `length` to decouple travel cost from on-screen distance — a "long" jump
between two neighbours, for instance. `findRoute()` weights by this value.

## `LocalRouteInput` → `LocalRoute`

| field        | status       | notes                                                               |
| ------------ | ------------ | ------------------------------------------------------------------- |
| `from`, `to` | **required** | `{ kind, id }` of objects in the **same** system                    |
| `id`         | derived      | `<fromId>><toId>`                                                   |
| `type`       | optional     | `orbital` `shortcut` `docking` `jump-lane` `mining` are suggestions |

Validation checks that both ends exist, belong to the system holding the route,
and match the `kind` you declared.

Routes reference **ids**, never positions, so they follow objects as they orbit.
Nothing to update per frame.

## Indexes

`indexGalaxy()` returns a `Map<string, IndexEntry>`. `IndexEntry` is
discriminated by `kind`:

```ts
const entry = index.get('sol-p2-st0')
if (entry?.kind === 'station') {
  entry.obj.docks // typed as Station, no cast
  entry.systemId // "sol"
}
```

`systemId` lets you recover an object's context from its id alone — handy for a
detail panel or for game logic.

`systemOf()` wraps that round trip: it takes an id and hands back the whole
`StarSystem`, so anything a planet shares with its neighbours — the gates, the
asteroid fields, the other planets — is one call away.

```ts
systemOf(galaxy, 'earth')?.gates // every gate in Earth's system
systemOf(index, 'earth')?.gates // same, from an index you already built
```

It accepts a `Galaxy` or a `GalaxyIndex`, returns `null` on an unknown id, and
returns the system itself if you hand it a system id.

## Open unions

`FactionId`, `PlanetType`, `StationType`, `StarClass`, `Richness`, `GateStatus`
and `RouteType` are open:

```ts
type PlanetType = 'lava' | 'rocky' | … | (string & {})
```

The listed values are **autocomplete suggestions only**. The library imposes no
vocabulary and attaches no behaviour to any of these strings. Use your own.

The trade-off: a `switch` over one of them is never exhaustive as far as
TypeScript is concerned, so always write a default case.

## What is deliberately missing

No `color`, no `typeName`, nothing about styling. Those are display concerns.
Map them in your own code, keyed by a field of the model:

```ts
const COLORS: Record<string, string> = { terran: '#4fae6a', gas: '#d8a06a' }
const color = COLORS[planet.type ?? ''] ?? '#888'
```

The fallback is not paranoia: `type` is optional, and the unions are open.

See [design.md](design.md) for the reasoning.
