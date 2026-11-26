# @industrieh/example-playground

The full app. Generate a galaxy from a seed, fly through it, look inside the
systems. It is also the place to hack on the libraries: `bun run dev` and the
whole thing reloads on save, sources and all.

```bash
bun run dev                  # from the root of the monorepo
bun run dev                  # from this folder — same thing
```

Then open http://localhost:5173. The port is pinned with `strictPort`, so it
never moves to the next free one: the READMEs, a browser agent or an end-to-end
script can rely on the URL staying put.

## What you can do

| in the app                      | what happens                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| type a seed, press **Generate** | a whole new galaxy — the same seed always rebuilds it                                       |
| **systems**                     | how many, from 2 to 60 — anything else is brought back in                                   |
| **Surprise me**                 | a random seed                                                                               |
| move the pointer over a system  | the route from your ship to it lights up                                                    |
| click anything                  | the inspector shows what it is                                                              |
| double-click a system           | you fly there and go inside                                                                 |
| double-click a gate             | you take it to the system it leads to                                                       |
| **← galaxy**, or `esc`          | back to the map                                                                             |
| **⏸ ×1 ×4 ×16**, or `space`     | simulation speed                                                                            |
| **☾ / ☀**                       | swaps both themes at once — the interface, and the drawing                                  |
| **✦ stars**                     | the decorative backdrop, off for a cleaner look                                             |
| `tab` into the side panel       | the same moves without a mouse: pick a destination and fly, inspect any object, take a gate |

The ring around one system on the map is your ship, drawn in the theme's label
colour. Everything else — the dots, the lanes, the names, the colours — is drawn
by `@industrieh/starmap-render`.

## Read it as a tutorial

The files are numbered in their header comments. Read them in this order and
you will have seen the whole loop, from a seed to a clickable map.

| step | file                       | what it teaches                                                           |
| ---- | -------------------------- | ------------------------------------------------------------------------- |
| 1    | `src/universe/generate.ts` | writing a **seeded generator** — the part the library does not do for you |
| 2    | `src/themes.ts`            | where colours live, and why there are two kinds of theme                  |
| 3    | `src/views/SvgStage.tsx`   | making a **string** clickable, with one listener                          |
| 4    | `src/views/GalaxyView.tsx` | drawing the map, and **adding your own layer** to it                      |
| 5    | `src/views/SystemView.tsx` | drawing a system at time `t`, redrawing only what moves                   |
| 6    | `src/views/Details.tsx`    | turning an id back into an object, fully typed                            |
| 7    | `src/Explorer.tsx`         | navigation state: where the ship is, what is selected                     |

`src/App.tsx` is the shell around all of it — the seed, the theme, an error
boundary, and one `key` that throws the navigation state away when the galaxy
changes. Two supporting files are worth a look once the tour is done:
`src/hooks/clock.tsx`, which gets the time to the system drawing without
re-rendering the rest of the app sixty times a second, and
`src/views/Navigator.tsx`, which offers every pointer gesture as a button.

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

- Open `src/universe/generate.ts` and change `SPREAD` (how roomy the galaxy
  is), or the weights in `STAR_CLASSES`, or the planet tables. Save, and look.
  `MIN_DISTANCE` is the galaxy's unit of length: changing it rescales
  everything, so the map looks the same and only the distances move.
- Add a field to the generated systems (`resources`, more stations) and show it
  in `src/views/Details.tsx`.
- Change a colour in `src/themes.ts` — one key is enough, the rest of the table
  stays.
- Draw your own layer: `GalaxyView.tsx` already adds one (the ship marker) with
  `el()` and `group()`, in world coordinates.
- Break the generator on purpose — give a planet `orbit: -5`. `createGalaxy()`
  throws a `GalaxyValidationError` listing every problem with its path, and the
  app shows that list in place of the map.

## Notes

**`vite.config.ts` aliases both libraries to their sources.** That is what makes
this a development environment and not just a demo: edit
`packages/starmap-render/src/...`, save, and the page updates. An app outside
this repo needs no alias — it installs the published packages.

**The galaxy is never mutated.** It is frozen terrain: `createGalaxy()` returns
it, and everything about a session — where the ship is, what is selected — lives
in React state, keyed by the same ids. That is the pattern to keep in a real
game, where the save file is your state and the galaxy is rebuilt from its seed.

**The system view redraws only what moves.** It asks the renderer for layers
(`renderSystemContent()` with `layers`) and puts them in an `<svg>` of its own.
The seven that never change — the gradients, the background, the backdrop, the
orbits, the fields, the star and the gates — are drawn once per system and
theme; only `routes` and `planets` are drawn every frame. That is about 17
elements and 1 KB a frame instead of the whole drawing's 320 elements and 19 KB,
four fifths of which is the decorative backdrop. And only that view pays even
this: the clock lives in `src/hooks/clock.tsx`, so the map and the inspector do
not re-render with time.

**Routes read an index, not the galaxy.** `indexNetwork(galaxy)` is built once
per galaxy, and every `findRoute()` and the connectivity check take it instead
of the galaxy — so hovering a system costs one search, not a rebuild of the
graph.

## Smaller examples

- [`examples/basic`](../basic) — the core alone, in a terminal
- [`examples/basic-svg-generation`](../basic-svg-generation) — SVG files, no browser
