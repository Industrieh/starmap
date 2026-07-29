# Recipes

Short answers to common needs. For field-level detail see
[data-model.md](data-model.md); for the reasoning behind the design see
[design.md](design.md).

- [Write a universe by hand](#write-a-universe-by-hand)
- [Generate one with a script](#generate-one-with-a-script)
- [Load one from a file](#load-one-from-a-file)
- [Check what the library does not](#check-what-the-library-does-not)
- [Keep game state alongside](#keep-game-state-alongside)
- [Attach colors and labels](#attach-colors-and-labels)
- [Use the PRNG for your own content](#use-the-prng-for-your-own-content)
- [Scale up](#scale-up)
- [Change your universe without breaking saves](#change-your-universe-without-breaking-saves)

## Write a universe by hand

The simplest case: a universe in a TypeScript file. Leave out anything
derivable.

```ts
import { createGalaxy, type GalaxyInput } from '@cotontigeh/starmap'

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
          id: 'earth', // a readable id: it becomes a game-state key
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

export const galaxy = createGalaxy(input)
```

Autocomplete does the rest. `GalaxyInput` marks as required only what really is,
and suggests known values for `type`, `class` and `status` without forcing them.

## Generate one with a script

Your script builds the object; `createGalaxy()` turns it into checked terrain.
`createRng()` gives you determinism.

```ts
import { createGalaxy, createRng, type SystemInput } from '@cotontigeh/starmap'

export function generate(seed: string, count = 24) {
  const rng = createRng(seed)

  const systems: SystemInput[] = Array.from({ length: count }, (_, i) => {
    const angle = rng.next() * Math.PI * 2
    // The exponent packs systems toward the middle; 0.72 squashes the disc.
    const radius = 1000 * Math.pow(rng.next(), 0.65)
    const name = `Sector-${i}`

    return {
      id: `sys-${i}`,
      name,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.72,
      security: rng.next(),
      star: { class: rng.pick(['G', 'K', 'M'] as const), radius: rng.randInt(12, 30) },
      planets: Array.from({ length: rng.randInt(1, 8) }, (_, j) => ({
        name: `${name} ${j + 1}`,
        type: rng.pick(['rocky', 'terran', 'gas'] as const),
        orbit: 60 + j * rng.rand(38, 62),
        radius: rng.randInt(3, 12),
        angle: rng.rand(0, 360),
        period: 8 + Math.pow(j + 1, 1.5) * 9, // simplified Kepler: T² ∝ a³
      })),
    }
  })

  const lanes = systems.slice(1).map((s, i) => ({ from: systems[i].id, to: s.id }))

  // `seed` is copied to meta.seed, so you can rebuild this exact universe.
  return createGalaxy({ seed, systems, lanes })
}
```

Two rules once you go further:

- **The order of your draws becomes part of your contract.** One extra
  `rng.next()` in the middle shifts everything after it, so the same seed now
  produces a different universe. Guard your generator with a snapshot test.
- **Keep sequences separate** with `` `${seed}:${domain}` ``, so adding a
  mechanic does not disturb the existing ones.

## Load one from a file

TypeScript's guarantees do not survive `JSON.parse`. `validateGalaxy()` picks up
where the types stop.

```ts
import { validateGalaxy, type Galaxy } from '@cotontigeh/starmap'

export function load(json: string): Galaxy {
  const galaxy = JSON.parse(json) as Galaxy
  const issues = validateGalaxy(galaxy)
  if (issues.length) {
    throw new Error(issues.map((i) => `${i.path}: ${i.message}`).join('\n'))
  }
  return galaxy
}
```

`validateGalaxy()` **never throws**, not even on `null` or on a completely
malformed object. It returns every problem it found, each located by its path, so
you can fix a content file in one pass instead of ten.

If you start from a serialized `GalaxyInput` rather than a `Galaxy`, just call
`createGalaxy()` again: it normalizes **and** validates.

## Check what the library does not

Validation guarantees structural integrity, not that your world makes sense.
Game rules are yours. The one that bites most often:

```ts
import { connectedComponents } from '@cotontigeh/starmap'

const parts = connectedComponents(galaxy)
if (parts.length > 1) {
  throw new Error(`Stranded systems: ${parts.slice(1).flat().join(', ')}`)
}
```

Other checks worth writing, depending on your game:

```ts
for (const s of galaxy.systems) {
  // Orbits strictly increasing, discs not overlapping.
  for (let i = 1; i < s.planets.length; i++) {
    const inner = s.planets[i - 1]
    const outer = s.planets[i]
    if (outer.orbit - outer.radius <= inner.orbit + inner.radius) {
      throw new Error(`${outer.id} overlaps ${inner.id}`)
    }
  }

  // Every neighbour on the network is served by a gate.
  const neighbours = new Set(
    galaxy.lanes
      .filter((l) => l.from === s.id || l.to === s.id)
      .map((l) => (l.from === s.id ? l.to : l.from)),
  )
  const served = new Set(s.gates.flatMap((g) => g.links))
  if (neighbours.size !== served.size) throw new Error(`${s.id}: gates do not match its lanes`)
}
```

## Keep game state alongside

Never mutate the `Galaxy`. Keep a separate layer, keyed by the same ids.

```ts
import { FORMAT_VERSION, type Galaxy } from '@cotontigeh/starmap'
import { generate } from './generator'

interface Save {
  seed: string
  formatVersion: number
  ownedStations: Record<string, string> // stationId -> factionId
  discoveredGates: string[]
  position: { systemId: string }
}

function newGame(seed: string): Save {
  return {
    seed,
    formatVersion: FORMAT_VERSION,
    ownedStations: {},
    discoveredGates: [],
    position: { systemId: 'sys-0' },
  }
}

function load(save: Save): { galaxy: Galaxy; save: Save } {
  if (save.formatVersion !== FORMAT_VERSION) {
    throw new Error(
      `Save is v${save.formatVersion}, the library is v${FORMAT_VERSION}: ` +
        `the terrain no longer rebuilds identically.`,
    )
  }
  // The terrain rebuilds from the seed, so there is nothing to store.
  return { galaxy: generate(save.seed), save }
}
```

A save is a few kilobytes where a dump of the universe would be hundreds. If your
universe is hand-written rather than generated, store a reference to the content
file and its version instead of a seed.

To enrich an object without mutating it:

```ts
function stationWithState(station: Station, save: Save) {
  return { ...station, owner: save.ownedStations[station.id] ?? null }
}
```

## Attach colors and labels

The model has no display fields. Map them in your own code, keyed by a field of
the world. It is one line, and you keep control of theming, translation and
special cases.

```ts
const PLANET = {
  terran: { color: '#4fae6a', label: 'Habitable world' },
  gas: { color: '#d8a06a', label: 'Gas giant' },
  frozen: { color: '#cfe4f0', label: 'Frozen world' },
} as const

const FALLBACK = { color: '#8b8377', label: 'Unknown' }

const style = (p: Planet) => PLANET[p.type as keyof typeof PLANET] ?? FALLBACK
```

The fallback matters: `type` is optional, and the library's unions are **open**,
so a `switch` over them is never exhaustive as far as TypeScript is concerned.

## Use the PRNG for your own content

Reuse `createRng` so your content is reproducible too.

```ts
import { createRng } from '@cotontigeh/starmap'

/** A station's stock, stable for a given save and station. */
function stock(seed: string, stationId: string) {
  const rng = createRng(`${seed}:${stationId}:stock`)
  return {
    credits: rng.randInt(100, 5000),
    goods: rng.pick(['ore', 'food', 'weapons', 'data']),
    rare: rng.chance(0.05),
  }
}
```

The `` `${seed}:${id}:${domain}` `` pattern is the point: each domain gets its
own sequence, so adding a mechanic does not shift the others.

**Never reuse your universe generator's `rng` for this** — you would shift the
whole terrain.

`hashSeed()` is there if you want an integer rather than a generator.

## Scale up

`createGalaxy()` is linear in the number of objects: normalization and validation
each make one pass. At scale, what costs is your generator, not the library.

Two things to watch:

**Validation walks everything.** On a hot path whose input you already validated
upstream — a galaxy read back from your own cache, say — you can skip it:

```ts
const galaxy = createGalaxy(input, { validate: false })
```

Keep that for cases you have measured. Validation is what protects you from
dangling references, and it is not expensive.

**`findRoute()` is Dijkstra with a naive queue**, O(n²) in the number of systems,
and it rebuilds its adjacency list on every call. Comfortable up to a few
thousand systems. If you compute many routes, cache the results or index the
graph yourself.

**Generating in a worker** is fine — the library has no DOM dependency:

```ts
// worker.ts
import { createGalaxy } from '@cotontigeh/starmap'
self.onmessage = (e) => self.postMessage(createGalaxy(e.data))
```

## Change your universe without breaking saves

Two versions to track, and they are not the same thing.

**`FORMAT_VERSION`** is the library's. It changes when the data contract changes
in a breaking way. Compare it to `save.formatVersion` when loading.

**Your content version** is yours. It changes when your universe changes —
whether you edit your generator or your description file. This is the one that
decides whether a save is still playable, because it decides whether the ids
referenced by your game state still exist.

```ts
const CONTENT_VERSION = 3

interface Save {
  formatVersion: number
  contentVersion: number
  // …
}
```

**Safe changes:** appending a system, planet or station **at the end** of an
array; adding an optional field; renaming an object.

**Breaking changes:** removing an object your game state references; reordering
an array whose ids are **derived** (every rank shifts, so every id shifts);
changing the order of draws in your generator.

The best protection is to **provide your ids explicitly**. `earth` stays `earth`
whatever its orbital rank; `sol-p1` becomes `sol-p2` the moment you insert a
planet before it.
