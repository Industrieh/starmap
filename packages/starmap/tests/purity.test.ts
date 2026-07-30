/**
 * The library stays pure logic.
 *
 * This is **the** rule of the package: `src/` knows nothing about UI frameworks,
 * the DOM, or rendering. That is what lets the same code run in a browser, under
 * React Native, in a worker, on a server or inside a game engine, and what
 * leaves the choice of display to the application.
 *
 * The rule is easy to break by accident: a well-meaning `import type`, a helper
 * that returns an SVG path string, a color constant added "just for now". Hence
 * this test, which checks the sources rather than the bundle — so it needs no
 * build first.
 *
 * What a renderer needs on top of this model lives in
 * `@industrieh/starmap-render`, which is where the drawing went.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, test } from 'vitest'

const SRC = new URL('../src', import.meta.url).pathname

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return full.endsWith('.ts') ? [full] : []
  })
}

const files = sourceFiles(SRC)
const cases: [name: string, file: string][] = files.map((f) => [f.slice(SRC.length + 1), f])

/** The word "document" is fine in a comment, not in code. */
const stripComments = (source: string) => source.replaceAll(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')

describe('no dependencies', () => {
  test('some files were actually found', () => {
    expect(files.length).toBeGreaterThan(4)
  })

  test.each(cases)('%s only imports local modules', (_name, file) => {
    // Comments are stripped first: JSDoc examples legitimately import
    // `@industrieh/starmap`, from the reader's point of view.
    const code = stripComments(readFileSync(file, 'utf8'))
    const imports = [...code.matchAll(/from\s+['"]([^'"]+)['"]/g)]
    for (const [, specifier] of imports) {
      expect(specifier, `${_name} imports ${specifier}`).toMatch(/^\.\.?\//)
    }
  })

  test('no JSX file and no stylesheet in src/', () => {
    const assets = readdirSync(SRC, { recursive: true }) as string[]
    expect(assets.filter((f) => /\.(tsx|jsx|css)$/.test(f))).toEqual([])
  })
})

describe('no platform assumptions', () => {
  test.each(cases)('%s touches no browser global', (_name, file) => {
    const code = stripComments(readFileSync(file, 'utf8'))
    expect(code).not.toMatch(/\b(document|window|navigator|localStorage|requestAnimationFrame)\b/)
  })

  test.each(cases)('%s calls neither Math.random nor Date', (_name, file) => {
    const code = stripComments(readFileSync(file, 'utf8'))
    // Everything must be deterministic and clock-free: seeds and timestamps come
    // from the caller.
    expect(code).not.toMatch(/Math\.random|new Date\(|Date\.now\(/)
  })
})

describe('no rendering concepts', () => {
  test.each(cases)('%s exposes no color and no drawable shape', (_name, file) => {
    const code = stripComments(readFileSync(file, 'utf8'))
    expect(code).not.toMatch(/\bcolor\b|#[0-9a-fA-F]{6}\b|svg|canvas|viewBox/i)
  })
})
