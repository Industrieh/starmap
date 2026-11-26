/**
 * Drawing a galaxy map.
 *
 * Two things matter here and nowhere else: that the network is drawn from the
 * lanes rather than guessed, and that `highlight` lights the path it is given
 * and nothing more.
 */

import { createGalaxy, findRoute } from '@industrieh/starmap'
import { describe, expect, test } from 'vitest'

import {
  DEFAULT_THEME,
  GALAXY_LAYERS,
  galaxyScale,
  galaxyViewBox,
  renderGalaxy,
  renderGalaxyContent,
} from '../src/index'
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

const starsOf = (out: string): [number, number][] => {
  const layer = out.split('data-layer="backdrop"')[1]?.split('</g>')[0] ?? ''
  return [...layer.matchAll(/cx="([-\d.]+)" cy="([-\d.]+)"/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ])
}

describe('the backdrop', () => {
  /** Centres of the backdrop's stars. */

  test('covers the view of a galaxy far from the origin', () => {
    const far = createGalaxy({
      systems: [
        { id: 'a', name: 'A', x: 1000, y: 1000, star: { radius: 5 } },
        { id: 'b', name: 'B', x: 2000, y: 2000, star: { radius: 5 } },
      ],
    })
    const view = galaxyViewBox(far)
    const inside = starsOf(renderGalaxy(far)).filter(
      ([x, y]) => x >= view.x && x <= view.x + view.w && y >= view.y && y <= view.y + view.h,
    )
    // The square the stars are sown in is 1.1 times the view: most land inside.
    expect(inside.length).toBeGreaterThan(300)
  })

  test('is spread evenly, not piled up in one corner', () => {
    const offset = createGalaxy({
      systems: [
        { id: 'a', name: 'A', x: 0, y: 0, star: { radius: 5 } },
        { id: 'b', name: 'B', x: 1000, y: 1000, star: { radius: 5 } },
      ],
    })
    const view = galaxyViewBox(offset)
    const [cx, cy] = [view.x + view.w / 2, view.y + view.h / 2]
    const quadrants = [0, 0, 0, 0]
    for (const [x, y] of starsOf(renderGalaxy(offset)))
      quadrants[(x < cx ? 0 : 1) + (y < cy ? 0 : 2)]++
    for (const count of quadrants) expect(count).toBeGreaterThan(70)
  })

  test('covers a galaxy taller than it is wide', () => {
    const tall = createGalaxy({
      systems: [
        { id: 'a', name: 'A', x: 0, y: 0, star: { radius: 5 } },
        { id: 'b', name: 'B', x: 100, y: 2000, star: { radius: 5 } },
      ],
    })
    const view = galaxyViewBox(tall)
    const bottom = starsOf(renderGalaxy(tall)).filter(([, y]) => y > view.y + view.h * 0.75)
    expect(bottom.length).toBeGreaterThan(40)
  })
})

describe('hit-testing and layers', () => {
  test('a lane says what it is, like every system does', () => {
    expect(svg).toContain(`data-kind="lane" data-id="${galaxy.lanes[0].id}"`)
  })

  test('ids holding the key separator never light the wrong lane', () => {
    const tricky = createGalaxy({
      systems: ['a|b', 'c', 'a', 'b|c'].map((id, i) => ({
        id,
        name: id,
        x: i * 100,
        y: 0,
        star: { radius: 5 },
      })),
      lanes: [
        { id: 'one', from: 'a|b', to: 'c' },
        { id: 'two', from: 'a', to: 'b|c' },
      ],
    })
    const out = renderGalaxy(tricky, { highlight: ['a|b', 'c'] })
    expect(laneOf(out, 'one')).toContain(DEFAULT_THEME.highlight)
    expect(laneOf(out, 'two')).not.toContain(DEFAULT_THEME.highlight)
  })

  test('drawing the layers one by one gives back the whole drawing', () => {
    const options = { highlight: findRoute(galaxy, 'sol', 'kepler')?.systemIds }
    const pieces = GALAXY_LAYERS.map((layer) =>
      renderGalaxyContent(galaxy, { ...options, layers: [layer] }),
    )
    expect(pieces.filter((piece) => piece !== '').join('\n')).toBe(
      renderGalaxyContent(galaxy, options),
    )
  })

  test('layers are drawn in their usual order, whatever order they are listed in', () => {
    const out = renderGalaxyContent(galaxy, { layers: ['systems', 'lanes'] })
    expect(out.indexOf('data-layer="lanes"')).toBeLessThan(out.indexOf('data-layer="systems"'))
    expect(out).not.toContain('data-layer="backdrop"')
  })

  test('the exported scale is the one the drawing uses', () => {
    const { dot } = galaxyScale(galaxyViewBox(galaxy))
    expect(svg).toContain(`<circle r="${Number(dot.toFixed(2))}" fill="`)
  })

  test('the theme light reaches the system glow', () => {
    expect(renderGalaxy(galaxy, { theme: { light: '#fffbe0' } })).toContain('stop-color="#fffbe0"')
  })
})
