'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useId, type JSX } from 'react'

import { routes, type Library } from '@/lib/routes'
import { cn } from '@/lib/utils'

/**
 * The list of pages of one library, grouped.
 *
 * It is deliberately the *only* place the sidebar is described, and both the
 * desktop column and the mobile drawer render this same component — a page can
 * never appear in one and not the other.
 *
 * Plain markup rather than shadcn's `Sidebar` primitives. Those read a context
 * that only `SidebarProvider` supplies, and the provider brings along what a
 * fixed column does not want: a global Ctrl/Cmd+B handler — the browser's own
 * bookmark shortcut, swallowed to toggle a sidebar that cannot collapse — and a
 * cookie to remember that state. The classes below are the primitives' own, so
 * nothing changes on screen.
 */

/** A group of links: the padding of `SidebarGroup`. */
const GROUP = 'relative flex w-full min-w-0 flex-col p-2'

/** A group's heading: `SidebarGroupLabel`. */
const LABEL =
  'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70'

/**
 * One link: `SidebarMenuButton`, with its active style keyed on `aria-current`
 * instead of a data attribute — the state a screen reader announces is then the
 * very one that is styled, and the two cannot disagree.
 */
const LINK = cn(
  'flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm',
  'ring-sidebar-ring outline-hidden focus-visible:ring-2',
  'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
  'active:bg-sidebar-accent active:text-sidebar-accent-foreground',
  'aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-sidebar-accent-foreground',
)

export function DocsNav({
  library,
  onNavigate,
  className,
}: {
  library: Library
  onNavigate?: () => void
  className?: string
}): JSX.Element {
  const pathname = usePathname()
  const overview = routes.library(library.slug)
  // The desktop column and the drawer can both be mounted at once, so the ids
  // that tie a list to its heading are per instance.
  const id = useId()

  return (
    <nav aria-label={`${library.name} documentation`} className={cn('flex flex-col', className)}>
      <div className={GROUP}>
        <ul className="flex w-full min-w-0 flex-col text-sm">
          <li>
            <Link
              href={overview}
              onClick={onNavigate}
              aria-current={pathname === overview ? 'page' : undefined}
              className={LINK}
            >
              Overview
            </Link>
          </li>
        </ul>
      </div>

      {library.groups.map((group, index) => {
        const labelId = `${id}-group-${index}`

        return (
          <div key={group.title} className={GROUP}>
            <p id={labelId} className={LABEL}>
              {group.title}
            </p>
            <ul aria-labelledby={labelId} className="flex w-full min-w-0 flex-col text-sm">
              {group.pages.map((page) => {
                const href = routes.page(library.slug, page.slug)

                return (
                  <li key={page.slug}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={pathname === href ? 'page' : undefined}
                      className={LINK}
                    >
                      {page.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}
