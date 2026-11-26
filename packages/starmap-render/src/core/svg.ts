/**
 * The string primitives every drawing goes through.
 *
 * This package writes SVG as text. There is no DOM, no `document.createElement`,
 * and no template engine — four functions do all of it, and they are the only
 * place in the package where a `<` character is written.
 *
 * Keeping them in one file is what makes escaping and number formatting
 * unmissable: a drawing function cannot forget them, because it never builds a
 * tag itself.
 */

import { round } from '@industrieh/starmap'

import type { ViewBox } from './geometry'

/** A value an attribute can take. `undefined` and `false` drop the attribute. */
export type AttrValue = string | number | boolean | undefined | null

/** Attributes of one element, in the order they will be written. */
export type Attrs = Readonly<Record<string, AttrValue>>

/**
 * Characters XML 1.0 cannot carry at all, escaped or not: the C0 controls other
 * than tab, line feed and carriage return, and the non-characters U+FFFE and
 * U+FFFF.
 */
// oxlint-disable-next-line no-control-regex -- matching control characters is the point
const XML_FORBIDDEN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g

/**
 * Escape text for XML: `&`, `<`, `>`, `"` and `'` — and drop the characters
 * XML cannot hold at all.
 *
 * Every name in a galaxy is user data. A system called `Ohm & Sons` breaks the
 * document without this, a name carrying a tag would inject markup into
 * whatever page embeds the output, and a stray control character makes a `.svg`
 * file that strict XML readers refuse.
 *
 * `&` is replaced first, otherwise it would re-escape the entities added after
 * it.
 */
export function escapeXml(value: string): string {
  return value
    .replace(XML_FORBIDDEN, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

/**
 * Format a number for an attribute: two decimals, no trailing zeros, no
 * exponent.
 *
 * Coordinates come out of trigonometry, so without rounding the document is
 * full of `130.00000000000003` and twice the size for no visible precision.
 * A non-finite value becomes `0` rather than the string `NaN`, which no SVG
 * reader accepts.
 */
export function num(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return String(round(value))
}

/**
 * One element, self-closing when it has no children.
 *
 * @example
 * ```ts
 * el('circle', { r: 4.005, fill: '#fff' })     // <circle r="4" fill="#fff"/>
 * el('g', { class: 'x' }, '<circle r="1"/>')   // <g class="x"><circle r="1"/></g>
 * ```
 */
export function el(name: string, attrs: Attrs, children = ''): string {
  let out = `<${name}`
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue
    const written = typeof value === 'number' ? num(value) : String(value)
    out += ` ${key}="${escapeXml(written)}"`
  }
  return children === '' ? `${out}/>` : `${out}>${children}</${name}>`
}

/**
 * A `<g>` wrapping several parts, one per line.
 *
 * Empty parts are dropped, and a group left with nothing to draw returns an
 * empty string — a system with no gates produces no gate layer at all, rather
 * than an empty one.
 */
export function group(attrs: Attrs, parts: readonly string[]): string {
  const body = parts.filter((part) => part !== '').join('\n')
  return body === '' ? '' : el('g', attrs, body)
}

/**
 * The rectangle that fills a drawing behind everything else.
 *
 * It is three times the `viewBox` and centred on it, on purpose.
 * `preserveAspectRatio` letterboxes a drawing whose box does not match the space
 * it is given, and those bands sit *outside* the `viewBox` — a rectangle of
 * exactly the right size leaves them transparent, showing the page through
 * them.
 */
export function background(view: ViewBox, fill: string): string {
  return el('rect', {
    x: view.x - view.w,
    y: view.y - view.h,
    width: view.w * 3,
    height: view.h * 3,
    fill,
  })
}

/**
 * A `stroke-dasharray` value.
 *
 * Dash patterns are the one place a length is written into a string instead of
 * an attribute of its own, so they would otherwise escape {@link num} and put
 * `3.2624999999999997` in the output.
 */
export function dash(...lengths: readonly number[]): string {
  return lengths.map(num).join(' ')
}

/**
 * Make a string safe to use as the start of an XML `id`, and inside the
 * `url(#…)` that references it.
 *
 * Ids are free-form in the model, so a prefix built from one may hold a space
 * or a bracket — and `url(#alpha centauri-glow)` points nowhere, silently.
 * Anything but letters, digits, `-` and `_` becomes `_`, and a prefix that does
 * not start with a letter or `_` gets one in front.
 */
export function idPrefixOf(raw: string): string {
  const safe = raw.replaceAll(/[^A-Za-z0-9_-]/g, '_')
  return /^[A-Za-z_]/.test(safe) ? safe : `_${safe}`
}

/** A `<text>` element. The content is escaped; callers pass raw names. */
export function text(content: string, attrs: Attrs): string {
  return el('text', attrs, escapeXml(content))
}
