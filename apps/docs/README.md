# apps/docs

The **documentation site** of the monorepo: one site gathering the documentation
of _every_ package.

```bash
bun run docs          # from the root — dev server on http://localhost:3000
bun run --filter '@industrieh/docs' build
```

## What is here

A [Next.js](https://nextjs.org) app — App Router, TypeScript, Tailwind CSS v4,
shadcn/ui — scaffolded with `create-next-app` and then folded into the
conventions of the repo. **Both packages are documented in full** — 21 pages,
every code example checked against the real libraries.

```
src/app/                       the routes — App Router, so a folder is a URL
  page.tsx                     the home page
  docs/layout.tsx              sidebar + reading column
  docs/[library]/              one library's overview
  docs/[library]/[slug]/       one documentation page
src/content/                   the prose, one module per page
src/components/docs/           the toolkit those pages are written with
src/components/ui/             the shadcn components, vendored by its CLI
src/lib/routes.ts              every path, and the shape of the navigation
src/lib/versions.ts            the packages' versions, read on the server only
src/lib/metadata.ts            titles, canonical URLs, Open Graph — one helper
src/lib/svg-outline.ts         folds real renderer output into a short listing
src/lib/utils.ts               `cn()`, the class merger shadcn components import
src/app/globals.css            Tailwind, shadcn, the design tokens
components.json                what the shadcn CLI reads before writing anything
```

## Where the prose lives

Two files decide what a documentation page is:

- [`src/lib/routes.ts`](src/lib/routes.ts) — **which pages exist**, how they are
  grouped, and their one-line descriptions. The sidebar, the header tabs and
  `generateStaticParams` all read it.
- [`src/content/registry.ts`](src/content/registry.ts) — **what is in them**. A
  page is a module exporting a `toc` and a default component, under
  `src/content/<library>/<slug>.tsx`.

Adding a page is one entry in each. They can be written out of step: a page in
`routes.ts` with no content renders a marker instead of a 404, so navigation can
be planned before the prose exists. A URL that is in neither is a real 404:
both dynamic routes set `dynamicParams = false`.

The content is TSX rather than Markdown, and that is a real trade. Markdown is
faster to write and anyone can edit it; TSX gives typechecked components
(`PropsTable`, `ApiEntry`, `Steps`, `Callout`), a `toc` that cannot drift from
the headings, and a build that fails when a component signature changes. For a
reference site where most pages are structured tables rather than paragraphs,
the second set of guarantees won.

### The toolkit

Everything a page is built from lives in [`src/components/docs/`](src/components/docs/):

| component            | what it is for                                               |
| -------------------- | ------------------------------------------------------------ |
| `prose.tsx`          | `H2`, `P`, `C`, `A`… — headings take an explicit `id`        |
| `Callout`            | note / tip / warning / danger, four tones and no more        |
| `Steps` / `Step`     | numbered walkthrough, counter in CSS so inserting renumbers  |
| `PropsTable`         | field, type, description — the shape of every reference page |
| `ApiEntry`           | signature, params, returns, throws, example                  |
| `PackageManagerTabs` | one command, four package managers                           |
| `TableOfContents`    | the right rail, tracked with an `IntersectionObserver`       |
| `CopyButton`         | the only client-side part of a code block                    |

Headings take their `id` as a required prop rather than deriving it from the
text. The table of contents links to those ids, and a derived id breaks silently
the day someone rewords a heading.

## The routes live in one file

[`src/lib/routes.ts`](src/lib/routes.ts) holds both the paths and the tree of
documentation pages. Nothing else in the app writes a URL as a string literal,
and the sidebar, the header tabs, the home page and `generateStaticParams` all
read that one structure — so **the navigation cannot drift from the routes**.
Adding a page is a single entry there; the route appears, prerendered, at the
next build.

Two notes on the choices:

- **`routes.ts`, not `route.ts`.** Inside `src/app/` the App Router reserves
  `route.ts` for HTTP route handlers. A file with that name reads as an endpoint
  to anyone who knows Next.js, so it is `routes.ts` — and it sits in `src/lib/`
  because it is plain data, importable from a Server Component, a Client
  Component or a script.
- **Dynamic segments rather than a folder per page.** `[library]/[slug]` with
  `generateStaticParams` means the file tree stays two files deep while the site
  grows. The build prerenders every page as static HTML either way, and
  `sitemap.xml`, built from the same list, names each one.

## The shape of the site

Two documentations under one roof, which is the whole layout problem. The answer
is borrowed from [bun.com/docs](https://bun.com/docs) and
[docs.deno.com](https://docs.deno.com): **one tab per library in the header**, so
neither reads as a subsection of the other, and a sidebar that shows only the
library you are currently in.

- **Header** — logo, the library tabs, GitHub, theme. Sticky; its height is
  `--header-height` in `globals.css`, stated once because the sidebar sticks
  underneath it.
- **Sidebar** — desktop only, `collapsible="none"` so this app owns the geometry
  instead of fighting the fixed-position variants. Below `md` the same links
  live in a `Sheet` opened from the header. Both render the same `DocsNav`, so a
  page cannot appear in one and not the other.
- **Footer** — full width, under everything.
- **Theme** — `next-themes` with `attribute="class"`, three choices (light, dark,
  system). The class lands on `<html>`, which is what
  `@custom-variant dark (&:is(.dark *))` looks for.
- **Backdrop** — [`StarField`](src/components/star-field.tsx), an SVG built from
  a _seeded_ generator. `Math.random()` would give the server and the client two
  different skies and React would call it a hydration mismatch; with a seed the
  drawing is a pure function of a number. The lanes between near neighbours are
  the same idea the model encodes, which is why the backdrop is the subject
  rather than a texture.

## The drawings are real

The pictures on the `starmap-render` pages are not screenshots. Each one is
produced by calling the renderer while the page is being prerendered, from the
fixture in
[`src/content/starmap-render/fixture.ts`](src/content/starmap-render/fixture.ts):

```tsx
const FIRST = renderSystem(SOL, { t: 3, idPrefix: 'qs-first' })
// …
<RenderPreview svg={FIRST} caption="…" />
```

A drawing that stops matching the code cannot happen, because there is only one
of them. `RenderPreview` and `RenderCompare` do nothing but frame the string —
no client JavaScript is involved, and the renderer never reaches the browser.
The same goes for the listings of what a call returns: `svg-outline.ts` folds
the real output instead of a copy being typed next to it.

Three things to respect when adding one:

- **Give every preview its own `idPrefix`.** A drawing declares gradients in
  `<defs>`, and SVG ids are global to the page. A system's default prefix comes
  from its id, so two _different_ systems never collide — but these pages draw
  the same Sol over and over, re-themed, and the same system twice on a page is
  the one case where two previews would share gradient ids. The Framing page
  documents it.
- **Show the fixture, not a retyped literal.** The Quickstart prints
  `FIXTURE_SOURCE`, which is the source of the universe the drawings are made
  from. It is written twice — as text, and as the code that builds `GALAXY` — so
  `fixture.ts` checks when it loads that the text still builds that exact
  galaxy, and the build fails if the two have drifted.
- **Give it an `alt`.** It is what a screen reader announces instead of the
  drawing — required by both components, the way it should be on an `<img>`.

> **This app depends on the two packages, and imports resolve to their
> sources**, through the `paths` in [`tsconfig.json`](tsconfig.json), which
> Next.js follows. A change to a library shows up at the next reload of
> `bun run docs`; there is no package to build first.

## Code blocks

[`CodeBlock`](src/components/code-block.tsx) is a Server Component around
[Shiki](https://shiki.style). It runs while the page is prerendered, so what
reaches the browser is coloured HTML and **no highlighter ships to the client**
— verified: no `.js` chunk in `.next/static` mentions Shiki, only a two-rule
stylesheet.

The two themes are emitted at once. Shiki writes the light colour inline on each
token and carries the dark one as a `--shiki-dark` custom property; the rule in
`globals.css` swaps them under `.dark`. So the code follows the theme toggle
with no JavaScript at all.

One highlighter is created for the whole build rather than one per page —
loading grammars is the expensive part — and it is restricted to the languages
declared in `LANGUAGES`. Add a language there before using it.

## shadcn/ui

Initialised with `--preset nova --base base`, so components are built on
[Base UI](https://base-ui.com) and icons come from `lucide`. To add one, name
the registry explicitly and point the CLI at this workspace:

```bash
npx shadcn@latest add button -c apps/docs
npx shadcn@latest search @shadcn -q "sidebar"
```

Four things are worth knowing before touching it.

- **The components are vendored, not installed.** `src/components/ui/` is
  ordinary source code you may edit. The CLI updates it with
  `shadcn add <name> --diff`, which compares your copy against upstream — so that
  directory is excluded from **both** `oxfmt` and `oxlint`. Formatting rewrites
  72% of its lines; linting fails on rules upstream does not hold itself to
  (`jsx-a11y/prefer-tag-over-role` in `breadcrumb`, `no-shadow` in `sidebar`).
  Everything that _uses_ those components is formatted and linted normally.
- **`noUnusedLocals` can trip a vendored component.** The repo's tsconfig is
  stricter than shadcn's code: `scroll-area` shipped an unused `React` import and
  failed the typecheck. It was unused here, so it was removed rather than
  patched. If it happens again to a component you actually need, the choice is
  to patch the file or to relax the flag — and patching costs you the clean
  `--diff`.
- **`shadcn` is a real dependency here**, not just a CLI. `globals.css` does
  `@import "shadcn/tailwind.css"`, which resolves to `dist/tailwind.css` inside
  the package. Removing it from `dependencies` breaks the build.
- **The theme is one command away.** `npx shadcn@latest apply <code> --only theme`
  swaps the palette without touching the components. Codes come from
  [ui.shadcn.com](https://ui.shadcn.com).

## What differs from a plain `create-next-app`

Six deliberate departures, so that the app looks like the rest of the repo
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
- **Named `@industrieh/docs`**, `private` — an app is deployed, never installed,
  so its version number carries no information.
- **No `typescript` of its own.** It uses the root's, like every other package,
  which takes one flag in [`next.config.ts`](next.config.ts) — the comment there
  explains why.
- **The shadcn components escape `oxfmt` and `oxlint`** — and only them. See the
  section above for why.
- **`AGENTS.md` and `CLAUDE.md`** come from
  [the Next.js guide for coding agents](https://nextjs.org/docs/app/guides/ai-agents).
  They point agents at `node_modules/next/dist/docs/`, the documentation bundled
  with the installed version of Next.js, rather than at their training data.
  Keep your own instructions outside the `nextjs-agent-rules` markers.

## Two copies of the documentation

Each package still carries its own Markdown — `README.md`, `CONTRIBUTING.md`
and `docs/` — and that is what a reader gets on GitHub and npm, and what
`/llms-full.txt` serves (relative links rewritten to GitHub URLs on the way
through). The pages of this site are **not** generated from it: they are TSX
under `src/content/`, written for the site, and they cover much of the same
ground.

| package                                                       | its own Markdown                           | its pages here                     |
| ------------------------------------------------------------- | ------------------------------------------ | ---------------------------------- |
| [`@industrieh/starmap`](../../packages/starmap)               | `README.md`, `CONTRIBUTING.md` and `docs/` | `src/content/starmap/*.tsx`        |
| [`@industrieh/starmap-render`](../../packages/starmap-render) | `README.md`, `CONTRIBUTING.md` and `docs/` | `src/content/starmap-render/*.tsx` |

So the two can disagree, and they have: a change to a guide usually wants the
same change on the matching page. What keeps them honest today is narrower than
a single source — the drawings and the output listings are generated, the
fixture checks itself — and the prose is kept in step by hand.

Still to settle is whether to go further:

- **Render the Markdown** — the site reads each package's `docs/` instead of
  its own TSX. One copy, but the structured components (`PropsTable`,
  `ApiEntry`, live drawings) would need an MDX layer to survive.
- **Generate the API reference from the sources** (TypeDoc or equivalent, over
  the public entries). The packages' JSDoc is already written for it —
  examples included, `{@link}` in place. Richer for the reference, but no
  replacement for the guides.
