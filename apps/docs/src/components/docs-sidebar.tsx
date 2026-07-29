'use client'

import { usePathname } from 'next/navigation'
import type { JSX } from 'react'

import { DocsNav } from '@/components/docs-nav'
import { Sidebar, SidebarContent, SidebarProvider } from '@/components/ui/sidebar'
import { findLibrary } from '@/lib/routes'

/**
 * The desktop column.
 *
 * `collapsible="none"` on purpose: the collapsible variants position themselves
 * against the viewport, which fights the sticky header above. With `none` the
 * component renders a plain block and this file owns the geometry — sticky under
 * the header, scrolling on its own past the fold.
 *
 * Which library it shows is read from the URL rather than passed down, so no
 * layout has to thread it through.
 */
export function DocsSidebar(): JSX.Element | null {
  const pathname = usePathname()
  const library = findLibrary(pathname.split('/')[2] ?? '')

  if (!library) return null

  return (
    <SidebarProvider className="hidden min-h-0 w-auto md:block">
      <Sidebar
        collapsible="none"
        className="sticky top-(--header-height) h-[calc(100svh-var(--header-height))] w-64 overflow-y-auto border-r-0 bg-transparent py-8 pr-6"
      >
        <SidebarContent className="gap-6">
          <DocsNav library={library} />
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  )
}
