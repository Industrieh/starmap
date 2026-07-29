import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { JSX } from 'react'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
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

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { library: librarySlug, slug } = await params
  const library = findLibrary(librarySlug)
  const page = library && findPage(library, slug)
  if (!page) return {}

  // `absolute` bypasses the root layout's `%s · starmap` template — without it
  // the tab reads "Data model · starmap · starmap".
  return {
    title: { absolute: `${page.title} · ${library.name} · starmap` },
    description: page.description,
  }
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

  return (
    <article className="mx-auto max-w-3xl">
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
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{page.title}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{page.description}</p>

      <Separator className="my-10" />

      {/* The skeleton stops here. The prose will come from the Markdown that
          already lives in the package — see the note in the app README. */}
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Content to come, from{' '}
          <code className="font-mono text-foreground">
            packages/{library.slug}/docs/{page.slug}.md
          </code>
        </p>
      </div>

      <Separator className="my-10" />

      <nav className="flex flex-col gap-3 sm:flex-row sm:justify-between">
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
  )
}
