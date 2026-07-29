import Link from 'next/link'
import type { JSX } from 'react'

import { LibraryTabs } from '@/components/library-tabs'
import { MobileNav } from '@/components/mobile-nav'
import { ModeToggle } from '@/components/mode-toggle'
import { SiteLogo } from '@/components/site-logo'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { routes } from '@/lib/routes'

/**
 * One bar, on every page. Logo, the two libraries, and the two controls a
 * reader actually uses.
 *
 * It is `sticky` rather than `fixed`: the docs sidebar sits under it and needs
 * to know its height, which `--header-height` in `globals.css` states once.
 */
export function SiteHeader(): JSX.Element {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex h-(--header-height) max-w-screen-xl items-center gap-2 px-4 sm:px-6">
        <MobileNav />
        <SiteLogo />

        <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />

        <div className="hidden md:flex">
          <LibraryTabs />
        </div>

        <div className="ml-auto flex items-center gap-1">
          {/* `nativeButton={false}` because this renders an `<a>`: Base UI
              assumes a real `<button>` otherwise and says so, loudly. */}
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            className="hidden sm:inline-flex"
            render={
              <Link href={routes.github} target="_blank" rel="noreferrer">
                GitHub
              </Link>
            }
          />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
