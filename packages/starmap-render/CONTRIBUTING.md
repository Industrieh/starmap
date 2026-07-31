# Contributing to `@industrieh/starmap-render`

Thanks for taking the time. This file covers the package in
`packages/starmap-render/`. The core has [its own
guide](../starmap/CONTRIBUTING.md), and the repo-wide setup is in the [root
README](../../README.md).

## Contents

- [Get set up](#get-set-up)
- [The commands](#the-commands)
- [The house rule](#the-house-rule)
- [What belongs here, and what does not](#what-belongs-here-and-what-does-not)
- [Read the code first](#read-the-code-first)
- [Checklists](#checklists)
- [Looking at what you changed](#looking-at-what-you-changed)
- [Writing tests](#writing-tests)
- [Writing comments and docs](#writing-comments-and-docs)
- [Style](#style)
- [Add a changeset](#add-a-changeset)
- [Sending a change](#sending-a-change)
- [Reporting a bug](#reporting-a-bug)

## Get set up

```bash
git clone git@github.com:industrieh/starmap.git
cd starmap
bun install
bun run check
```

[Bun](https://bun.com) is the only thing you need installed. `bun install`
resolves the whole workspace.

This package depends on the core through `workspace:*`, and its tests alias
`@industrieh/starmap` to the core's **sources** — so you never have to build the
core before working here.

## The commands

From `packages/starmap-render/`:

| command              | what it does                              |
| -------------------- | ----------------------------------------- |
| `bun run test`       | Vitest, this package only                 |
| `bun run test:watch` | Vitest in watch mode                      |
| `bun run typecheck`  | `tsc --noEmit`                            |
| `bun run build`      | typecheck, then build `dist/` with tsdown |

From the repo root, `bun run check` runs format, lint, types and tests over
everything. Run it before you push.

## The house rule

**`src/` imports `@industrieh/starmap`, or something relative. Nothing else.**

No DOM, no framework, no stylesheet, no clock, no unseeded randomness, no
`.tsx`, no `.css`. `tests/purity.test.ts` checks every source file, and
`tsconfig.base.json` drops `DOM` from `lib`, so a stray `document.` does not even
compile.

Two consequences worth stating on their own:

**A drawing is a pure function of its arguments.** Same data, same `t`, same
theme, same string — byte for byte. That is what lets a caller cache it, diff it,
or snapshot it, and it is why `Math.random()` and `Date.now()` are banned rather
than discouraged.

**The package returns strings and never touches the page.** If a change needs an
element, a listener or a stylesheet, it belongs in the application, and the
package's job is to give it the hooks it needs — which today are `data-id`,
`data-kind` and `data-layer`.

## What belongs here, and what does not

**Drawing belongs here.** Shapes, layers, framing, colours.

**Interaction does not.** Pan, zoom, selection, hover, the clock: application
state, handled differently by every project. The package draws one frame for one
moment.

**Nothing about the world belongs here.** If a value describes the universe
rather than its picture, it goes in the core's data model. This package reads
the model; it never asks for a field to be added to it for the sake of a
drawing.

**No colour in the core, and no world fact in the theme.** That line is the
reason the two packages are separate.

## Read the code first

Three documents, in this order:

1. [docs/architecture.md](docs/architecture.md) — the module map and the
   pipeline
2. [docs/drawing.md](docs/drawing.md) — what a star, a planet, a belt are made
   of
3. [docs/theming.md](docs/theming.md) — the colours and how they resolve

Then the sources, in reading order: `svg.ts`, `theme.ts`, `geometry.ts`,
`root.ts`, `system.ts`, `galaxy.ts`. Each opens with a header comment explaining
what it is for.

## Checklists

### Change how an object looks

1. `src/core/system.ts` (or `galaxy.ts`) — the matching `draw*` function.
2. Look at it. See [below](#looking-at-what-you-changed) — a visual change needs
   eyes on it, not only a green test run.
3. `tests/system.test.ts` — assert on what must be true (a ring is there, an id
   is there), not on the exact markup.
4. `docs/drawing.md` — update the description if the construction changed.

Sizes go through the `Scale` of the file — `u`, `k`, `font` — never in absolute
units. A drawing has to hold up in a system 300 units across and in one 30 000
units across.

### Add a colour

1. `src/core/theme.ts` — add it to **both** `Theme` and `ThemeInput`, and give
   it a value in `DEFAULT_THEME`.
2. Use it in the drawing.
3. `docs/theming.md` — add the row, and the value in the defaults block.

A new keyed table also needs merging in `resolveTheme()` and a required
`default` entry.

### Add a render option

1. The options interface in `system.ts` or `galaxy.ts`, with a `@default` tag.
2. The destructuring at the top of `renderXContent()`, with the default value.
3. `tests/…` — one test that it does something, one that the default is
   unchanged.
4. The option table in `README.md`.

An option that only some drawings honour is a smell. If it applies to both, put
it in both.

### Add a new drawable object

1. A `draw*` function returning a string, and its place in the layer order —
   order _is_ the composition, SVG has no `z-index`.
2. `data-kind` and `data-id` on its group, so an application can find it.
3. Its colour in the theme.
4. `tests/fixture.ts` — one of them, so every other test sees it too.
5. `docs/drawing.md` — how it is built.

### Touch the string primitives

`src/core/svg.ts` is the only file that writes a tag. A change here reaches
every drawing, so it comes with tests in `tests/svg.test.ts` first, and the
change to the callers second.

## Looking at what you changed

Tests do not tell you whether a drawing looks right. Render one and open it:

```bash
# from packages/starmap-render/
bun -e '
  import { renderSystem } from "./src/index"
  import { sol } from "./tests/fixture"
  await Bun.write("/tmp/sol.svg", renderSystem(sol, { t: 3, width: 700, height: 700 }))
' && open /tmp/sol.svg
```

Worth a look every time: a large system and a small one, a system with no
planets, a drawing at 64 pixels, and a non-square `width`/`height` — that last
one is what catches a background that does not cover the letterboxed bands.

## Writing tests

Vitest, in `tests/`. Run them with `bun run test`.

Assert on **what must be true**, not on the markup:

```ts
// good — survives any visual change that keeps the meaning
expect(svg).toContain('data-kind="planet" data-id="earth"')
expect(svg.match(/data-kind="planet"/g)).toHaveLength(3)

// bad — fails the next time a stroke width is tuned
expect(svg).toContain('<circle r="6" fill="#4fae6a" stroke-width="0.87"/>')
```

`tests/fixture.ts` holds one universe carrying one of everything drawable. Start
there; build a galaxy inline only for a case the fixture cannot express — a
degenerate one, usually.

Two habits that pay for themselves:

- **Check well-formedness** with `xmlProblems()` whenever you add markup. It
  catches an unclosed tag and an unescaped name, which are the two ways a string
  renderer breaks.
- **Cover the degenerate case.** An empty galaxy, a system with nothing in it, a
  planet with no `type`. The model makes most fields optional, so the drawing
  meets them.

## Writing comments and docs

Every exported symbol has JSDoc: what it does in one line, then what a caller
needs to know — what it returns when it finds nothing, what it costs, what has
to be unique.

Comments in the body explain **why**. In this package that usually means why a
number is what it is:

```ts
// The halo is six times the disc. It is what reads as brightness.
el('circle', { r: star.radius * 6, fill: `url(#${prefix}-glow)` })
```

A magic number with no comment is the one thing a reviewer will ask about, every
time.

The prose style is short sentences, code example first, explanation after. One
idea per sentence.

| file                   | holds                                   |
| ---------------------- | --------------------------------------- |
| `README.md`            | what the package is, and how to use it  |
| `docs/theming.md`      | every colour, and how to replace it     |
| `docs/drawing.md`      | how each object is constructed          |
| `docs/recipes.md`      | how-to answers, task by task            |
| `docs/architecture.md` | how the code is built, for contributors |

## Style

Formatting and lint are automatic — `oxfmt` and `oxlint`, configured at the
root. No semicolons, single quotes, 100 columns. Run `bun run fmt`.

Two things the tools cannot decide:

**Explicit types on exports.** `isolatedDeclarations` is on, so every exported
declaration carries its type — including a parameter with a default value.

**One dependency.** The core, and nothing else. A change that adds a second one
needs a very good reason.

## Add a changeset

**A pull request that changes what the published package draws or exposes
carries a changeset.** Without one, the change is merged and never released.

From the repo root:

```bash
bun run changeset
```

It asks which packages changed, how big the bump is, and for a summary. It then
writes a markdown file in `.changeset/` — commit it along with your change.

Pick the bump by what the change does to the output or the API:

| bump      | for                                                                |
| --------- | ------------------------------------------------------------------ |
| **patch** | a drawing fix, a tuned number, a colour correction — same API      |
| **minor** | a new render option, a new theme key, a new drawable object        |
| **major** | a removed or renamed export or option, a changed `data-*` contract |

A visual change is a real change. Someone snapshot-testing their drawings will
see it, so it gets a changeset even when no signature moved.

The summary lands in the CHANGELOG, where it is read by someone upgrading. Say
what changed **for them**, not what you did to the code:

```md
---
'@industrieh/starmap-render': minor
---

`renderSystem()` now takes a `labels` option. Set it to `false` to draw a system
without any text — useful for thumbnails.
```

Some pull requests need no changeset: docs, tests, CI, tooling, and anything
touching only `apps/` or `examples/` — those are private and never published.
When in doubt, add one; an extra patch entry costs nothing.

The repo is in **pre-release mode** (`.changeset/pre.json`, tag `beta`), so
these bumps come out as `0.1.0-beta.N`. Nothing to do about it — it is just why
the version you see is not the one you picked.

What happens next is not yours to do: pushing to `main` opens or updates a
`chore: version packages` pull request
([version.yml](../../.github/workflows/version.yml)), merging it bumps the
versions and writes the CHANGELOGs, and publishing a GitHub release ships to npm
([release.yml](../../.github/workflows/release.yml)). `bun run changeset:status`
lists what is waiting.

## Sending a change

```bash
git checkout -b feat/short-description
bun run check
bun run changeset
git commit -m "feat: draw rings on ice giants"
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org).

In the pull request, say what changes for someone already using the package, and
**show the drawing** — before and after. A visual change is not reviewable from
a diff. Check the changeset is in there too.

## Reporting a bug

Include the smallest galaxy that reproduces it, and say what you expected to
see:

```ts
const galaxy = createGalaxy({
  systems: [{ id: 'a', name: 'A', x: 0, y: 0, star: { radius: 10 } }],
})
renderSystem(galaxy.systems[0]) // expected …, got …
```

If the output is malformed, paste it. If it merely looks wrong, attach the
rendered image — that is faster than describing it.

Two things that are not bugs:

- **A field left `undefined` drawing as the fallback.** The core never invents a
  value, so the drawing has one for every table.
- **A drawing that does not react to a click.** There is no interaction here on
  purpose; `data-id` is the hook, and the handler is yours.
