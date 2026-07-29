import { defineConfig, type UserConfig } from 'tsdown'

/**
 * Build setup for `@cotontigeh/starmap`.
 *
 * One entry, no external dependencies, no assets: the published package is an
 * ESM module plus its type declarations. Nothing to mark as external, because
 * the library imports nothing.
 *
 * This is the root package of the repo — it depends on no other workspace, so
 * `bun run --filter '*' build` always builds it first.
 *
 * `dts: true` is enough. `isolatedDeclarations` is on in `tsconfig.base.json`,
 * so tsdown picks the `oxc` declaration generator, which works in memory. See
 * the comment in `tsconfig.base.json` for what that avoids.
 *
 * The explicit type on `config` is what `isolatedDeclarations` requires: a
 * default export cannot be inferred.
 */
const config: UserConfig = defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
})

export default config
