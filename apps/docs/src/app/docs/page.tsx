import type { Metadata } from 'next'
import Link from 'next/link'
import type { JSX } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LIBRARIES, routes } from '@/lib/routes'

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Two libraries, one site: the model and the renderer.',
}

export default function DocsIndexPage(): JSX.Element {
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
    </div>
  )
}
