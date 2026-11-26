/**
 * The `<head>` of a page: its tab title, its description, its canonical URL and
 * the Open Graph fields a link preview reads.
 *
 * One function, so that every page states the same four things the same way —
 * a page that forgot its canonical link, or whose preview card kept the home
 * page's title, is the drift this exists to prevent.
 */

import type { Metadata } from 'next'

/** The last segment of every tab title, and the `og:site_name`. */
export const SITE_NAME = 'starmap'

/** The home page's title, and the fallback of a page that sets none. */
export const SITE_TITLE = 'starmap — a typed star universe for JS/TS games'

/** The home page's description, and the fallback of a page that sets none. */
export const SITE_DESCRIPTION =
  'Describe, validate and query a star universe, then draw it as SVG. Two small libraries, no dependencies.'

/**
 * Metadata for one page.
 *
 * The title runs from the most specific segment to the site name, and a segment
 * equal to the one after it is dropped: the core library is *called* starmap, and
 * the plain join gave "Data model · starmap · starmap". `absolute` bypasses the
 * root layout's template, which this function replaces.
 *
 * `path` is relative to the site — `metadataBase`, set in the root layout, makes
 * it the absolute URL a canonical link and `og:url` need.
 */
export function pageMetadata({
  segments,
  description,
  path,
}: {
  segments: readonly string[]
  description: string
  path: string
}): Metadata {
  const parts = [...segments, SITE_NAME]
  const title = parts.filter((part, i) => part !== parts[i + 1]).join(' · ')

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', siteName: SITE_NAME, title, description, url: path },
  }
}
