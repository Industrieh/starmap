/**
 * The `<svg>` element that wraps a drawing.
 *
 * Both renderers produce their layers first and put this around them last,
 * which is why the layers are also available on their own — an application that
 * pans and zooms supplies its own root element and its own `viewBox`.
 *
 * The file is called `root.ts` rather than `document.ts` because
 * `tests/purity.test.ts` rejects the word `document` anywhere in the sources,
 * import paths included. That check is worth more than the better file name.
 */

import { viewBoxAttr, type ViewBox } from './geometry'
import { el, escapeXml } from './svg'

/** Options of the root `<svg>` element. */
export interface DocumentOptions {
  /**
   * `width` attribute, in pixels. Left out by default, which makes the drawing
   * fill whatever box it is put in.
   */
  width?: number
  /** `height` attribute, in pixels. Same default. */
  height?: number
  /**
   * Accessible name, written as a `<title>` child. A drawing with a title is
   * announced by a screen reader instead of being skipped.
   */
  title?: string
}

/** Wrap finished layers in a standalone, self-describing SVG document. */
export function svgDocument(view: ViewBox, body: string, options: DocumentOptions = {}): string {
  const { width, height, title } = options
  // `xmlns` is what makes the string usable outside an HTML parser: a .svg file,
  // a data: URI, an <img src>. Inline in HTML it is optional but harmless.
  const attrs = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: viewBoxAttr(view),
    width,
    height,
    preserveAspectRatio: 'xMidYMid meet',
    role: title === undefined ? undefined : 'img',
  }
  const head = title === undefined ? '' : `${el('title', {}, escapeXml(title))}\n`
  return el('svg', attrs, `\n${head}${body}\n`)
}
