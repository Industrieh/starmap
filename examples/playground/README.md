# @industrieh/example-playground

The full app. Generate a galaxy from a seed, fly through it, look inside the
systems. It is also the place to hack on the libraries: `bun run dev` and the
whole thing reloads on save, sources and all.

```bash
bun run dev                  # from the root of the monorepo
bun run dev                  # from this folder — same thing
```

Then open http://localhost:5173. The port is pinned with `strictPort`, so it
never moves to the next free one — `examples/interactive-react` explains why
that matters when [Claude drives Chrome](../interactive-react/README.md#look-at-it-in-chrome).

## What you can do

| in the app                      | what happens                                               |
| ------------------------------- | ---------------------------------------------------------- |
| type a seed, press **Generate** | a whole new galaxy — the same seed always rebuilds it      |
| **Surprise me**                 | a random seed                                              |
| move the pointer over a system  | the route from your ship to it lights up                   |
| click anything                  | the inspector shows what it is                             |
| double-click a system           | you fly there and go inside                                |
| double-click a gate             | you take it to the system it leads to                      |
| **← galaxy**, or `esc`          | back to the map                                            |
| **⏸ ×1 ×4 ×16**, or `space`     | simulation speed                                           |
| **☾ / ☀**                       | swaps both themes at once — the interface, and the drawing |
| **✦ stars**                     | the decorative backdrop, off for a cleaner look            |

The white ring on the map is your ship. Everything else — the dots, the lanes,
the names, the colours — is drawn by `@industrieh/starmap-render`.

## Read it as a tutorial

The files are numbered in their header comments. Read them in this order and
you will have seen the whole loop, from a seed to a clickable map.

| step | file                       | what it teaches                                                           |
| ---- | -------------------------- | ------------------------------------------------------------------------- |
| 1    | `src/universe/generate.ts` | writing a **seeded generator** — the part the library does not do for you |
| 2    | `src/themes.ts`            | where colours live, and why there are two kinds of theme                  |
| 3    | `src/views/SvgStage.tsx`   | making a **string** clickable, with one listener                          |
| 4    | `src/views/GalaxyView.tsx` | drawing the map, and **adding your own layer** to it                      |
| 5    | `src/views/SystemView.tsx` | drawing a system at time `t`                                              |
| 6    | `src/views/Details.tsx`    | turning an id back into an object, fully typed                            |
| 7    | `src/Explorer.tsx`         | navigation state: where the ship is, what is selected                     |

`src/App.tsx` is the shell around all of it — the seed, the theme, and one
`key` that throws the navigation state away when the galaxy changes.

## The three pieces, and who does what

```
      you                          @industrieh/starmap        @industrieh/starmap-render
 ─────────────────            ──────────────────────────    ──────────────────────────────
 seed, tables, rules   ──►    createGalaxy()  validates
 how many planets             indexGalaxy()   looks up
 what a faction is            findRoute()     routes        ──►  renderGalaxy()  → string
 clicks, the clock            systemPositions() moves            renderSystem()  → string
 colours, layout                                                 (theme in, SVG out)
```

The core knows nothing about pixels. The renderer knows nothing about the DOM.
Everything that is a _decision_ — how a galaxy is shaped, what a colour means,
what a click does, how fast time runs — is in this folder.

## Things to try

- Open `src/universe/generate.ts` and change `MIN_DISTANCE`, or the weights in
  `STAR_CLASSES`, or the planet tables. Save, and look.
- Add a field to the generated systems (`resources`, more stations) and show it
  in `src/views/Details.tsx`.
- Change a colour in `src/themes.ts` — one key is enough, the rest of the table
  stays.
- Draw your own layer: `GalaxyView.tsx` already adds one (the ship marker) with
  `el()` and `group()`, in world coordinates.
- Break the generator on purpose — give a planet `orbit: -5`. `createGalaxy()`
  throws a `GalaxyValidationError` listing every problem with its path.

## Notes

**`vite.config.ts` aliases both libraries to their sources.** That is what makes
this a development environment and not just a demo: edit
`packages/starmap-render/src/...`, save, and the page updates. An app outside
this repo needs no alias — it installs the published packages.

**The galaxy is never mutated.** It is frozen terrain: `createGalaxy()` returns
it, and everything about a session — where the ship is, what is selected — lives
in React state, keyed by the same ids. That is the pattern to keep in a real
game, where the save file is your state and the galaxy is rebuilt from its seed.

**The system view rebuilds its whole SVG string every frame.** Simple, and fine
for a few dozen objects. For a bigger map, draw the layers once with
`renderSystemContent()` and move the objects with `systemPositions()` — the
recipe is in
[`packages/starmap-render/docs/recipes.md`](../../packages/starmap-render/docs/recipes.md).

## Smaller examples

- [`examples/basic`](../basic) — the core alone, in a terminal
- [`examples/basic-svg-generation`](../basic-svg-generation) — SVG files, no browser
- [`examples/interactive-react`](../interactive-react) — the same idea as this
  one, in a hundred lines, if this app is too much to read at once
