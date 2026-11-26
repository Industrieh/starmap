import { ArrowLeftIcon, ArrowRightIcon, PencilLineIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { JSX } from 'react'

import { TableOfContents } from '@/components/docs/table-of-contents'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { findContent } from '@/content/registry'
import { pageMetadata } from '@/lib/metadata'
import { LIBRARIES, findLibrary, findPage, flattenPages, routes, siblingPages } from '@/lib/routes'

type Params = { library: string; slug: string }

/**
 * Every page of every library, prerendered. The list comes from `routes.ts`, so
 * adding an entry there is enough to create the route.
 */
export function generateStaticParams(): Params[] {
  return LIBRARIES.flatMap((library) =>
    flattenPages(library).map((page) => ({ library: library.slug, slug: page.slug })),
  )
}

/**
 * Only the pages above exist. Without this, an unknown slug was rendered on
 * request — to a 404, but a 404 then cached as if it were a page.
 */
export const dynamicParams = false

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { library: librarySlug, slug } = await params
  const library = findLibrary(librarySlug)
  const page = library && findPage(library, slug)
  if (!page) return {}

  // `pageMetadata` drops the library name when it is the site name, so this
  // reads "Data model · starmap" and "Drawing · starmap-render · starmap".
  return pageMetadata({
    segments: [page.title, library.name],
    description: page.description,
    path: routes.page(library.slug, page.slug),
  })
}

export default async function DocPage({
  params,
}: {
  params: Promise<Params>
}): Promise<JSX.Element> {
  const { library: librarySlug, slug } = await params
  const library = findLibrary(librarySlug)
  const page = library && findPage(library, slug)
  if (!library || !page) notFound()

  const group = library.groups.find((candidate) => candidate.pages.includes(page))
  const { previous, next } = siblingPages(library, slug)
  const content = findContent(library.slug, slug)
  const Content = content?.default

  return (
    <div className="flex gap-10 xl:gap-14">
      <article className="min-w-0 max-w-3xl flex-1">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={routes.docs}>Docs</Link>} />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink
                render={<Link href={routes.library(library.slug)}>{library.name}</Link>}
              />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{page.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {group ? (
          <p className="mt-6 text-sm font-medium text-muted-foreground">{group.title}</p>
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance">{page.title}</h1>

        <div className="mt-10">
          {Content ? (
            <Content />
          ) : (
            // A page declared in `routes.ts` but not yet written. It renders
            // rather than 404s, so the navigation can be planned ahead of the
            // prose without leaving broken links behind.
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Content to come, in{' '}
                <code className="font-mono text-foreground">
                  apps/docs/src/content/{library.slug}/{page.slug}.tsx
                </code>
              </p>
            </div>
          )}
        </div>

        <Separator className="my-12" />

        <div className="flex justify-end">
          {/* The page's own module — the prose is TSX under `src/content/`, not
              the Markdown in the package. */}
          <Link
            href={routes.githubPage(library.slug, page.slug)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <PencilLineIcon className="size-3.5" />
            Edit this page on GitHub
          </Link>
        </div>

        <nav
          aria-label="Previous and next pages"
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between"
        >
          {previous ? (
            <Link
              href={routes.page(library.slug, previous.slug)}
              className="group flex flex-1 flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-muted/40"
            >
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowLeftIcon className="size-3" />
                Previous
              </span>
              <span className="font-medium group-hover:underline">{previous.title}</span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}

          {next ? (
            <Link
              href={routes.page(library.slug, next.slug)}
              className="group flex flex-1 flex-col gap-1 rounded-lg border p-4 text-right transition-colors hover:bg-muted/40"
            >
              <span className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                Next
                <ArrowRightIcon className="size-3" />
              </span>
              <span className="font-medium group-hover:underline">{next.title}</span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </nav>
      </article>

      {/* The right rail. Hidden below `xl`: at narrower widths the reading
          column needs the space more than the reader needs a map of the page. */}
      {content?.toc.length ? (
        <aside className="hidden w-56 shrink-0 xl:block">
          <div className="sticky top-[calc(var(--header-height)+2.5rem)] max-h-[calc(100svh-var(--header-height)-5rem)] overflow-y-auto">
            <TableOfContents entries={content.toc} />
          </div>
        </aside>
      ) : null}
    </div>
  )
}
