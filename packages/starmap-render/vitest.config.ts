import { fileURLToPath } from 'node:url'

import { defineConfig, type ViteUserConfig } from 'vitest/config'

/**
 * Test setup for `@industrieh/starmap-render`.
 *
 * The alias to the core's **sources** is the runtime counterpart of the `paths`
 * in `tsconfig.base.json`. Without it Vitest would resolve `@industrieh/starmap`
 * through the workspace symlink, so through its `dist/` — and the tests would
 * fail until the core has been built, or pass against a stale build.
 *
 * No DOM environment: this package writes strings. Running without one is itself
 * a guarantee that no test leans on a browser global.
 */
const config: ViteUserConfig = defineConfig({
  resolve: {
    alias: {
      '@industrieh/starmap': fileURLToPath(new URL('../starmap/src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})

export default config
