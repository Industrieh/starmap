# @cotontigeh/example-basic

Runnable example: describe a universe by hand, build it, check it, query it,
animate it.

```bash
bun run example              # from the root of the monorepo
bun run start                # from this folder
```

`private: true` — this package never goes to npm. It exists so the docs are
_checkable_: if it stops compiling or running, the API moved and the docs did
not follow. `bun run typecheck` at the root covers it.

[`src/index.ts`](src/index.ts) follows the path a consumer takes, in six
commented steps:

1. **describe** a universe, leaving out everything derivable;
2. **build** it with `createGalaxy()`, catching a `GalaxyValidationError` to
   read every problem at once;
3. **check** what the library does not — that the network holds together;
4. **query**: the index, a route, the stations of a system;
5. **animate**: positions at three moments, and a station following its planet;
6. **keep game state alongside**, without mutating the galaxy.
