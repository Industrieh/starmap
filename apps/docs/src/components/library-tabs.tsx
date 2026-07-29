'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { JSX } from 'react'

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'
import { LIBRARIES, routes } from '@/lib/routes'
import { cn } from '@/lib/utils'

/**
 * One tab per library — the move that lets two documentations share one site
 * without either of them feeling like a subsection of the other.
 *
 * A tab is active for its whole subtree, so it stays lit while you read any page
 * of that library.
 */
export function LibraryTabs(): JSX.Element {
  const pathname = usePathname()

  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-1">
        {LIBRARIES.map((library) => {
          const href = routes.library(library.slug)
          const active = pathname === href || pathname.startsWith(`${href}/`)

          return (
            <NavigationMenuItem key={library.slug}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  // The tab is exactly as tall as the bar, not one pixel less.
                  // At `h-12` it was centred in a 56px bar, so the underline
                  // below sat 4px short of the bottom border and floated.
                  'relative flex h-(--header-height) items-center px-3 text-sm transition-colors',
                  'after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-transparent',
                  active
                    ? 'text-foreground after:bg-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {library.name}
              </Link>
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
