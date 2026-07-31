/**
 * `/llms.txt` — the site, addressed to a language model rather than a reader.
 *
 * The convention is llmstxt.org: one Markdown file at the root of a domain, an
 * H1 and a blockquote saying what the project is, then H2 sections of annotated
 * links. An agent fetches it first and knows what to fetch next, instead of
 * crawling a site whose navigation is React.
 *
 * It is generated from `LIBRARIES`, like the sidebar and the routes: adding a
 * guide there puts it here too. A hand-written copy would be stale within a
 * release, and stale is worse than absent — a model cannot tell.
 *
 * The companion file is `/llms-full.txt`, which carries the documentation
 * itself rather than links to it.
 */

import { LIBRARIES, SITE_URL, routes } from '@/lib/routes'

// `GET` handlers are dynamic by default since Next.js 15. This one reads
// nothing per-request, so it is prerendered once at build time and served as a
// static file.
export const dynamic = 'force-static'

function build(): string {
  const lines: string[] = [
    '# starmap',
    '',
    '> Two JavaScript/TypeScript libraries for star universes in games. The first',
    '> describes, validates and queries a galaxy; the second turns it into an SVG',
    '> string. No dependencies, no DOM, no framework — the same code runs in a',
    '> browser, in Node or Bun, in a worker, on a server, or inside a game engine.',
    '',
    'The two packages are deliberately separate: one holds the data, the other',
    'decides how it looks. The core does not draw and does not generate universes —',
    'procedural generation is game design, rendering is UI design, and both stay',
    'yours. What they share is the data model.',
    '',
    'Every page below is Markdown-friendly prose with runnable examples. For the',
    'whole documentation as a single file, fetch `/llms-full.txt`.',
    '',
  ]

  for (const library of LIBRARIES) {
    lines.push(`## ${library.packageName} v${library.version} — ${library.tagline}`, '')

    for (const group of library.groups) {
      for (const page of group.pages) {
        const url = SITE_URL + routes.page(library.slug, page.slug)
        lines.push(`- [${page.title}](${url}): ${page.description}`)
      }
    }

    lines.push('')
  }

  lines.push(
    '## Optional',
    '',
    `- [Full documentation, one file](${SITE_URL}/llms-full.txt): every README and`,
    '  guide of both packages concatenated — the API, the data model, the design',
    '  decisions. Large, and the only file needed to answer most questions.',
    `- [Source](${routes.github}): the monorepo, its tests, and the examples.`,
    '',
  )

  return lines.join('\n')
}

export function GET(): Response {
  return new Response(build(), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}
