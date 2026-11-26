/**
 * Publishes every public package of `packages/` to npm.
 *
 * Run by `.github/workflows/release.yml` once the whole check suite is green.
 * It is deliberately a script rather than `changeset publish`, for one reason:
 * this repo declares internal dependencies with the `workspace:` protocol, and
 * `npm publish` ships that string **as is** — a published tarball asking for a
 * version range npm cannot resolve. `bun publish` rewrites it to the real
 * version at pack time, so Bun is what publishes here.
 *
 * Four things it does on top of calling `bun publish`:
 *
 * 1. **It picks the dist-tag from the version.** A version carrying a
 *    prerelease identifier (`0.1.0-beta.0`) is published under that identifier
 *    (`beta`), never under `latest`. Getting this wrong is the one mistake that
 *    cannot be undone: `npm install` would hand a beta to everyone.
 * 2. **It skips what is already online.** Republishing an existing version is a
 *    hard error on npm, so a release that only moved one of the two packages
 *    would fail halfway. Skipping makes the workflow re-runnable.
 * 3. **It refuses to publish a dirty version.** `0.0.0` means "never
 *    released" — `changeset version` has not run.
 * 4. **It publishes a package before the packages that depend on it.** If the
 *    run dies halfway, the registry then holds a new `starmap` with no matching
 *    `starmap-render` yet — harmless — rather than a `starmap-render` asking for
 *    a `starmap` that does not exist, which nobody can install until the
 *    release is re-run.
 *
 * ```bash
 * bun run release:dry-run    # says what it would do, publishes nothing
 * bun run release:publish    # the real thing — needs npm credentials
 * ```
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const PACKAGES = join(ROOT, 'packages')
const DRY_RUN = process.argv.includes('--dry-run')

interface Manifest {
  name: string
  version: string
  private?: boolean
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

/**
 * The dependency fields an installed package is resolved from. Each of them can
 * name a sibling package, and each of them goes through the `workspace:`
 * rewrite. `devDependencies` are left out: npm never installs them for a user.
 */
const RUNTIME_DEPENDENCY_FIELDS = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
] as const satisfies readonly (keyof Manifest)[]

/** Every runtime dependency of a manifest, as `[field, name, range]`. */
function runtimeDependencies(manifest: Manifest): [field: string, name: string, range: string][] {
  return RUNTIME_DEPENDENCY_FIELDS.flatMap((field) =>
    Object.entries(manifest[field] ?? {}).map(([name, range]): [string, string, string] => [
      field,
      name,
      range,
    ]),
  )
}

/**
 * The npm dist-tag a version belongs under.
 *
 * `0.1.0-beta.0` → `beta`, `2.0.0-rc.1` → `rc`, `1.4.2` → `latest`.
 */
function distTag(version: string): string {
  const prerelease = version.split('-')[1]
  if (prerelease === undefined) return 'latest'
  const identifier = prerelease.split('.')[0]
  return identifier === undefined || identifier === '' ? 'latest' : identifier
}

/** Whether this exact version is already on the registry. */
function isPublished(name: string, version: string): boolean {
  try {
    const out = execFileSync('npm', ['view', `${name}@${version}`, 'version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return out.trim() !== ''
  } catch {
    // `npm view` exits non-zero when the package or the version is unknown.
    return false
  }
}

/**
 * The manifest npm would actually receive, obtained by packing for real.
 *
 * This is the only way to see what `workspace:*` was rewritten to: Bun resolves
 * those ranges from `bun.lock`, so `package.json` on disk cannot answer the
 * question.
 */
function packedManifest(dir: string): Manifest {
  const out = mkdtempSync(join(tmpdir(), 'starmap-pack-'))
  try {
    execFileSync('bun', ['pm', 'pack', '--destination', out, '--quiet'], {
      cwd: dir,
      stdio: ['ignore', 'ignore', 'inherit'],
    })
    const tarball = readdirSync(out)[0]
    if (tarball === undefined) throw new Error(`packing produced no tarball in ${dir}`)

    const json = execFileSync('tar', ['-xzOf', join(out, tarball), 'package/package.json'], {
      encoding: 'utf8',
    })
    return JSON.parse(json) as Manifest
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
}

/**
 * Fails the release if a tarball asks for a version of a sibling package that
 * is not the one being released.
 *
 * The case this exists for: `bun.lock` still holds the versions from before
 * `changeset version` ran, so Bun rewrites a `workspace:` range to a stale —
 * often never-published — version. Nothing else catches it. `bun install
 * --frozen-lockfile` is happy, the build is happy, the tests are happy, and the
 * package lands on npm impossible to install. See `scripts/relock.ts`.
 *
 * Every runtime dependency field is checked, not just `dependencies`: a sibling
 * moved to `peerDependencies` goes through the same rewrite, and can go stale
 * the same way. `workspace:^` becomes `^1.2.3`, so a leading `^` or `~` is
 * accepted as long as the version behind it is the one being released.
 */
function verifyInternalDeps(packed: Manifest, releasing: Map<string, string>): string[] {
  const problems: string[] = []

  for (const [field, dep, range] of runtimeDependencies(packed)) {
    if (range.startsWith('workspace:')) {
      problems.push(`${field}: ${dep}@${range} — the workspace protocol survived packing`)
      continue
    }

    const expected = releasing.get(dep)
    if (expected === undefined) continue // an external dependency, not ours

    if (range.replace(/^[\^~]/, '') !== expected) {
      problems.push(
        `${field}: ${dep}@${range}, but this release builds ${dep}@${expected}` +
          ' — bun.lock is stale, run `bun run changeset:version`',
      )
    }
  }

  return problems
}

/**
 * Orders packages so that each one comes after the siblings it depends on, in
 * any runtime dependency field.
 *
 * Names are sorted first, so the order never depends on how the file system
 * happens to list `packages/` — `readdirSync` makes no promise about it.
 */
function dependencyOrder<T extends { manifest: Manifest }>(entries: readonly T[]): T[] {
  const byName = new Map(entries.map((entry) => [entry.manifest.name, entry]))
  const state = new Map<string, 'visiting' | 'done'>()
  const ordered: T[] = []

  const visit = (entry: T, trail: readonly string[]): void => {
    const { name } = entry.manifest
    if (state.get(name) === 'done') return
    if (state.get(name) === 'visiting') {
      throw new Error(`dependency cycle between packages: ${[...trail, name].join(' → ')}`)
    }

    state.set(name, 'visiting')
    for (const [, dep] of runtimeDependencies(entry.manifest)) {
      const sibling = byName.get(dep)
      if (sibling !== undefined) visit(sibling, [...trail, name])
    }
    state.set(name, 'done')
    ordered.push(entry)
  }

  const byNameOrder = entries.toSorted((a, b) => a.manifest.name.localeCompare(b.manifest.name))
  for (const entry of byNameOrder) visit(entry, [])
  return ordered
}

function publishablePackages(): { dir: string; manifest: Manifest }[] {
  return readdirSync(PACKAGES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const dir = join(PACKAGES, entry.name)
      const manifestPath = join(dir, 'package.json')
      if (!existsSync(manifestPath)) return []

      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
      if (manifest.private === true) {
        console.log(`⊘ ${manifest.name} — private, not published`)
        return []
      }
      return [{ dir, manifest }]
    })
}

// In dependency order from the start: the plan below keeps this order, and the
// plan is what gets published.
const packages = dependencyOrder(publishablePackages())
if (packages.length === 0) {
  console.error('✗ no publishable package found in packages/')
  process.exit(1)
}

/** Every version this run is about to put on npm, by package name. */
const releasing = new Map(packages.map(({ manifest }) => [manifest.name, manifest.version]))

// --- everything is checked before anything is published.
//
// Publishing is irreversible: npm will not let the same version be uploaded
// twice, so a run that published one package and then failed on the second
// would leave a release that cannot be completed, only worked around with a new
// version number. So the loop below decides, and the loop after it acts.

const plan: { dir: string; manifest: Manifest; tag: string }[] = []
const problems: string[] = []

for (const { dir, manifest } of packages) {
  const { name, version } = manifest

  if (version === '0.0.0') {
    problems.push(`${name} is still at 0.0.0 — run \`bun run changeset:version\` first`)
    continue
  }

  if (!existsSync(join(dir, 'dist'))) {
    problems.push(`${name} has no dist/ — the build did not run`)
    continue
  }

  if (isPublished(name, version)) {
    console.log(`⊘ ${name}@${version} — already on npm, skipped`)
    continue
  }

  for (const problem of verifyInternalDeps(packedManifest(dir), releasing)) {
    problems.push(`${name}@${version} ${problem}`)
  }

  plan.push({ dir, manifest, tag: distTag(version) })
}

if (problems.length > 0) {
  console.error('\n✗ nothing was published:\n')
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}

if (plan.length === 0) {
  console.log('\n✦ nothing to publish — every version is already on npm')
  process.exit(0)
}

// --- act.

for (const { dir, manifest, tag } of plan) {
  console.log(
    `→ ${manifest.name}@${manifest.version} under the "${tag}" tag${DRY_RUN ? ' (dry run)' : ''}`,
  )
  if (DRY_RUN) continue

  execFileSync('bun', ['publish', '--access', 'public', '--tag', tag], {
    cwd: dir,
    stdio: 'inherit',
  })
}

console.log(
  DRY_RUN
    ? `\n✦ dry run: ${plan.length} package(s) would be published, and their tarballs check out`
    : `\n✦ ${plan.length} package(s) published`,
)
