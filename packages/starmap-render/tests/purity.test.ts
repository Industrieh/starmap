/**
 * The package stays a string generator.
 *
 * This is **the** rule here: `src/` knows about `@cotontigeh/starmap` and about
 * nothing else. No DOM, no framework, no stylesheet, no clock, no randomness
 * that is not seeded. That is what lets the same call render a thumbnail on a
 * server, a frame in a worker, and a live map in a browser.
 *
 * It is the same test the core carries, with one difference: exactly one
 * non-relative import is allowed, and it is the core itself.
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

/** A word is fine in a comment, not in code. */
const stripComments = (source: string) => source.replaceAll(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')

describe('one dependency', () => {
  test('some files were actually found', () => {
    expect(files.length).toBeGreaterThan(4)
  })

  test.each(cases)('%s imports the core, or something local', (_name, file) => {
    const code = stripComments(readFileSync(file, 'utf8'))
    for (const [, specifier] of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      expect(specifier, `${_name} imports ${specifier}`).toMatch(/^(\.\.?\/|@cotontigeh\/starmap$)/)
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
    // A drawing is a pure function of (data, t, theme). Two calls with the same
    // arguments must produce the very same string — that is what makes a
    // snapshot test, a cache or a diff possible downstream.
    const code = stripComments(readFileSync(file, 'utf8'))
    expect(code).not.toMatch(/Math\.random|new Date\(|Date\.now\(/)
  })
})
