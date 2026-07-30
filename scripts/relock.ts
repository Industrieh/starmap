/**
 * Rebuilds `bun.lock` from scratch.
 *
 * Run by `bun run changeset:version`, right after the versions are bumped, and
 * it is not optional. `bun.lock` records the version of every **workspace**
 * package, and `bun publish` reads the internal `workspace:*` ranges from
 * there, not from `package.json`. A plain `bun install` — even
 * `bun install --force`, even `--frozen-lockfile` — leaves that recorded
 * version alone, because the dependency graph itself has not changed.
 *
 * Skip this and the failure is silent and total: `starmap-render@0.2.0` ships
 * declaring a dependency on `starmap@0.1.0`, the version that was in the
 * lockfile, which may never be published. Every `bun add` of the new release
 * then fails to resolve.
 *
 * Deleting the file is what forces Bun to re-read the manifests.
 * `scripts/publish.ts` checks the result anyway, and refuses to publish a
 * tarball whose internal dependencies do not match the versions being released.
 */

import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

rmSync(join(ROOT, 'bun.lock'), { force: true })
execFileSync('bun', ['install'], { cwd: ROOT, stdio: 'inherit' })

console.log('✦ bun.lock rebuilt against the current package versions')
