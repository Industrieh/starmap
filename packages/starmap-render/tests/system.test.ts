/**
 * Drawing a system.
 *
 * The assertions are on what ends up in the string — an object's group, an id,
 * a colour — rather than on the exact markup. Pinning the markup down would
 * turn every visual improvement into a failing test.
 */

import { createGalaxy, indexSystems, systemPositions } from '@cotontigeh/starmap'
import { describe, expect, test } from 'vitest'

import { DEFAULT_THEME, num, renderSystem, renderSystemContent } from '../src/index'
import { galaxy, kepler, sol } from './fixture'
import { xmlProblems } from './xml'

const svg = renderSystem(sol)

/** The opening `<svg …>` tag on its own. */
const rootTag = (out: string): string => out.slice(0, out.indexOf('>'))

describe('the document', () => {
  test('is well-formed XML', () => {
    expect(xmlProblems(svg)).toEqual([])
  })

  test('is a standalone SVG, framed on the system', () => {
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg).toContain('viewBox="-435 -435 870 870"')
    expect(svg.endsWith('</svg>')).toBe(true)
  })

  test('takes pixel dimensions only when asked', () => {
    expect(rootTag(svg)).not.toContain('width=')
    expect(rootTag(renderSystem(sol, { width: 512, height: 512 }))).toContain(
      'width="512" height="512"',
    )
  })

  test('a title makes it announceable', () => {
    const titled = renderSystem(sol, { title: 'The Sol system' })
    expect(titled).toContain('role="img"')
    expect(titled).toContain('<title>The Sol system</title>')
  })

  test('the content alone carries no svg element', () => {
    expect(renderSystemContent(sol)).not.toContain('<svg')
  })
})

describe('what gets drawn', () => {
  test('every object is a group carrying its kind and its id', () => {
    for (const [kind, id] of [
      ['star', 'sol-star'],
      ['planet', 'earth'],
      ['station', 'earth-st0'],
      ['gate', 'sol-gate0'],
      ['field', 'sol-ast0'],
    ] as const) {
      expect(svg).toContain(`data-kind="${kind}" data-id="${id}"`)
    }
  })

  test('one group per planet, and the layers are named', () => {
    expect(svg.match(/data-kind="planet"/g)).toHaveLength(3)
    for (const layer of ['backdrop', 'orbits', 'fields', 'routes', 'planets', 'gates']) {
      expect(svg).toContain(`data-layer="${layer}"`)
    }
  })

  test('planets are coloured by type, through the theme', () => {
    expect(svg).toContain(DEFAULT_THEME.planets.terran)
    expect(svg).toContain(DEFAULT_THEME.stars.G)
  })

  test('a planet with no type falls back rather than going missing', () => {
    const plain = renderSystem(galaxy.systems[1])
    expect(plain).toContain(DEFAULT_THEME.planets.default)
    expect(plain).toContain('data-kind="planet"')
  })

  test('a gas giant with moons gets a ring, an inner planet does not', () => {
    expect(svg).toContain('<ellipse')
    expect(svg.match(/<ellipse/g)).toHaveLength(1)
  })

  test('a habitable planet gets its ring', () => {
    expect(svg).toContain(DEFAULT_THEME.habitable)
  })

  test('an unstable gate gets its warning ring', () => {
    expect(svg).toContain(DEFAULT_THEME.gateUnstable)
  })

  test('a belt is an arc, a cluster is a circle', () => {
    expect(svg).toContain('<path d="M ')
    expect(svg).toContain(DEFAULT_THEME.rock)
  })

  test('a system with nothing but a star draws no empty layers', () => {
    const bare = renderSystem(kepler)
    expect(bare).toContain('data-kind="star"')
    expect(bare).not.toContain('data-layer="planets"')
    expect(bare).not.toContain('data-layer="gates"')
    expect(xmlProblems(bare)).toEqual([])
  })
})

describe('positions', () => {
  test('objects sit where the core says they sit', () => {
    const earth = systemPositions(sol, 0).get('earth')
    expect(earth).toBeDefined()
    expect(svg).toContain(`transform="translate(${num(earth!.x)} ${num(earth!.y)})"`)
  })

  test('time moves the planets', () => {
    // Earth's period is 24s, so at t = 12 it is on the other side of its star.
    expect(renderSystemContent(sol, { t: 12 })).not.toBe(renderSystemContent(sol, { t: 0 }))
  })

  test('the same t twice gives the very same string', () => {
    expect(renderSystemContent(sol, { t: 7.5 })).toBe(renderSystemContent(sol, { t: 7.5 }))
  })
})

describe('labels', () => {
  test('names are drawn, and escaped', () => {
    expect(svg).toContain('>Earth</text>')
    expect(renderSystem(kepler, { title: kepler.name })).toContain(
      '<title>Kepler &lt;&amp;&gt;</title>',
    )
  })

  test('a gate says where it leads when the systems are known', () => {
    expect(svg).toContain('>Sol Gate</text>')
    expect(renderSystem(sol, { systems: indexSystems(galaxy) })).toContain('Sol Gate → Vega')
  })

  test('labels can be turned off entirely', () => {
    expect(renderSystem(sol, { labels: false })).not.toContain('<text')
  })
})

describe('options', () => {
  test('the theme reaches the drawing', () => {
    expect(renderSystem(sol, { theme: { background: '#123456' } })).toContain('#123456')
  })

  test('the id prefix keeps two drawings on one page apart', () => {
    const first = renderSystem(sol, { idPrefix: 'a' })
    const second = renderSystem(galaxy.systems[1], { idPrefix: 'b' })
    expect(first).toContain('id="a-shade"')
    expect(first).toContain('url(#a-core)')
    expect(second).not.toContain('"a-')
  })

  test('the backdrop can be dropped', () => {
    expect(renderSystem(sol, { backdrop: 0 })).not.toContain('data-layer="backdrop"')
  })

  test('the margin widens the frame', () => {
    expect(renderSystem(sol, { margin: 0 })).toContain('viewBox="-300 -300 600 600"')
  })
})

describe('degenerate input', () => {
  test('a system whose contents reach nowhere still renders', () => {
    const empty = createGalaxy({
      systems: [{ id: 'a', name: 'A', x: 0, y: 0, star: { radius: 4 }, outerLimit: 0 }],
    })
    const out = renderSystem(empty.systems[0])
    expect(xmlProblems(out)).toEqual([])
    expect(out).toContain('data-kind="star"')
  })
})
