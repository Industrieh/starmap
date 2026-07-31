import type { Metadata } from 'next'
import Link from 'next/link'
import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LIBRARIES, SITE_URL, routes } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Two libraries, one site: the model and the renderer.',
}

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
          <Card key={library.slug} className="transition-colors hover:border-foreground/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{library.name}</CardTitle>
                <Badge variant="secondary">v{library.version}</Badge>
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
            Everything, in one file — both READMEs and every guide, about 120 KB. One fetch and the
            model has the whole API, the data model and the design decisions.
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
        Both are generated at build time from the same source as this site, so they carry the
        version you see above and never drift from the pages they describe.
      </p>
    </div>
  )
}
