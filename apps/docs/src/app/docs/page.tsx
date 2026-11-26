import type { Metadata } from 'next'
import Link from 'next/link'
import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { pageMetadata } from '@/lib/metadata'
import { LIBRARIES, SITE_URL, routes } from '@/lib/routes'
import { versionOf } from '@/lib/versions'

export const metadata: Metadata = pageMetadata({
  segments: ['Documentation'],
  description: 'Two libraries, one site: the model and the renderer.',
  path: routes.docs,
})

export default async function DocsIndexPage(): Promise<JSX.Element> {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-medium text-muted-foreground">Documentation</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Two libraries, one site</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        The model and the renderer are documented separately because they are used separately. Pick
        the one you need — the header keeps both a click away.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {LIBRARIES.map((library) => (
          // `relative` is what contains the link's `after:absolute after:inset-0`
          // overlay: without it the overlay stretched to the nearest positioned
          // ancestor, covered the whole page, and every click opened the last
          // card's library.
          <Card
            key={library.slug}
            className="relative transition-colors hover:border-foreground/20"
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{library.name}</CardTitle>
                <Badge variant="secondary">v{versionOf(library.slug)}</Badge>
              </div>
              <CardDescription>{library.tagline}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={routes.library(library.slug)}
                className="text-sm font-medium after:absolute after:inset-0 hover:underline"
              >
                Read the documentation
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-16 text-2xl font-semibold tracking-tight">Reading this with an AI</h2>
      <p className="mt-4 text-muted-foreground">
        This site publishes itself in the format assistants read, so you do not have to paste pages
        into a chat or hope the model was trained on a library released this year.
      </p>

      <dl className="mt-6 space-y-4">
        <div>
          <dt className="font-mono text-sm">
            <a href={`${SITE_URL}/llms.txt`} className="font-medium hover:underline">
              /llms.txt
            </a>
          </dt>
          <dd className="mt-1 text-sm text-muted-foreground">
            The map — what each package is for, and every page of this site with a one-line
            description. A few kilobytes. Start here; the assistant fetches what it needs next.
          </dd>
        </div>
        <div>
          <dt className="font-mono text-sm">
            <a href={`${SITE_URL}/llms-full.txt`} className="font-medium hover:underline">
              /llms-full.txt
            </a>
          </dt>
          <dd className="mt-1 text-sm text-muted-foreground">
            Everything, in one file — both READMEs and every guide, well over 100 KB. One fetch and
            the model has the whole API, the data model and the design decisions.
          </dd>
        </div>
      </dl>

      <p className="mt-6 text-muted-foreground">
        Point a tool at whichever fits. In an agent that supports project instructions — Claude
        Code, Cursor, Copilot — a rules file is enough:
      </p>

      <CodeBlock
        className="mt-4"
        lang="md"
        filename="AGENTS.md"
        code={`When writing code against @industrieh/starmap or
@industrieh/starmap-render, read ${SITE_URL}/llms-full.txt first.
It is the complete documentation of both packages.

Two rules the API will not enforce for you:
the core never draws, and the renderer never invents world data.`}
      />

      <p className="mt-6 text-muted-foreground">
        In a chat, pasting the URL works just as well. And if your assistant cannot reach the
        network, both files are plain text — download one and attach it.
      </p>

      <p className="mt-6 text-sm text-muted-foreground">
        Both are generated at build time, so they carry the version you see above.{' '}
        <code className="font-mono">llms.txt</code> is built from the same page list as this
        site&apos;s navigation. <code className="font-mono">llms-full.txt</code> is the Markdown
        that ships with each package — written alongside these pages rather than generated from
        them, and kept in step by hand.
      </p>
    </div>
  )
}
