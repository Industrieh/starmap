import Link from 'next/link'
import type { ComponentProps, JSX, ReactNode } from 'react'

/**
 * The typographic primitives of a documentation page.
 *
 * They exist instead of a `prose` plugin for one reason: **headings need stable
 * ids**. The table of contents on the right links to them, and a heading whose
 * id is derived from its text silently breaks that link the day the wording
 * changes. Here the id is a required prop, declared next to the entry in the
 * page's `toc`.
 */

/** The lead paragraph under the title. One sentence, wider than body text. */
export function Lead({ children }: { children: ReactNode }): JSX.Element {
  return <p className="mt-4 text-lg text-pretty text-muted-foreground">{children}</p>
}

export function H2({ id, children }: { id: string; children: ReactNode }): JSX.Element {
  return (
    <h2
      id={id}
      className="group mt-14 scroll-mt-24 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0"
    >
      <Anchor id={id}>{children}</Anchor>
    </h2>
  )
}

export function H3({ id, children }: { id: string; children: ReactNode }): JSX.Element {
  return (
    <h3 id={id} className="group mt-10 scroll-mt-24 text-lg font-semibold tracking-tight">
      <Anchor id={id}>{children}</Anchor>
    </h3>
  )
}

/**
 * The heading text, plus a `#` that appears on hover — the usual way to grab a
 * link to a specific section. `scroll-mt` on the heading keeps it clear of the
 * sticky header when you land on it.
 */
function Anchor({ id, children }: { id: string; children: ReactNode }): JSX.Element {
  return (
    <Link href={`#${id}`} className="no-underline">
      {children}
      <span
        aria-hidden
        className="ml-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
      >
        #
      </span>
    </Link>
  )
}

export function P({ children }: { children: ReactNode }): JSX.Element {
  return <p className="mt-5 leading-7 text-pretty">{children}</p>
}

export function UL({ children }: { children: ReactNode }): JSX.Element {
  return <ul className="mt-5 flex list-disc flex-col gap-2 pl-6 leading-7">{children}</ul>
}

export function OL({ children }: { children: ReactNode }): JSX.Element {
  return <ol className="mt-5 flex list-decimal flex-col gap-2 pl-6 leading-7">{children}</ol>
}

export function LI({ children }: { children: ReactNode }): JSX.Element {
  return <li className="pl-1.5 marker:text-muted-foreground">{children}</li>
}

/** Inline code. The one element that shows up in almost every sentence. */
export function C({ children }: { children: ReactNode }): JSX.Element {
  return (
    <code className="rounded border bg-muted/60 px-[0.3em] py-[0.15em] font-mono text-[0.85em]">
      {children}
    </code>
  )
}

/** A link that knows whether it leaves the site, and says so. */
export function A({ href, children, ...props }: ComponentProps<typeof Link>): JSX.Element {
  const external = typeof href === 'string' && href.startsWith('http')

  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className="font-medium underline underline-offset-4 decoration-muted-foreground/40 transition-colors hover:decoration-foreground"
      {...props}
    >
      {children}
    </Link>
  )
}

/** A short aside set apart from the flow, for a definition or a caveat. */
export function Quote({ children }: { children: ReactNode }): JSX.Element {
  return (
    <blockquote className="mt-6 border-l-2 pl-5 text-muted-foreground italic">
      {children}
    </blockquote>
  )
}
