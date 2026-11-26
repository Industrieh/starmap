/**
 * The two looks of the app — **step 2 of the tour**.
 *
 * There are two separate things called a theme here, and keeping them apart is
 * the point:
 *
 * - the **drawing** theme, below, is passed to `renderSystem()` and
 *   `renderGalaxy()`. The core model carries no colour at all, so this is where
 *   `planet.type → appearance` is decided;
 * - the **interface** theme is plain CSS, in `styles.css`, switched by a
 *   `data-theme` attribute on the app's `<main>` element (`App.tsx`).
 *
 * They are set together by the toolbar, and they stay two things, because one
 * of them ends up inside an SVG string and the other does not.
 *
 * Anything left out of a `ThemeInput` comes from the renderer's `DEFAULT_THEME`,
 * table by table — so `light` below only lists what it actually changes.
 */

import type { ThemeInput } from '@industrieh/starmap-render'

export type ThemeName = 'dark' | 'light'

/** The renderer's own default is the dark one, so it needs no overrides. */
const dark: ThemeInput = {}

/**
 * A daylight version.
 *
 * `light` and `shade` are the two ends of the drawing's lighting: the core of a
 * star and the lit side of a planet, and a planet's dark side. The defaults are
 * pure white and pure black, made for a dark sky. On a pale one a white core
 * melts into the background and black shading reads as soot, so here the light
 * is a warm cream and the shade is the interface's own ink.
 */
const light: ThemeInput = {
  background: '#f4f6fb',
  light: '#fff1c9',
  shade: '#16203a',
  backdropStar: '#b9c2d6',
  label: '#16203a',
  orbit: '#c3ccdf',
  gateOrbit: '#cbc0e6',
  lane: '#9aa8c4',
  highlight: '#6d4bd8',
  gate: '#6d4bd8',
  field: '#d6c69b',
  rock: '#b09a6f',
  habitable: '#1f9d6b',
}

export const THEMES: Record<ThemeName, ThemeInput> = { dark, light }
