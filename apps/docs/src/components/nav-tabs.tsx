'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { JSX } from 'react'

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'
import { NAV_TABS, isTabActive } from '@/lib/routes'
import { cn } from '@/lib/utils'

/**
 * The tabs of the header: the documentation index, then one per library — the
 * move that lets two documentations share one site without either of them
 * feeling like a subsection of the other.
 *
 * A library tab is active for its whole subtree, so it stays lit while you read
 * any page of that library; `/docs` matches exactly, or it would be lit
 * everywhere. Both rules live in `isTabActive`, next to the list itself, because
 * the mobile drawer applies the same ones.
 *
 * A lit tab says `aria-current="page"` only on its own page. Below it, on one of
 * the library's pages, it says `"true"` — the current section — because the page
 * itself is the sidebar link, and two different links both claiming to be the
 * current page is something a screen reader would repeat to its user.
 */
export function NavTabs(): JSX.Element {
  const pathname = usePathname()

  return (
    <NavigationMenu aria-label="Site">
      <NavigationMenuList className="gap-1">
        {NAV_TABS.map((tab) => {
          const active = isTabActive(tab, pathname)

          return (
            <NavigationMenuItem key={tab.href}>
              <Link
                href={tab.href}
                aria-current={pathname === tab.href ? 'page' : active ? 'true' : undefined}
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
                {tab.label}
              </Link>
            </NavigationMenuItem>
          )
        })}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
