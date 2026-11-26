/**
 * `/llms-full.txt` — the documentation itself, as one file.
 *
 * The companion to `/llms.txt`: that one links, this one carries. An agent that
 * fetches it has the whole API, the data model and the design decisions in a
 * single request, and needs no crawl.
 *
 * The source is the Markdown living next to each package — the same files a
 * reader gets on GitHub. The site's pages are *not* generated from it: they are
 * written separately, as TSX under `src/content/`, and cover much of the same
 * ground. The two can therefore disagree, and a change to one usually wants the
 * same change in the other.
 *
 * Relative links are rewritten on the way through. On GitHub,
 * `[the data model](docs/data-model.md)` resolves against the file that holds
 * it; served from this domain it would resolve against `/llms-full.txt` and 404.
 *
 * Everything happens at build time. The route is `force-static`, so the files
 * are read while the site is being prerendered and the result is baked into a
 * static response; nothing touches the filesystem when a request arrives, which
 * is what makes this safe on a serverless host where `packages/` is not
 * deployed.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { GITHUB_URL, LIBRARIES, SITE_URL, routes } from '@/lib/routes'
import { versionOf } from '@/lib/versions'

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

/** A scheme (`https:`, `mailto:`…), a protocol-relative `//`, or an in-page anchor. */
const NOT_RELATIVE = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i

/**
 * Every relative link of one Markdown file, resolved against that file's place
 * in the repository and turned into a GitHub URL.
 *
 * Inline links and images (`[text](target)`) and reference definitions
 * (`[id]: target`) are rewritten. Absolute URLs and anchors are left alone, and
 * so is anything inside a code fence or a code span, where `[i](x)` is code.
 *
 * @param file the path from the repo root, e.g. `packages/starmap/README.md`
 */
function absoluteLinks(markdown: string, file: string): string {
  const base = `${GITHUB_URL}/blob/main/${file}`
  const resolve = (target: string): string =>
    NOT_RELATIVE.test(target) ? target : new URL(target, base).href

  let fence: string | null = null

  return markdown
    .split('\n')
    .map((line) => {
      const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1]
      if (marker !== undefined) {
        // A fence closes on the same character it opened with.
        if (fence === null) fence = marker[0]
        else if (marker[0] === fence) fence = null
        return line
      }
      if (fence !== null) return line

      // Split on code spans so their content is never touched: the odd parts
      // are the spans themselves.
      return line
        .split(/(`[^`]*`)/)
        .map((part, i) =>
          i % 2 === 1
            ? part
            : part
                .replaceAll(
                  /(\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g,
                  (_, open: string, target: string, close: string) =>
                    open + resolve(target) + close,
                )
                .replace(
                  /^(\s*\[[^\]]+\]:\s+)(\S+)/,
                  (_, head: string, target: string) => head + resolve(target),
                ),
        )
        .join('')
    })
    .join('\n')
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
      `# Package: ${library.packageName} v${versionOf(library.slug)}`,
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

      const relative = `packages/${library.slug}/${file}`
      parts.push(
        '---',
        '',
        `<!-- ${relative} -->`,
        '',
        absoluteLinks(readFileSync(path, 'utf8').trim(), relative),
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
