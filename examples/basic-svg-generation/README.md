# @industrieh/example-basic-svg-generation

Runnable example: describe a universe, draw it as SVG files.

```bash
bun run example:svg       # from the root of the monorepo
bun run start                # from this folder
open out/system.svg
```

`private: true` — this package never goes to npm. It exists so the docs are
_checkable_: if it stops compiling or running, the API moved and the docs did
not follow. `bun run typecheck` at the root covers it.

It writes four files to `out/`:

| file             | what it shows                                               |
| ---------------- | ----------------------------------------------------------- |
| `system.svg`     | one system at `t = 0`, with gate labels naming their target |
| `system-t12.svg` | the same system half an Earth-year later                    |
| `galaxy.svg`     | the network, with the route Sol → Kepler highlighted        |
| `thumbnail.svg`  | 96 px, light theme, no labels, no backdrop                  |

[`src/index.ts`](src/index.ts) reads top to bottom in five commented steps:

1. **describe** three systems, leaving out everything derivable;
2. **draw a system** with `renderSystem()`, at a moment you choose;
3. **draw it again later** — `t` is the only difference, and the planets have
   moved;
4. **draw the galaxy** with `renderGalaxy()`, highlighting a route found by
   `findRoute()`;
5. **draw a thumbnail** — the same call with a theme and a few options off.

Everything the renderer returns is a string. Writing it to disk is four lines at
the end of the file, and it is the only part that touches anything outside the
program.
