/**
 * The published version of each library, read from its own `package.json`.
 *
 * Read, never typed here: `changeset version` bumps the manifest, and a number
 * copied into this file would be wrong the day after a release.
 *
 * It is kept apart from `routes.ts` on purpose. That file is imported by the
 * Client Components of the navigation, and a JSON import there ships the whole
 * manifest — scripts, keywords, repository — to every visitor. Only Server
 * Components and route handlers import this one, so the manifests stay on the
 * server and the browser receives the version strings they render, nothing more.
 */

import starmapRenderPkg from '../../../../packages/starmap-render/package.json'
import starmapPkg from '../../../../packages/starmap/package.json'

/** Keyed by library slug, the same key as `LIBRARIES` in `routes.ts`. */
const VERSIONS: Readonly<Record<string, string>> = {
  starmap: starmapPkg.version,
  'starmap-render': starmapRenderPkg.version,
}

/** The version of a library, by its slug. Throws on a slug with no manifest. */
export function versionOf(slug: string): string {
  const version = VERSIONS[slug]
  if (version === undefined) throw new Error(`versionOf: no package.json for library "${slug}"`)
  return version
}
