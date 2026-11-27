# @industrieh/starmap

## 0.1.0-beta.1

### Minor Changes

- 2971a48: Fixes from a full review of the libraries, and the APIs they called for.

  `@industrieh/starmap`

  - **Node 18 works again**, as `engines` promises: the ES2023 `toSorted()` calls
    that crashed `createGalaxy()` on any galaxy with a lane are gone, and the
    package now typechecks against ES2022 so they cannot come back.
  - `createGalaxy()` answers a malformed description — an entry that is not an
    object, a collection that is not an array, a missing star, an unknown field
    kind — with a `GalaxyValidationError` naming every problem, instead of an
    internal `TypeError`. The galaxy no longer shares the input's rock arrays.
  - A computed `outerLimit` now reaches the stations around the outermost planet,
    and rocks placed outside their field.
  - `validateGalaxy()` takes `unknown` and truly never throws (a `null` system
    used to crash it). `assertValidGalaxy()` narrows its argument to `Galaxy`.
  - Validation now rejects duplicate local route ids, a local route linking an
    object to itself, and reports a galaxy built for another `FORMAT_VERSION` as
    exactly that — one issue, nothing else checked.
  - New `indexNetwork()`: build the hyperlane network once and pass it to
    `findRoute()`, `neighboursOf()`, `lanesOf()` and `connectedComponents()`.
    `findRoute()` now uses a binary heap — same routes, `O((V + E) log V)`.
  - `rng.fork(label)` gives a mechanic its own sequence. `pick([])` and a weighted
    table nothing can be picked from now throw a `RangeError`.

  `@industrieh/starmap-render`

  - The galaxy backdrop is sown around the centre of the view: a galaxy not
    centred on the origin used to get an empty or lopsided sky.
  - `renderSystem()`'s default `idPrefix` is built from the system's id, so
    several systems on one page no longer share gradients, and every prefix is
    made safe for an XML id (`alpha centauri` used to make the star disappear).
  - Route dash patterns accept the full `stroke-dasharray` syntax — commas
    included — and theme lookups ignore keys inherited from `Object.prototype`.
  - New `layers` option and `SYSTEM_LAYERS` / `GALAXY_LAYERS`: draw what never
    moves once, and only `routes` and `planets` each frame.
  - New theme fields `light`, `shade` and `ringed`; a theme returned by
    `resolveTheme()` is reused without being merged again.
  - Lanes and local routes carry `data-kind`; `role: false` drops `role="img"`
    for interactive drawings; `systemScale()` and `galaxyScale()` expose the size
    units of each drawing; `escapeXml()` drops characters XML cannot hold.
  - The dependency on `@industrieh/starmap` is now a caret range, so an
    application shares one copy of the core.

## 0.1.0-beta.0

### Minor Changes

- First public beta.

  `@industrieh/starmap` describes, validates and queries a star universe:
  `createGalaxy()`, the input schema, routes and indexes, orbital positions over
  time, and a deterministic RNG for writing your own generator.

  `@industrieh/starmap-render` turns that universe into SVG strings:
  `renderSystem()`, `renderGalaxy()`, a theme layer, and the framing helpers
  needed to embed a drawing or make it interactive.
