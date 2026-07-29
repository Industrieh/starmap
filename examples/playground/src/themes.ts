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
 *   `data-theme` attribute on `<html>`.
 *
 * They are set together by the toolbar, and they stay two things, because one
 * of them ends up inside an SVG string and the other does not.
 *
 * Anything left out of a `ThemeInput` comes from the renderer's `DEFAULT_THEME`,
 * table by table — so `light` below only lists what it actually changes.
 */

import type { ThemeInput } from '@cotontigeh/starmap-render'

export type ThemeName = 'dark' | 'light'

/** The renderer's own default is the dark one, so it needs no overrides. */
const dark: ThemeInput = {}

/**
 * A daylight version. The star glow and the planet shading are drawn with fixed
 * white and black gradients, so a light background flattens the star a little —
 * turning the backdrop off (the toolbar does) reads better.
 */
const light: ThemeInput = {
  background: '#f4f6fb',
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
