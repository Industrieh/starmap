/**
 * Drawing a system.
 *
 * The assertions are on what ends up in the string — an object's group, an id,
 * a colour — rather than on the exact markup. Pinning the markup down would
 * turn every visual improvement into a failing test.
 */

import { createGalaxy, indexSystems, systemPositions } from '@industrieh/starmap'
import { describe, expect, test } from 'vitest'

import {
  DEFAULT_THEME,
  escapeXml,
  num,
  renderSystem,
  renderSystemContent,
  resolveTheme,
  SYSTEM_LAYERS,
} from '../src/index'
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

describe('ids of the gradients', () => {
  test('by default they are built from the system id, so two systems never share them', () => {
    expect(renderSystem(sol)).toContain('url(#starmap-sol-glow)')
    expect(renderSystem(galaxy.systems[1])).toContain('url(#starmap-vega-glow)')
  })

  test('a prefix an XML id cannot hold is made safe, definition and reference alike', () => {
    const odd = createGalaxy({
      systems: [{ id: 'alpha centauri', name: 'Alpha Centauri', x: 0, y: 0, star: { radius: 9 } }],
    }).systems[0]
    const out = renderSystem(odd, { idPrefix: 'alpha centauri' })
    expect(out).toContain('id="alpha_centauri-glow"')
    expect(out).toContain('url(#alpha_centauri-glow)')
    expect(renderSystem(odd)).toContain('url(#starmap-alpha_centauri-glow)')
    expect(renderSystem(odd, { idPrefix: '42' })).toContain('url(#_42-glow)')
  })
})

const dashOf = (pattern: string): string | undefined => {
  const out = renderSystem(sol, {
    backdrop: 0,
    theme: { routes: { orbital: { stroke: '#fff', dash: pattern, width: 1 } } },
  })
  const route = out.slice(out.indexOf('data-kind="route"'))
  return route.slice(0, route.indexOf('/>')).match(/stroke-dasharray="([^"]*)"/)?.[1]
}

describe('route dash patterns', () => {
  /** The `stroke-dasharray` of the one route of Sol, with a given orbital dash. */

  test('commas and stray spaces mean the same pattern, as in SVG', () => {
    const expected = dashOf('6 8')
    expect(expected).toMatch(/^[\d.]+ [\d.]+$/)
    for (const pattern of ['6,8', '6, 8', ' 6 8 ', '6 , 8']) expect(dashOf(pattern)).toBe(expected)
  })

  test('an empty pattern, none, or garbage draws a solid line', () => {
    for (const pattern of ['', 'none', 'dotted']) expect(dashOf(pattern)).toBeUndefined()
  })

  test('a route says what it is', () => {
    // The derived id is `earth>sol-gate0`, escaped like any attribute.
    expect(svg).toContain(`data-kind="route" data-id="${escapeXml(sol.localRoutes[0].id)}"`)
  })
})

describe('layers', () => {
  test('drawing the layers one by one gives back the whole drawing', () => {
    const options = { t: 7, systems: indexSystems(galaxy) }
    const pieces = SYSTEM_LAYERS.map((layer) =>
      renderSystemContent(sol, { ...options, layers: [layer] }),
    )
    expect(pieces.filter((piece) => piece !== '').join('\n')).toBe(
      renderSystemContent(sol, options),
    )
  })

  test('only routes and planets move with time', () => {
    const still = SYSTEM_LAYERS.filter((layer) => layer !== 'routes' && layer !== 'planets')
    expect(renderSystemContent(sol, { t: 0, layers: still })).toBe(
      renderSystemContent(sol, { t: 99, layers: still }),
    )
    expect(renderSystemContent(sol, { t: 0, layers: ['planets'] })).not.toBe(
      renderSystemContent(sol, { t: 99, layers: ['planets'] }),
    )
  })

  test('nothing listed, nothing drawn', () => {
    expect(renderSystemContent(sol, { layers: [] })).toBe('')
  })
})

const ringOf = (out: string) => out.includes('<ellipse')

describe('theme hooks', () => {
  test('the types that get a ring come from the theme', () => {
    expect(ringOf(svg)).toBe(true)
    expect(ringOf(renderSystem(sol, { theme: { ringed: [] } }))).toBe(false)
    const custom = createGalaxy({
      systems: [
        {
          id: 's',
          name: 'S',
          x: 0,
          y: 0,
          star: { radius: 9 },
          planets: [{ name: 'P', type: 'gas-giant', orbit: 80, radius: 9, moons: 4 }],
        },
      ],
    }).systems[0]
    expect(ringOf(renderSystem(custom))).toBe(false)
    expect(ringOf(renderSystem(custom, { theme: { ringed: ['gas-giant'] } }))).toBe(true)
  })

  test('light and shade reach the gradients', () => {
    const out = renderSystem(sol, { theme: { light: '#fffbe0', shade: '#101020' } })
    expect(out).toContain('stop-color="#fffbe0"')
    expect(out).toContain('stop-color="#101020"')
    expect(out).not.toContain('#000000')
  })

  test('a resolved theme gives the same drawing as its input', () => {
    const input = { background: '#000', planets: { terran: '#7ee787' } }
    expect(renderSystem(sol, { theme: resolveTheme(input) })).toBe(
      renderSystem(sol, { theme: input }),
    )
  })

  test('a type named after an Object.prototype member falls back like any unknown type', () => {
    const odd = createGalaxy({
      systems: [
        {
          id: 's',
          name: 'S',
          x: 0,
          y: 0,
          star: { radius: 9 },
          planets: [{ name: 'P', type: 'constructor', orbit: 80, radius: 9 }],
        },
      ],
    }).systems[0]
    const out = renderSystem(odd)
    expect(out).not.toContain('function')
    expect(out).toContain(`fill="${DEFAULT_THEME.planets.default}"`)
  })
})

describe('the role of the root element', () => {
  test('img with a title, nothing without, and false or a string when asked', () => {
    expect(rootTag(renderSystem(sol, { title: 'Sol' }))).toContain('role="img"')
    expect(rootTag(renderSystem(sol))).not.toContain('role=')
    expect(rootTag(renderSystem(sol, { title: 'Sol', role: false }))).not.toContain('role=')
    expect(rootTag(renderSystem(sol, { role: 'group' }))).toContain('role="group"')
  })
})
