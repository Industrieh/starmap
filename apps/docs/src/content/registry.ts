/**
 * Where the prose of each documentation page lives.
 *
 * [`routes.ts`](../lib/routes.ts) says which pages exist and how they are
 * grouped; this file says what is *in* them. The split is deliberate — the
 * navigation is data the whole site reads, the content is a React tree only one
 * route renders.
 *
 * A page is a plain module with two exports: a `toc`, and a default component.
 * The imports below are static rather than dynamic so that every page is part of
 * the build graph, gets prerendered, and fails the typecheck the day a component
 * stops matching its signature.
 *
 * **Adding a page** takes two edits: an entry in `LIBRARIES` (which creates the
 * route and the sidebar link) and an entry here (which fills it). A page missing
 * from this file still renders — it falls back to a marker naming the Markdown
 * it will draw from — so the two can be written out of step.
 */

import type { ComponentType } from 'react'

import * as starmapAnimating from './starmap/animating'
import * as starmapApi from './starmap/api'
import * as starmapArchitecture from './starmap/architecture'
import * as starmapDataModel from './starmap/data-model'
import * as starmapDesign from './starmap/design'
import * as starmapInstallation from './starmap/installation'
import * as starmapQuerying from './starmap/querying'
import * as starmapQuickstart from './starmap/quickstart'
import * as starmapRandomness from './starmap/randomness'
import * as starmapRecipes from './starmap/recipes'

/**
 * One line of the "On this page" rail. `depth` is `2` for a section and `3` for
 * a subsection — the only two levels a reader can hold in their head at once.
 */
export type TocEntry = {
  id: string
  title: string
  depth: 2 | 3
}

export type DocContent = {
  toc: readonly TocEntry[]
  default: ComponentType
}

/** Keyed by `<library>/<slug>`, the same two segments as the URL. */
const CONTENT: Record<string, DocContent> = {
  'starmap/installation': starmapInstallation,
  'starmap/quickstart': starmapQuickstart,
  'starmap/data-model': starmapDataModel,
  'starmap/querying': starmapQuerying,
  'starmap/animating': starmapAnimating,
  'starmap/randomness': starmapRandomness,
  'starmap/recipes': starmapRecipes,
  'starmap/design': starmapDesign,
  'starmap/architecture': starmapArchitecture,
  'starmap/api': starmapApi,
}

/** The content of a page, or `undefined` while it is still to be written. */
export function findContent(library: string, slug: string): DocContent | undefined {
  return CONTENT[`${library}/${slug}`]
}
