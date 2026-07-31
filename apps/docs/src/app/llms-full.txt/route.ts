/**
 * `/llms-full.txt` — the documentation itself, as one file.
 *
 * The companion to `/llms.txt`: that one links, this one carries. An agent that
 * fetches it has the whole API, the data model and the design decisions in a
 * single request, and needs no crawl.
 *
 * The source is the Markdown already living next to each package — the same
 * files a reader gets on GitHub. Nothing is written twice: the site renders
 * those guides as React, and this route serves them as text.
 *
 * Everything happens at build time. The route is `force-static`, so the files
 * are read while the site is being prerendered and the result is baked into a
 * static response; nothing touches the filesystem when a request arrives, which
 * is what makes this safe on a serverless host where `packages/` is not
 * deployed.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { LIBRARIES, SITE_URL, routes } from '@/lib/routes'

export const dynamic = 'force-static'

/** Files to include, per package slug, in reading order. */
const SOURCES: Record<string, string[]> = {
  starmap: [
    'README.md',
    'docs/data-model.md',
    'docs/recipes.md',
    'docs/design.md',
    'docs/architecture.md',
  ],
  'starmap-render': [
    'README.md',
    'docs/drawing.md',
    'docs/theming.md',
    'docs/recipes.md',
    'docs/architecture.md',
  ],
}

/**
 * The repo root, found by walking up until `packages/` is there.
 *
 * `process.cwd()` is the app directory when the build runs through the
 * workspace filter and the repo root when someone runs `next build` by hand.
 * Looking for a landmark covers both, and throws loudly rather than emitting a
 * file that is silently missing half the documentation.
 */
function repoRoot(): string {
  let dir = process.cwd()

  for (;;) {
    if (existsSync(join(dir, 'packages', 'starmap', 'package.json'))) return dir

    const parent = dirname(dir)
    if (parent === dir) {
      throw new Error(`llms-full.txt: no packages/ directory above ${process.cwd()}`)
    }
    dir = parent
  }
}

function build(): string {
  const root = repoRoot()
  const parts: string[] = [
    '# starmap — full documentation',
    '',
    'Every README and guide of both packages, concatenated. Generated from the',
    `Markdown in the repository; the rendered version is at ${SITE_URL}.`,
    '',
    'Sections are separated by a rule and the path of the file they came from.',
    '',
  ]

  for (const library of LIBRARIES) {
    const files = SOURCES[library.slug]
    if (files === undefined) continue

    parts.push(
      '---',
      '',
      `# Package: ${library.packageName} v${library.version}`,
      '',
      `${library.tagline}`,
      '',
      `Source: ${routes.githubPackage(library.slug)}`,
      '',
    )

    for (const file of files) {
      const path = join(root, 'packages', library.slug, file)
      if (!existsSync(path)) {
        throw new Error(`llms-full.txt: missing source ${path}`)
      }

      parts.push(
        '---',
        '',
        `<!-- packages/${library.slug}/${file} -->`,
        '',
        readFileSync(path, 'utf8').trim(),
        '',
      )
    }
  }

  return parts.join('\n')
}

export function GET(): Response {
  return new Response(build(), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  })
}
