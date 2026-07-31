# Contributing to `@industrieh/starmap`

Thanks for taking the time. This file covers the package in
`packages/starmap/`. The repo-wide setup is in the [root
README](../../README.md).

## Contents

- [Get set up](#get-set-up)
- [The commands](#the-commands)
- [The house rule](#the-house-rule)
- [What belongs here, and what does not](#what-belongs-here-and-what-does-not)
- [Read the code first](#read-the-code-first)
- [Checklists](#checklists)
- [Writing tests](#writing-tests)
- [Writing comments and docs](#writing-comments-and-docs)
- [Style](#style)
- [Breaking changes](#breaking-changes)
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
resolves the whole workspace; there is nothing to install inside
`packages/starmap` on its own.

`bun run check` runs format, lint, types and tests over the repo. If it passes
on a clean checkout, your setup is good.

## The commands

From the repo root:

| command             | what it does                             |
| ------------------- | ---------------------------------------- |
| `bun run check`     | format + lint + types + tests, all of it |
| `bun run test`      | tests of every package                   |
| `bun run typecheck` | `tsc --noEmit` on every package          |
| `bun run lint`      | oxlint, one pass over the repo           |
| `bun run fmt`       | oxfmt, writes in place                   |

From `packages/starmap/`:

| command              | what it does                              |
| -------------------- | ----------------------------------------- |
| `bun run test`       | Vitest, this package only                 |
| `bun run test:watch` | Vitest in watch mode                      |
| `bun run typecheck`  | `tsc --noEmit`                            |
| `bun run build`      | typecheck, then build `dist/` with tsdown |

Run `bun run check` from the root before you push. It is what CI runs, and
`fmt:check` fails on formatting you could have fixed with `bun run fmt`.

## The house rule

**`src/` knows nothing about UI, the DOM, or rendering.**

No non-relative imports, no browser globals, no `Math.random`, no `Date`, no
colors, no drawable shapes, no `.tsx` and no `.css`. `tests/purity.test.ts`
checks every source file, and `tsconfig.base.json` drops `DOM` from `lib`, so a
stray `document.` does not even compile.

This is what lets the same code run in a browser, in Node or Bun, in a worker,
on a server, under React Native, or inside a game engine.

If a change needs something from that list, it does not belong in this package.
`@industrieh/starmap-render` is where rendering goes.

## What belongs here, and what does not

Three decisions are settled, and a pull request that reverses one will be
declined. The reasoning is in [docs/design.md](docs/design.md).

**The library does not generate universes.** The shape of a galaxy, the faction
table, how many planets a system gets — those are game design. `createRng()` is
the one reusable piece and it is already here.

**The library does not draw.** No components, no hooks, and no display fields in
the data model. There is no `color` and no `typeName`, on purpose.

**The library checks, but does not judge.** It rejects what makes a universe
unusable: duplicate ids, dangling references, values out of range. It accepts
what is merely implausible: orbits that shrink outward, overlapping planets, a
network split in two. Those are design choices, and they belong to the person
describing the world.

One rule settles most "what should the default be?" questions:

> **Compute what is derivable. Never invent a value that carries meaning.**

The library can work out that your second planet is `sol-p1`. It cannot work out
that it is a gas giant, so it does not pretend to.

## Read the code first

[docs/architecture.md](docs/architecture.md) is the tour: the module map, the
normalize → validate pipeline, the invariants, and a table telling you which
files a given change touches.

The short version, in reading order:

1. `src/core/types.ts` — what the library gives back
2. `src/core/input.ts` — what you pass in
3. `src/core/create.ts` — normalization
4. `src/core/validate.ts` — checking
5. `src/core/geometry.ts`, `query.ts`, `rng.ts` — independent of each other

Each file opens with a header comment explaining what it is for. Those headers
are part of the documentation, not decoration.

## Checklists

### Add a field to an object

1. `src/core/input.ts` — add it, optional if the library can derive it.
2. `src/core/types.ts` — add it. Optional **only** if the library genuinely
   cannot know it. Never optional just because the input was.
3. `src/core/create.ts` — copy it through in the matching `normalizeX`. Compute
   it only if it follows from what the user gave.
4. `src/core/validate.ts` — check its runtime type, and its range if it has one.
   Use `optionalNumber()` for a field that may be absent.
5. `tests/fixture.ts` — use it in one place, leave it out in another.
6. `tests/creation.test.ts` — one test that it is carried through or derived.
7. `tests/validation.test.ts` — one test that a bad value is rejected.
8. `docs/data-model.md` — add the row. Tables there are the reference.
9. `README.md` — update the required-fields or filled-in table if it moved.

Steps 1 and 2 are the ones people forget to do together. A field in `Planet`
that no `PlanetInput` can set is unreachable.

### Add a query helper

1. `src/core/query.ts` — write it. Take `Galaxy` first, ids after.
2. `src/index.ts` — export it in the `reading a galaxy` group.
3. `tests/queries.test.ts` — cover the found case and the not-found case.
4. `README.md` — add the row to the API table.

Say in the JSDoc what it costs. Callers need to know whether to build it once or
call it per frame.

### Add or relax a validation check

1. Read [docs/design.md](docs/design.md#validation) first. The line between
   rejected and accepted is deliberate.
2. `src/core/validate.ts` — add it in the pass it belongs to.
3. `tests/validation.test.ts` — one test that it fires, one that a valid galaxy
   still passes.
4. `docs/design.md` — add it to the rejected or accepted list.

A new check on something merely implausible is a breaking change for anyone
whose universe relies on it. Say so in the pull request.

## Writing tests

Vitest, in `tests/`. Run them with `bun run test`.

Tests are named as sentences describing behaviour, not as method names:

```ts
test('planets are numbered by their rank', () => {
  expect(sol.planets.map((p) => p.id)).toEqual(['sol-p0', 'earth'])
  expect(sol.planets.map((p) => p.index)).toEqual([0, 1])
})
```

`tests/fixture.ts` holds one shared universe, written the way a user would write
one: readable ids in places, derived ids elsewhere, optional fields sometimes
present and sometimes missing. Start there. Build a small galaxy inline only
when the fixture cannot express the case.

Validation tests come in pairs: one that the check fires, one that a valid
galaxy stays valid.

Do not test `Math.random` or the clock — there is none. Everything in the
library is deterministic, so an assertion on an exact number is fine.

## Writing comments and docs

Every exported symbol has JSDoc. Say what it does in one line, then what a
caller needs to know: what it throws, what it costs, what it returns when it
finds nothing.

Comments in the body explain **why**, not what. This is the kind that earns its
place:

```ts
// Unknown endpoint: validation reports it, so don't fail here.
length = a && b ? round(Math.hypot(b.x - a.x, b.y - a.y)) : 0
```

The prose style across the package is short sentences, code example first,
explanation after. One idea per sentence. If a paragraph describes what a code
example would show, cut the paragraph.

Four documents, four jobs:

| file                   | holds                                   |
| ---------------------- | --------------------------------------- |
| `README.md`            | what the library is, and how to use it  |
| `docs/data-model.md`   | every field, one by one                 |
| `docs/recipes.md`      | how-to answers, task by task            |
| `docs/design.md`       | why the lines are drawn where they are  |
| `docs/architecture.md` | how the code is built, for contributors |

Put a change in one of them, then cross-link. The same table repeated in three
files drifts.

## Style

Formatting and lint are automatic — `oxfmt` and `oxlint`, configured at the
root. No semicolons, single quotes, 100 columns. Run `bun run fmt` and stop
thinking about it.

Two things the tools cannot decide for you:

**Explicit types on exports.** `isolatedDeclarations` is on, so every exported
declaration carries its type. TypeScript will tell you when you forget.

**No dependencies.** The package has none, and neither does its published
output. A change that adds one needs a very good reason, and probably belongs in
a different package.

## Breaking changes

`FORMAT_VERSION` in `src/core/create.ts` is the version of the data contract.
Bump it whenever a galaxy saved by the old code no longer matches the new shape:
a renamed field, a changed id scheme, a new required field.

A game compares it to `save.formatVersion` to detect an old save. Changing it
silently is worse than the breaking change itself.

Adding an optional field is not a break. Making an existing field required is.

## Sending a change

```bash
git checkout -b feat/short-description
# ... work ...
bun run check
git commit -m "feat: add richness to asteroid clusters"
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org):
`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.

In the pull request, say:

- what changes for someone already using the library;
- whether saved galaxies still load;
- which docs you updated.

One concern per pull request. A field addition and a refactor in the same branch
are two reviews pretending to be one.

## Reporting a bug

Include the smallest `GalaxyInput` that reproduces it:

```ts
createGalaxy({
  systems: [{ id: 'a', name: 'A', x: 0, y: 0, star: { radius: 10 } }],
  lanes: [{ from: 'a', to: 'a' }],
})
```

Then what you expected, and what happened. If it threw, paste the whole
`GalaxyValidationError` message — it lists every problem with its path, and the
path is usually the answer.

Two things that are not bugs:

- **A universe the library accepts but that looks wrong.** Overlapping planets,
  a gate inside a star, a split network — all accepted on purpose. See
  [docs/design.md](docs/design.md#what-is-accepted).
- **A field left `undefined`.** If the library cannot derive it, it does not
  invent it.
