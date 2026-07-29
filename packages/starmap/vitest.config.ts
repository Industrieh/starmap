import { defineConfig, type ViteUserConfig } from 'vitest/config'

/**
 * Test setup for `@cotontigeh/starmap`.
 *
 * No DOM environment: the library is plain TypeScript, so Node is enough — and
 * running without a DOM is itself a guarantee that no test leans on a browser
 * global.
 *
 * Scope is this package, not the repo: the other workspaces run their own
 * suites, and nothing here reaches outside this folder.
 */
const config: ViteUserConfig = defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})

export default config
