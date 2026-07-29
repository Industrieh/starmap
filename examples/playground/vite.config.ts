import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type UserConfig } from 'vite'

/**
 * Vite 8 — Rolldown for bundling, Oxc for transforms. Nothing to configure for
 * either: `@vitejs/plugin-react` is the whole setup a React app needs.
 *
 * Tailwind v4 is the second plugin and the whole of its setup: there is no
 * `tailwind.config.js` any more, and no PostCSS chain to declare. Everything it
 * used to hold — tokens, breakpoints, custom variants — is CSS now, in
 * `src/styles.css`.
 *
 * The two aliases point at the **sources** of the workspace packages, the same
 * way `packages/starmap-render/vitest.config.ts` does. Without them Vite would
 * follow the workspace symlink to each package's `dist/`, so this example would
 * only run after a build, and an edit to a library would not show up until the
 * next one.
 *
 * An application outside this repo needs neither alias: it installs the
 * published packages and imports them by name.
 *
 * The port is pinned, and `strictPort` makes a busy port an error rather than a
 * silent move to the next one. Two things depend on the URL staying put: the
 * READMEs, and anything driving the page from outside — a browser agent, a
 * screenshot script, an end-to-end test.
 */
const config: UserConfig = defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@cotontigeh/starmap': fileURLToPath(
        new URL('../../packages/starmap/src/index.ts', import.meta.url),
      ),
      '@cotontigeh/starmap-render': fileURLToPath(
        new URL('../../packages/starmap-render/src/index.ts', import.meta.url),
      ),
    },
  },
})

export default config
