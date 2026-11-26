/**
 * Brings the workspace versions recorded in `bun.lock` in line with the
 * `package.json` files — and touches nothing else.
 *
 * Run by `bun run changeset:version`, right after the versions are bumped, and
 * it is not optional. `bun.lock` records the version of every **workspace**
 * package, and when `bun publish` rewrites an internal `workspace:` range, the
 * version it writes comes from there, not from `package.json`. A plain
 * `bun install` — even `--force`, even `--frozen-lockfile` — leaves that
 * recorded version alone, because the dependency graph itself has not changed.
 * Checked on Bun 1.3.11: after a bump, `bun install` reports "no changes" and
 * `bun pm pack` still writes the old version.
 *
 * Skip this and the failure is silent and total: `starmap-render@0.2.0` ships
 * declaring a dependency on `starmap@0.1.0`, the version that was in the
 * lockfile, which may never be published. Every `bun add` of the new release
 * then fails to resolve.
 *
 * This script used to delete `bun.lock` and reinstall. That fixes the versions
 * too — by re-resolving every third-party dependency to the newest release its
 * range allows. Tried on the `0.1.0-beta.1` bump, it produced a 748-line diff
 * of the lockfile: a version pull request smuggling in an upgrade of half the
 * dependency tree, unreviewed because it reads as noise. Now only the
 * `"version"` line of each workspace entry changes, and `bun install` then
 * confirms that Bun accepts the result.
 *
 * `scripts/publish.ts` checks the outcome anyway, and refuses to publish a
 * tarball whose internal dependencies do not match the versions being released.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const LOCKFILE = join(ROOT, 'bun.lock')

/**
 * The head of one workspace entry of `bun.lock`, down to its version:
 *
 * ```jsonc
 *     "packages/starmap": {
 *       "name": "@industrieh/starmap",
 *       "version": "0.1.0-beta.0",
 * ```
 *
 * `bun.lock` is JSONC with trailing commas, so `JSON.parse` cannot read it, and
 * writing it back from a parsed copy would reformat the whole file anyway. A
 * pattern for this one shape, replacing one string, keeps every other byte as
 * Bun wrote it. The root workspace has no `"version"` right after its name, so
 * it never matches — it has no version to keep in step.
 */
const WORKSPACE_ENTRY = /("([^"]*)": \{\s*"name": "[^"]+",\s*"version": ")([^"]*)(")/g

interface Stale {
  workspace: string
  recorded: string
  declared: string
}

/** The version `package.json` declares for a workspace path, if any. */
function declaredVersion(workspace: string): string | undefined {
  const manifestPath = join(ROOT, workspace, 'package.json')
  if (!existsSync(manifestPath)) return undefined
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { version?: string }
  return manifest.version
}

/**
 * Splits the lockfile around its `"workspaces"` section — the only place the
 * edit may happen. Third-party entries live in `"packages"`, after it.
 */
function workspacesSection(lock: string): { head: string; section: string; tail: string } {
  const start = lock.indexOf('"workspaces": {')
  const end = lock.indexOf('"packages": {', start)
  if (start === -1 || end === -1) {
    console.error(
      '✗ bun.lock has no "workspaces" section followed by "packages" — has its format changed?\n' +
        '  Fall back to `rm bun.lock && bun install`, and review the lockfile diff.',
    )
    process.exit(1)
  }
  return { head: lock.slice(0, start), section: lock.slice(start, end), tail: lock.slice(end) }
}

/** Workspaces whose recorded version differs from their `package.json`. */
function staleWorkspaces(lock: string): Stale[] {
  const { section } = workspacesSection(lock)
  return [...section.matchAll(WORKSPACE_ENTRY)].flatMap((match): Stale[] => {
    const workspace = match[2] ?? ''
    const recorded = match[3] ?? ''
    const declared = declaredVersion(workspace)
    return declared !== undefined && declared !== recorded
      ? [{ workspace, recorded, declared }]
      : []
  })
}

const before = readFileSync(LOCKFILE, 'utf8')
const { head, section, tail } = workspacesSection(before)

// No match at all means Bun changed the shape of its entries: refuse to report
// a success that did nothing.
if ([...section.matchAll(WORKSPACE_ENTRY)].length === 0) {
  console.error(
    '✗ found no workspace entry with a version in bun.lock — has its format changed?\n' +
      '  Fall back to `rm bun.lock && bun install`, and review the lockfile diff.',
  )
  process.exit(1)
}

const stale = staleWorkspaces(before)
const edited = section.replaceAll(
  WORKSPACE_ENTRY,
  (match: string, start: string, workspace: string, _recorded: string, end: string) => {
    const declared = declaredVersion(workspace)
    return declared === undefined ? match : `${start}${declared}${end}`
  },
)

if (edited !== section) writeFileSync(LOCKFILE, `${head}${edited}${tail}`)
for (const { workspace, recorded, declared } of stale) {
  console.log(`  ${workspace}: ${recorded} → ${declared}`)
}

// Bun has the last word: it accepts the edited lockfile as it is, or completes
// it if a `package.json` changed in some other way too.
execFileSync('bun', ['install'], { cwd: ROOT, stdio: 'inherit' })

const leftover = staleWorkspaces(readFileSync(LOCKFILE, 'utf8'))
if (leftover.length > 0) {
  console.error('✗ bun.lock still records stale workspace versions:')
  for (const { workspace, recorded, declared } of leftover) {
    console.error(`  ${workspace}: ${recorded}, expected ${declared}`)
  }
  process.exit(1)
}

console.log(
  stale.length > 0
    ? `✦ bun.lock: ${stale.length} workspace version(s) updated, nothing else re-resolved`
    : '✦ bun.lock: workspace versions already up to date',
)
