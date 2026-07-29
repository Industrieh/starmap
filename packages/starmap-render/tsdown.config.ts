import { defineConfig, type UserConfig } from 'tsdown'

/**
 * Build setup for `@cotontigeh/starmap-render`.
 *
 * `@cotontigeh/starmap` is a production dependency and stays **external**: an
 * application ends up with one copy of the core, shared with its own imports of
 * it. tsdown externalises `dependencies` by default — it is spelled out here
 * because the opposite would be a silent bug, two data models in one program,
 * with `instanceof` and identity comparisons quietly failing.
 *
 * For `dts` and the explicit type on `config`, see
 * `packages/starmap/tsdown.config.ts`.
 */
const config: UserConfig = defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  deps: {
    neverBundle: ['@cotontigeh/starmap'],
  },
})

export default config
