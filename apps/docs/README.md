# apps/docs

The **documentation site** of the monorepo: one site gathering the documentation
of _every_ package.

```bash
bun run docs          # from the root — dev server on http://localhost:3000
bun run --filter '@cotontigeh/docs' build
```

## What is here

A [Next.js](https://nextjs.org) app — App Router, TypeScript, Tailwind CSS v4 —
scaffolded with `create-next-app` and then folded into the conventions of the
repo. Nothing is documented yet: the scaffold is standing and verified, the
content comes next.

```
src/app/         the routes — App Router, so a folder is a URL
src/app/globals.css   the single stylesheet, where Tailwind is imported
public/          static assets, served from `/`
next.config.ts   the app configuration
```

## What differs from a plain `create-next-app`

Five deliberate departures, so that the app looks like the rest of the repo
rather than like a fresh scaffold.

- **No ESLint, no Prettier.** The repo lints with `oxlint` and formats with
  `oxfmt`, both from the root, and this app is no exception. It has no linter
  config of its own; the `apps/docs/**` override in
  [`.oxlintrc.json`](../../.oxlintrc.json) adds the three plugins a React app
  needs — `react`, `jsx-a11y`, `nextjs`.
- **`tsconfig.json` extends [`tsconfig.base.json`](../../tsconfig.base.json)**
  and puts back what a browser app needs: the DOM, JSX, and the packages of the
  repo resolved to their sources. `isolatedDeclarations` is switched off — it
  exists so that the libraries can emit their `.d.ts` file by file, and a site
  emits nothing.
- **Named `@cotontigeh/docs`**, `private`, `version 0.0.0` — an app is deployed,
  never installed, so its version number carries no information.
- **No `typescript` of its own.** It uses the root's, like every other package,
  which takes one flag in [`next.config.ts`](next.config.ts) — the comment there
  explains why.
- **`AGENTS.md` and `CLAUDE.md`** come from
  [the Next.js guide for coding agents](https://nextjs.org/docs/app/guides/ai-agents).
  They point agents at `node_modules/next/dist/docs/`, the documentation bundled
  with the installed version of Next.js, rather than at their training data.
  Keep your own instructions outside the `nextjs-agent-rules` markers.

## Still to settle: how the site reads the packages

The source of truth stays the Markdown inside each package — documentation that
lives somewhere other than the code it describes goes stale. The site
_aggregates_ it. How, exactly, is the open question.

- **Aggregate the existing Markdown** — the site reads each package's
  `README.md` and `docs/`. Simple, no coupling, but the relative links between
  files (`[docs/design.md](docs/design.md)`, `../starmap/README.md`) have to be
  rewritten at build time.
- **Generate from the sources** (TypeDoc or equivalent, over the public
  entries). The packages' JSDoc is already written for it — examples included,
  `{@link}` in place. Richer for the API reference, but no replacement for the
  guides.

The likely answer is a mix: guides from the Markdown, API reference from the
sources. Until then, the documentation of each package lives where it always
has.

| package                                                       | documentation                              |
| ------------------------------------------------------------- | ------------------------------------------ |
| [`@cotontigeh/starmap`](../../packages/starmap)               | `README.md`, `CONTRIBUTING.md` and `docs/` |
| [`@cotontigeh/starmap-render`](../../packages/starmap-render) | `README.md`, `CONTRIBUTING.md` and `docs/` |

Neither package is a dependency of this app yet. Add them when the site starts
showing live examples — they will need `transpilePackages` in `next.config.ts`,
or a build, since their `exports` point at `dist/`.
