'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { JSX } from 'react'

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { routes, type Library } from '@/lib/routes'

/**
 * The list of pages of one library, grouped.
 *
 * It is deliberately the *only* place the sidebar is described, and both the
 * desktop column and the mobile drawer render this same component — a page can
 * never appear in one and not the other.
 */
export function DocsNav({
  library,
  onNavigate,
}: {
  library: Library
  onNavigate?: () => void
}): JSX.Element {
  const pathname = usePathname()
  const overview = routes.library(library.slug)

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === overview}
                render={<Link href={overview} onClick={onNavigate} />}
              >
                Overview
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {library.groups.map((group) => (
        <SidebarGroup key={group.title}>
          <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.pages.map((page) => {
                const href = routes.page(library.slug, page.slug)

                return (
                  <SidebarMenuItem key={page.slug}>
                    <SidebarMenuButton
                      isActive={pathname === href}
                      render={<Link href={href} onClick={onNavigate} />}
                    >
                      {page.title}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}
