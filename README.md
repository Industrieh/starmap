# starmap

**A star universe you can describe, check, query and draw** — for JavaScript and
TypeScript games.

You write a plain object. The library fills in the ids, the distances, the
counts, tells you where every planet is at any moment — and, if you want it,
hands you the whole thing back as an SVG.

```ts
import { createGalaxy, findRoute } from '@industrieh/starmap'
import { renderGalaxy } from '@industrieh/starmap-render'

const galaxy = createGalaxy({
  systems: [
    { id: 'sol', name: 'Sol', x: 0, y: 0, star: { class: 'G', radius: 18 } },
    { id: 'vega', name: 'Vega', x: 400, y: 300, star: { radius: 14 } },
  ],
  lanes: [{ from: 'sol', to: 'vega' }],
})

findRoute(galaxy, 'sol', 'vega') // { systemIds: ['sol', 'vega'], distance: 500, jumps: 1 }
renderGalaxy(galaxy) // '<svg …>' — a string, nothing else
```

No dependencies. No DOM. No framework. The same code runs in a browser, in Node
or Bun, in a worker, on a server, under React Native, or inside a game engine.

---

## Start here

You need [Bun](https://bun.com). Nothing else.

```bash
git clone <this-repo> && cd starmap
bun install
```

Then pick what you want to look at:

| I want to…                  | run                   | what happens                                           |
| --------------------------- | --------------------- | ------------------------------------------------------ |
| **see it move**             | `bun run dev`         | the playground on http://localhost:5173 — fly a galaxy |
| **read the docs**           | `bun run docs`        | the documentation site on http://localhost:3000        |
| **see the code work**       | `bun run example`     | prints a universe to the terminal, in ~60 lines        |
| **get an SVG file**         | `bun run example:svg` | writes four `.svg` files you can open                  |
| **check nothing is broken** | `bun run check`       | format + lint + types + tests, across the whole repo   |

New here? Run `bun run dev` first — it is the fastest way to understand what
these libraries are for.

---

## The two packages

This repo publishes two libraries. They are deliberately separate: one holds the
**data**, the other decides how it **looks**.

### `@industrieh/starmap` — the model

You describe your universe with a typed object, `createGalaxy()` checks it and
completes it, and you get back something you can query: indexes, routes,
orbital positions over time.

It does **not** generate universes for you, and it does **not** draw anything.
Procedural generation is game design; rendering is UI design. Both are yours.
What they have in common is the data model — that is this package.

→ [README](packages/starmap/README.md) · [guides](packages/starmap/docs/)

### `@industrieh/starmap-render` — the drawing

`renderSystem()` and `renderGalaxy()` turn a universe into an **SVG string**.
Not a component — a string. A component would pick a framework for you; a string
is consumed everywhere: written to a file, inlined in a page, put in a `data:`
URI, rendered on a server, built in a worker.

Colours come in through a theme. Interaction stays with your application: this
package draws one frame, for one moment.

→ [README](packages/starmap-render/README.md) · [guides](packages/starmap-render/docs/)

Its only dependency is `@industrieh/starmap`.

---

## Your first galaxy

`bun run example` runs [`examples/basic`](examples/basic), which walks the path a
consumer actually takes. It prints:

```
✦ 3 systems, 3 planets, 1 stations, radius 650
✦ One single network: 3 systems reachable
✦ High Anchorage: 8 docks, in sol
✦ Sol → Kepler: 2 jumps, 1216 units
  sol → vega → kepler
✦ t= 0s  Earth (130, 75)  ·  its station follows at (144, 75)
✦ t= 6s  Earth (-75, 130)  ·  its station follows at (-89, 130)
✦ t=12s  Earth (-130, -75)  ·  its station follows at (-116, -75)
```

Six commented steps in [`examples/basic/src/index.ts`](examples/basic/src/index.ts):
**describe** a universe → **build** it → **check** what the library will not →
**query** it → **animate** it → **keep your game state alongside** it.

From there, [`examples/playground`](examples/playground) is the same ideas as a
real app, and its README reads as a tutorial: seven numbered files, from a seed
to a clickable map.

---

## The repo map

```
packages/     what gets published to npm
apps/         what gets deployed
examples/     what never leaves the repo
```

| folder                                                           | package                                    | what it is                                             |
| ---------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| [`packages/starmap`](packages/starmap)                           | `@industrieh/starmap`                      | **the core** — describe, validate and query a universe |
| [`packages/starmap-render`](packages/starmap-render)             | `@industrieh/starmap-render`               | **the renderer** — a galaxy or a system, as SVG        |
| [`apps/docs`](apps/docs)                                         | `@industrieh/docs`                         | the documentation site, on Next.js — `private`         |
| [`examples/basic`](examples/basic)                               | `@industrieh/example-basic`                | describe a universe and query it — `private`           |
| [`examples/basic-svg-generation`](examples/basic-svg-generation) | `@industrieh/example-basic-svg-generation` | draw it as SVG files — `private`                       |
| [`examples/playground`](examples/playground)                     | `@industrieh/example-playground`           | the full React app — `private`                         |

This three-way split is the common convention, and it carries useful
information: a package's folder says **what happens to it**. A package in
`packages/` is versioned and published, so its public API is a commitment. A
package in `examples/` is `private` and will never be installed by anyone, so it
can break without consequence. `apps/` gets deployed and never installed.

It is a [Bun workspaces](https://bun.com/docs/guides/install/workspaces)
monorepo — one `bun install` at the root wires everything together.

---

## Commands

All of them run from the root.

| command               | what it does                                  |
| --------------------- | --------------------------------------------- |
| `bun run dev`         | opens `examples/playground`, the full app     |
| `bun run docs`        | opens `apps/docs`, the documentation site     |
| `bun run example`     | runs `examples/basic`                         |
| `bun run example:svg` | runs `examples/basic-svg-generation`          |
| `bun run build`       | builds every package, **in dependency order** |
| `bun run test`        | tests every package — 196 tests today         |
| `bun run typecheck`   | `tsc --noEmit` on every package               |
| `bun run lint`        | oxlint, one pass over the repo                |
| `bun run fmt`         | oxfmt, one pass over the repo                 |
| `bun run check`       | the four above, in order                      |

`build`, `test` and `typecheck` are fan-outs of `bun run --filter '*' <script>`:
Bun honours dependency order, so `starmap` is built before `starmap-render`. To
target a single package:

```bash
bun run --filter '@industrieh/starmap' test
bun run --filter './packages/*' build
```

`lint` and `fmt` are **not** fan-outs: oxlint and oxfmt walk the repo in one
pass from the root, with a single config. A fan-out would be slower and would
let rules drift from one package to the next.

---

## Documentation

Three places, in order of depth:

| where                                    | what you get                                               |
| ---------------------------------------- | ---------------------------------------------------------- |
| each package's `README.md`               | the tour — install, build, query, draw, full API tables    |
| each package's `docs/`                   | the long form — data model, architecture, recipes, theming |
| `bun run docs`, on http://localhost:3000 | all of it as a site: 21 pages, searchable, with a sidebar  |

The site ([`apps/docs`](apps/docs)) is a Next.js 16 app — App Router, Tailwind
CSS v4, shadcn/ui. Its pages are TSX rather than Markdown, so the code examples
are typechecked against the real libraries and the build fails when a signature
moves. `src/lib/routes.ts` says which pages exist; `src/content/` says what is
in them.

---

## How the repo is put together

The four conventions below are the ones worth knowing before you add a file.

### Packages resolve to their sources

`tsconfig.base.json` declares `paths` pointing every package of the repo at its
`src/`, not at its `dist/`. Without that, typechecking `starmap-render` would
require having built `starmap` first, and a stale `dist/` would produce phantom
errors.

Bun honours those `paths` at runtime, so `bun run example` also runs against the
sources — no build needed to try something out. Vitest does not read them: a
package that depends on another declares the equivalent alias in its
`vitest.config.ts` (see `packages/starmap-render/vitest.config.ts`). Vite does
not read them either, hence the two aliases in
`examples/playground/vite.config.ts`.

> **For every new package:** add its entry to the `paths` of
> `tsconfig.base.json`.

`dist/` remains what **external consumers** see: it is what `main`, `types` and
`exports` point at, and the only thing that goes into the npm tarball (the
`files` field).

### Every exported declaration carries an explicit type

`isolatedDeclarations` is on in `tsconfig.base.json`. In practice:
`export function f(x: number)` does not compile, it has to be
`export function f(x: number): string`. A default export must be annotated too,
hence the `const config: UserConfig = defineConfig({ … })` in the config files.

Two reasons, and the second is far more concrete than the first:

1. **The public API is readable and stable.** A signature can no longer change
   as a side effect of an implementation detail, because it is written down.
2. **The build stops polluting the sources.** Left alone, tsdown infers its
   `.d.ts` generator from the installed TypeScript version: with TypeScript 7 it
   switches to `tsgo`, still experimental, which writes an intermediate `.d.ts`
   **next to every source**. With `isolatedDeclarations` it infers `oxc` —
   declarations generated in memory, twice as fast, equivalent output. The
   tsdown configs then need nothing but `dts: true`, with no override.

### Tooling at the root, dependencies in the packages

`typescript`, `oxlint`, `oxfmt` and `@types/node` are devDependencies of the
root: one version for the whole repo, and no way to end up with two versions of
TypeScript contradicting each other.

That rule cost something to keep in `apps/docs`: `next build` typechecks through
the TypeScript **compiler API**, which the 7.x line no longer exposes, so
Next.js 16 refuses it outright and asks for a TypeScript of its own. Rather than
a second version in the repo, the app sets `experimental.useTypeScriptCli` and
Next.js shells out to `tsc` instead — same check, four times faster. The reason
is written in `apps/docs/next.config.ts`, next to the flag.

What a package needs in order to build or test itself (`tsdown`, `vitest`) lives
in **its own** `package.json` — a package stays readable and movable on its own.
Production dependencies too, obviously.

Packages reference each other with the `workspace:*` protocol:

```json
{ "dependencies": { "@industrieh/starmap": "workspace:*" } }
```

### Every package stands alone

It carries its `package.json`, its `tsconfig.json` (extending
`tsconfig.base.json`), its build and test config, its README. Only formatting,
linting and tooling versions are shared.

---

## Driving a browser

`apps/docs` is the first thing in this repo that has to be _looked at_ rather
than asserted about, so the repo carries two ways to drive a real browser
against it. They overlap, and that is deliberate — they fail in different
places.

**The Playwright MCP server**, declared in [`.mcp.json`](.mcp.json). The agent
calls browser actions as tools, one per turn: navigate, click, read the console,
snapshot the accessibility tree. Nothing to install beyond the browsers; `npx`
fetches the server. Best for looking around and for short interactions.

**The `webapp-testing` skill**, in `.agents/skills/webapp-testing/`, installed
from `anthropics/skills`. The agent writes a Python Playwright script and runs
it. Slower to start, but it is a real program: loops, assertions, multiple
pages, and `scripts/with_server.py` to bring servers up and down around it. Best
for a scripted scenario, or anything to be replayed.

The skill needs a Python environment, which the repo does **not** install for
you — `.venv` is gitignored. To rebuild it:

```bash
python3 -m venv --without-pip .venv          # this box has no ensurepip
curl -sSL https://bootstrap.pypa.io/get-pip.py | .venv/bin/python
.venv/bin/python -m pip install playwright
.venv/bin/python -m playwright install chromium
```

The browsers land in `~/.cache/ms-playwright/` and are shared with the MCP
server, which pulls its own build there via `npx playwright install chromium`.

The other skills vendored under `.agents/skills/` — `bun`, `shadcn`,
`tailwind-4-docs`, `vite`, and two more — are pinned in
[`skills-lock.json`](skills-lock.json) with the repo they came from.

---

## Publishing

Both packages are at `0.1.0` and still `"private": true`. To publish one: drop
the flag, then `npm publish` from its folder. The `files` field ships `dist/`
and nothing else.

Until they are on npm, install them from a path or from git:

```bash
bun add @industrieh/starmap@file:../starmap/packages/starmap
bun add github:industrieh/starmap
```

---

## Stack

Bun · TypeScript 7 (`isolatedDeclarations`) · tsdown · Vitest · oxlint · oxfmt ·
Next.js 16 · React 19 · Vite 8 · Tailwind CSS v4 · shadcn/ui
