import Link from 'next/link'
import type { JSX } from 'react'

import { SiteMark } from '@/components/site-logo'
import { LIBRARIES, routes } from '@/lib/routes'

const RESOURCES = [
  { label: 'GitHub', href: routes.github, external: true },
  { label: 'Documentation', href: routes.docs, external: false },
]

export function SiteFooter(): JSX.Element {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-screen-xl flex-col gap-10 px-4 py-12 sm:px-6 md:flex-row md:justify-between">
        <div className="flex max-w-xs flex-col gap-3">
          <div className="flex items-center gap-2 font-medium tracking-tight">
            <SiteMark />
            starmap
          </div>
          <p className="text-sm text-muted-foreground">
            A typed model of a star universe for JavaScript and TypeScript games — and a renderer
            that turns it into SVG.
          </p>
        </div>

        <div className="flex gap-16">
          <nav aria-labelledby="footer-libraries" className="flex flex-col gap-3">
            <span id="footer-libraries" className="text-sm font-medium">
              Libraries
            </span>
            {LIBRARIES.map((library) => (
              <Link
                key={library.slug}
                href={routes.library(library.slug)}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {library.name}
              </Link>
            ))}
          </nav>

          <nav aria-labelledby="footer-resources" className="flex flex-col gap-3">
            <span id="footer-resources" className="text-sm font-medium">
              Resources
            </span>
            {RESOURCES.map((resource) => (
              <Link
                key={resource.label}
                href={resource.href}
                target={resource.external ? '_blank' : undefined}
                rel={resource.external ? 'noreferrer' : undefined}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {resource.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-screen-xl px-4 pb-10 sm:px-6">
        <p className="text-xs text-muted-foreground">
          Built with Next.js and shadcn/ui. Every drawing on this site is the renderer&apos;s real
          output, produced while the site was built.
        </p>
      </div>
    </footer>
  )
}
