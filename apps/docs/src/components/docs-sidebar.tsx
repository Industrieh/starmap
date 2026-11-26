'use client'

import { usePathname } from 'next/navigation'
import type { JSX } from 'react'

import { DocsNav } from '@/components/docs-nav'
import { findLibrary } from '@/lib/routes'

/**
 * The desktop column: sticky under the header, scrolling on its own past the
 * fold.
 *
 * It used to be shadcn's `Sidebar` with `collapsible="none"` — which renders a
 * plain block anyway, but needs `SidebarProvider` around it, and the provider
 * installs a window-wide Ctrl/Cmd+B handler (the browser's bookmark shortcut)
 * and writes a cookie, both to toggle a column that cannot collapse. Two plain
 * elements carry the same geometry without either.
 *
 * The outer one is a flex item of the docs layout, so it stretches to the full
 * height of the page; that is what gives the inner, sticky one room to stick.
 *
 * Which library it shows is read from the URL rather than passed down, so no
 * layout has to thread it through.
 */
export function DocsSidebar(): JSX.Element | null {
  const pathname = usePathname()
  const library = findLibrary(pathname.split('/')[2] ?? '')

  if (!library) return null

  return (
    <div className="hidden md:block">
      <div className="sticky top-(--header-height) flex h-[calc(100svh-var(--header-height))] w-64 flex-col overflow-y-auto py-8 pr-6 text-sidebar-foreground">
        <DocsNav library={library} className="gap-6" />
      </div>
    </div>
  )
}
