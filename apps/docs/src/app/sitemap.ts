import type { MetadataRoute } from 'next'

import { LIBRARIES, SITE_URL, flattenPages, routes } from '@/lib/routes'

/**
 * `/sitemap.xml`, generated from `LIBRARIES` like the navigation and the routes,
 * so a page added there is listed here at the next build.
 *
 * No `lastModified`: the build has no honest date to give. Stamping every entry
 * with the build time would tell a crawler that every page changed on every
 * deploy, which is worse than saying nothing.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths: string[] = [routes.home, routes.docs]
  for (const library of LIBRARIES) {
    paths.push(routes.library(library.slug))
    for (const page of flattenPages(library)) paths.push(routes.page(library.slug, page.slug))
  }

  return paths.map((path) => ({ url: SITE_URL + (path === '/' ? '' : path) }))
}
