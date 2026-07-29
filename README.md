# starmap

A [Bun workspaces](https://bun.com/docs/guides/install/workspaces) monorepo
around a model of a **star universe** for JavaScript / TypeScript games.

```bash
bun install
bun run dev            # the playground app: generate a galaxy and fly through it
bun run docs           # the documentation site
bun run check          # format + lint + types + tests, across the repo
bun run example        # describe a universe and query it
bun run example:svg    # draw it as SVG
bun run example:react  # play with it in a browser
```

## The map

```
packages/     what gets published to npm
apps/         what gets deployed
examples/     what never leaves the repo
```

| folder                                                           | package                                    | what it is                                             |
| ---------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| [`packages/starmap`](packages/starmap)                           | `@cotontigeh/starmap`                      | **the core** — describe, validate and query a universe |
| [`packages/starmap-render`](packages/starmap-render)             | `@cotontigeh/starmap-render`               | **the renderer** — a `Galaxy` or a system, as SVG      |
| [`apps/docs`](apps/docs)                                         | `@cotontigeh/docs`                         | the documentation site, on Next.js — `private`         |
| [`examples/basic`](examples/basic)                               | `@cotontigeh/example-basic`                | runnable example, `private`                            |
| [`examples/basic-svg-generation`](examples/basic-svg-generation) | `@cotontigeh/example-basic-svg-generation` | runnable example, `private`                            |
| [`examples/interactive-react`](examples/interactive-react)       | `@cotontigeh/example-interactive-react`    | runnable example, `private`                            |
| [`examples/playground`](examples/playground)                     | `@cotontigeh/example-playground`           | the full app, `private`                                |

This three-way split is the common convention, and it carries useful
information: a package's folder says **what happens to it**. A package in
`packages/` is versioned and published, so its public API is a commitment. A
package in `examples/` is `private` and will never be installed by anyone, so it
can break without consequence. `apps/` gets deployed and never installed.

## The packages

**`@cotontigeh/starmap`** — the core. You describe your universe with a typed
object, `createGalaxy()` checks and completes it, and you get back what you need
to query it (indexes, routes, orbital positions over time). No dependencies, no
DOM access, no notion of rendering. Its full documentation is in
[its README](packages/starmap/README.md) and
[`packages/starmap/docs/`](packages/starmap/docs/).

**`@cotontigeh/starmap-render`** — the renderer. `renderSystem()` and
`renderGalaxy()` turn a universe into an **SVG string**: no DOM, no framework,
no stylesheet. Colours come in through a theme, interaction stays with the
application. Its full documentation is in
[its README](packages/starmap-render/README.md) and
[`packages/starmap-render/docs/`](packages/starmap-render/docs/).

## Commands

All of them run from the root.

| command                 | what it does                                 |
| ----------------------- | -------------------------------------------- |
| `bun run build`         | build every package, **in dependency order** |
| `bun run test`          | test every package                           |
| `bun run typecheck`     | `tsc --noEmit` on every package              |
| `bun run lint`          | oxlint, one pass over the repo               |
| `bun run fmt`           | oxfmt, one pass over the repo                |
| `bun run check`         | the four above, in order                     |
| `bun run example`       | runs `examples/basic`                        |
| `bun run example:svg`   | runs `examples/basic-svg-generation`         |
| `bun run example:react` | opens `examples/interactive-react` on Vite   |
| `bun run dev`           | opens `examples/playground`, the full app    |
| `bun run docs`          | opens `apps/docs`, the documentation site    |

`build`, `test` and `typecheck` are fan-outs of `bun run --filter '*' <script>`:
Bun honours dependency order, so `starmap` is built before `starmap-render`. To
target a single package:

```bash
bun run --filter '@cotontigeh/starmap' test
bun run --filter './packages/*' build
```

`lint` and `fmt` are **not** fan-outs: oxlint and oxfmt walk the repo in one
pass from the root, with a single config. A fan-out would be slower and would
allow rules to drift from one package to the next.

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

## Conventions

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
`examples/interactive-react/vite.config.ts`.

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
{ "dependencies": { "@cotontigeh/starmap": "workspace:*" } }
```

### Every package stands alone

It carries its `package.json`, its `tsconfig.json` (extending
`tsconfig.base.json`), its build and test config, its README. Only formatting,
linting and tooling versions are shared.

## Publishing

The packages are still `"private": true`. To publish one: drop the flag, then
`npm publish` from its folder. The `files` field ships `dist/` and nothing else.
