# apps/docs

**Reserved spot — empty for now, we come back to it later.**

This folder will hold the **documentation site** of the monorepo: a site of its
own, gathering the documentation of _every_ package.

## In the meantime

Documentation lives in each package, as close as possible to the code it
describes:

| package                                                       | documentation                              |
| ------------------------------------------------------------- | ------------------------------------------ |
| [`@cotontigeh/starmap`](../../packages/starmap)               | `README.md`, `CONTRIBUTING.md` and `docs/` |
| [`@cotontigeh/starmap-render`](../../packages/starmap-render) | `README.md`, `CONTRIBUTING.md` and `docs/` |

That is deliberate, and it does not change when the site arrives: the source of
truth stays the Markdown inside the package, and the site aggregates it.
Documentation that lives somewhere other than the code it describes goes stale.

## When we get back to it

The folder is not a workspace yet: it has no `package.json`. Adding one is
enough — the root already globs `apps/*`.

The first thing to settle: **how the site reads the packages**. Two approaches,
to choose between before writing anything.

- **Aggregate the existing Markdown** — the site imports each package's
  `README.md` and `docs/`. Simple, no coupling, but the relative links between
  files (`[docs/design.md](docs/design.md)`, `../starmap/README.md`) have to be
  rewritten at build time.
- **Generate from the sources** (TypeDoc or equivalent, over the public
  entries). The packages' JSDoc is already written for it — examples included,
  `{@link}` in place. Richer for the API reference, but no replacement for the
  guides.

The likely answer is a mix: guides from the Markdown, API reference from the
sources.
