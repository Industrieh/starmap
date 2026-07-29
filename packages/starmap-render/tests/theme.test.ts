/**
 * Theme resolution.
 *
 * The point of `resolveTheme()` is that overriding one colour keeps the other
 * twenty. These tests pin that down, in both directions.
 */

import { describe, expect, test } from 'vitest'

import { DEFAULT_THEME, pickColor, pickRouteStyle, resolveTheme } from '../src/index'

describe('resolveTheme', () => {
  test('returns the default theme when given nothing', () => {
    expect(resolveTheme()).toEqual(DEFAULT_THEME)
  })

  test('overrides a single colour', () => {
    const theme = resolveTheme({ background: '#000' })
    expect(theme.background).toBe('#000')
    expect(theme.label).toBe(DEFAULT_THEME.label)
  })

  test('merges a table key by key instead of replacing it', () => {
    const theme = resolveTheme({ planets: { terran: '#7ee787' } })
    expect(theme.planets.terran).toBe('#7ee787')
    expect(theme.planets.gas).toBe(DEFAULT_THEME.planets.gas)
    expect(theme.planets.default).toBe(DEFAULT_THEME.planets.default)
  })

  test('accepts a key the core does not know about', () => {
    const theme = resolveTheme({ planets: { shattered: '#7d7d8b' } })
    expect(pickColor(theme.planets, 'shattered')).toBe('#7d7d8b')
  })

  test('an explicit undefined does not punch a hole in the theme', () => {
    expect(resolveTheme({ background: undefined }).background).toBe(DEFAULT_THEME.background)
  })

  test('does not mutate the default theme', () => {
    resolveTheme({ planets: { terran: '#000' } })
    expect(DEFAULT_THEME.planets.terran).toBe('#4fae6a')
  })
})

describe('pickColor', () => {
  test('falls back for an unknown key', () => {
    expect(pickColor(DEFAULT_THEME.stars, 'Z')).toBe(DEFAULT_THEME.stars.default)
  })

  test('falls back for a missing key — an optional field left out', () => {
    expect(pickColor(DEFAULT_THEME.planets, undefined)).toBe(DEFAULT_THEME.planets.default)
  })

  test('returns the listed colour otherwise', () => {
    expect(pickColor(DEFAULT_THEME.stars, 'G')).toBe('#ffe9a8')
  })
})

describe('pickRouteStyle', () => {
  test('returns a whole style, never a half-merged one', () => {
    expect(pickRouteStyle(DEFAULT_THEME.routes, 'mining')).toEqual({
      stroke: '#c9a227',
      dash: '4 6',
      width: 0.9,
    })
  })

  test('falls back for an unknown type', () => {
    expect(pickRouteStyle(DEFAULT_THEME.routes, 'tow-line')).toEqual(DEFAULT_THEME.routes.default)
  })
})
