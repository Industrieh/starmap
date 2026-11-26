import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { JSX } from 'react'

import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { pageMetadata } from '@/lib/metadata'
import { LIBRARIES, findLibrary, routes } from '@/lib/routes'
import { versionOf } from '@/lib/versions'

type Params = { library: string }

/** One entry per library, so both overviews are prerendered at build time. */
export function generateStaticParams(): Params[] {
  return LIBRARIES.map((library) => ({ library: library.slug }))
}

/**
 * Only the libraries above exist. Without this, `/docs/anything` was rendered on
 * request — to a 404, but a 404 then cached as if it were a page.
 */
export const dynamicParams = false

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const library = findLibrary((await params).library)
  if (!library) return {}

  // "Overview", like the sidebar entry — and `pageMetadata` drops the library
  // name when it is the site name, so the core reads "Overview · starmap".
  return pageMetadata({
    segments: ['Overview', library.name],
    description: library.tagline,
    path: routes.library(library.slug),
  })
}

export default async function LibraryPage({
  params,
}: {
  params: Promise<Params>
}): Promise<JSX.Element> {
  // `params` is a promise in Next.js 16 — it has to be awaited.
  const library = findLibrary((await params).library)
  if (!library) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-medium text-muted-foreground">Documentation</p>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{library.name}</h1>
        <Badge variant="secondary">v{versionOf(library.slug)}</Badge>
      </div>

      <p className="mt-4 text-lg text-muted-foreground">{library.tagline}</p>

      <div className="mt-6 inline-flex items-center rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">
        bun add {library.packageName}
      </div>

      <Separator className="my-10" />

      <div className="flex flex-col gap-10">
        {library.groups.map((group) => (
          <section key={group.title}>
            <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
              {group.title}
            </h2>
            <ul className="mt-4 flex flex-col divide-y border-y">
              {group.pages.map((page) => (
                <li key={page.slug}>
                  <Link
                    href={routes.page(library.slug, page.slug)}
                    className="group flex flex-col gap-1 py-4 transition-colors hover:bg-muted/40"
                  >
                    <span className="font-medium group-hover:underline">{page.title}</span>
                    <span className="text-sm text-muted-foreground">{page.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
