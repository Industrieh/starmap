/**
 * Drawing a galaxy map.
 *
 * Two things matter here and nowhere else: that the network is drawn from the
 * lanes rather than guessed, and that `highlight` lights the path it is given
 * and nothing more.
 */

import { createGalaxy, findRoute } from '@industrieh/starmap'
import { describe, expect, test } from 'vitest'

import { DEFAULT_THEME, renderGalaxy, renderGalaxyContent } from '../src/index'
import { galaxy } from './fixture'
import { xmlProblems } from './xml'

const svg = renderGalaxy(galaxy)

/** The markup of one lane, so an assertion cannot match another element. */
function laneOf(svgText: string, id: string): string {
  const start = svgText.indexOf(`data-id="${id}"`)
  return svgText.slice(start, svgText.indexOf('/>', start))
}

describe('the document', () => {
  test('is well-formed XML', () => {
    expect(xmlProblems(svg)).toEqual([])
  })

  test('is framed on the systems, with room around them', () => {
    // The systems span 650 × 600, so the 0.12 margin adds 78 on every side.
    expect(svg).toContain('viewBox="-328 -78 806 756"')
  })

  test('the content alone carries no svg element', () => {
    expect(renderGalaxyContent(galaxy)).not.toContain('<svg')
  })
})

describe('what gets drawn', () => {
  test('one group per system, one line per lane', () => {
    expect(svg.match(/data-kind="system"/g)).toHaveLength(3)
    expect(svg.match(/<line/g)).toHaveLength(2)
  })

  test('systems carry their id, lanes carry theirs', () => {
    expect(svg).toContain('data-kind="system" data-id="sol"')
    expect(svg).toContain('data-id="lane-sol-vega"')
  })

  test('a system is coloured by its star, ringed by its faction', () => {
    expect(svg).toContain(DEFAULT_THEME.stars.G)
    expect(svg).toContain(DEFAULT_THEME.factions.consortium)
  })

  test('a system with no faction falls back rather than going missing', () => {
    expect(svg).toContain(DEFAULT_THEME.factions.default)
  })

  test('names are drawn, and escaped', () => {
    expect(svg).toContain('>Sol</text>')
    expect(svg).toContain('>Kepler &lt;&amp;&gt;</text>')
  })

  test('labels can be turned off entirely', () => {
    expect(renderGalaxy(galaxy, { labels: false })).not.toContain('<text')
  })
})

describe('highlight', () => {
  const route = findRoute(galaxy, 'sol', 'kepler')
  const lit = renderGalaxy(galaxy, { highlight: route?.systemIds })

  test('a route lights every lane along it', () => {
    expect(route?.systemIds).toEqual(['sol', 'vega', 'kepler'])
    expect(lit.match(new RegExp(DEFAULT_THEME.highlight, 'g'))?.length).toBeGreaterThanOrEqual(5)
  })

  test('without it, nothing is lit', () => {
    expect(svg).not.toContain(`stroke="${DEFAULT_THEME.highlight}"`)
  })

  test('two systems that are not neighbours light no lane', () => {
    const stray = renderGalaxy(galaxy, { highlight: ['sol', 'kepler'] })
    const lanes = stray.slice(
      stray.indexOf('data-layer="lanes"'),
      stray.indexOf('data-layer="systems"'),
    )
    expect(lanes).not.toContain(DEFAULT_THEME.highlight)
  })

  test('the order of a lane does not matter', () => {
    const forwards = renderGalaxy(galaxy, { highlight: ['sol', 'vega'] })
    const backwards = renderGalaxy(galaxy, { highlight: ['vega', 'sol'] })
    expect(laneOf(forwards, 'lane-sol-vega')).toContain(DEFAULT_THEME.highlight)
    expect(laneOf(backwards, 'lane-sol-vega')).toContain(DEFAULT_THEME.highlight)
  })
})

describe('degenerate input', () => {
  test('an empty galaxy renders an empty sky, not a crash', () => {
    const out = renderGalaxy(createGalaxy({ systems: [] }))
    expect(xmlProblems(out)).toEqual([])
    expect(out).not.toContain('data-kind="system"')
  })

  test('a galaxy with no lanes draws no lane layer', () => {
    const alone = createGalaxy({
      systems: [{ id: 'a', name: 'A', x: 0, y: 0, star: { radius: 5 } }],
    })
    expect(renderGalaxy(alone)).not.toContain('data-layer="lanes"')
  })
})
