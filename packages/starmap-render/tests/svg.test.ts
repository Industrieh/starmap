/**
 * The string primitives.
 *
 * Everything the package writes goes through these four functions, so a mistake
 * here is a mistake in every drawing. They are tested on their own for that
 * reason.
 */

import { describe, expect, test } from 'vitest'

import { idPrefixOf } from '../src/core/svg'
import { el, escapeXml, group, num, text } from '../src/index'

describe('escapeXml', () => {
  test('escapes the five XML characters', () => {
    expect(escapeXml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&apos;')
  })

  test('escapes the ampersand first, so entities are not double-escaped', () => {
    expect(escapeXml('&lt;')).toBe('&amp;lt;')
  })

  test('leaves ordinary text alone', () => {
    expect(escapeXml('Alpha Centauri')).toBe('Alpha Centauri')
  })
})

describe('num', () => {
  test('rounds to two decimals', () => {
    expect(num(130.00000000000003)).toBe('130')
    expect(num(1 / 3)).toBe('0.33')
  })

  test('turns a non-finite value into 0 rather than "NaN"', () => {
    expect(num(Number.NaN)).toBe('0')
    expect(num(Number.POSITIVE_INFINITY)).toBe('0')
  })
})

describe('el', () => {
  test('self-closes when there are no children', () => {
    expect(el('circle', { r: 4 })).toBe('<circle r="4"/>')
  })

  test('wraps children when there are some', () => {
    expect(el('g', { class: 'x' }, '<circle/>')).toBe('<g class="x"><circle/></g>')
  })

  test('drops undefined and false attributes, keeps 0', () => {
    expect(el('rect', { x: 0, y: undefined, hidden: false, fill: '#fff' })).toBe(
      '<rect x="0" fill="#fff"/>',
    )
  })

  test('formats numeric attributes and escapes string ones', () => {
    expect(el('text', { x: 0.30000000000000004, 'data-id': 'a"b' })).toBe(
      '<text x="0.3" data-id="a&quot;b"/>',
    )
  })
})

describe('group', () => {
  test('joins parts one per line', () => {
    expect(group({ id: 'g' }, ['<a/>', '<b/>'])).toBe('<g id="g"><a/>\n<b/></g>')
  })

  test('drops empty parts', () => {
    expect(group({}, ['<a/>', '', '<b/>'])).toBe('<g><a/>\n<b/></g>')
  })

  test('returns nothing at all when there is nothing to draw', () => {
    expect(group({ id: 'g' }, ['', ''])).toBe('')
  })
})

describe('text', () => {
  test('escapes its content', () => {
    expect(text('Ohm & Sons', { x: 0 })).toBe('<text x="0">Ohm &amp; Sons</text>')
  })
})

describe('characters XML cannot hold', () => {
  test('control characters are dropped, tab and line breaks are kept', () => {
    expect(escapeXml('Bad\u0001Na\u001Fme￾')).toBe('BadName')
    expect(escapeXml('a\tb\nc\rd')).toBe('a\tb\nc\rd')
  })

  test('so a name full of them still gives well-formed text', () => {
    expect(text('Sol\u0000 & co', {})).toBe('<text>Sol &amp; co</text>')
  })
})

describe('idPrefixOf', () => {
  test('keeps a safe prefix, repairs any other', () => {
    expect(idPrefixOf('starmap-sol_2')).toBe('starmap-sol_2')
    expect(idPrefixOf('alpha centauri')).toBe('alpha_centauri')
    expect(idPrefixOf('a"b(c)')).toBe('a_b_c_')
    expect(idPrefixOf('42')).toBe('_42')
    expect(idPrefixOf('-x')).toBe('_-x')
  })
})
