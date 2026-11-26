'use client'

import { MenuIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type JSX } from 'react'

import { DocsNav } from '@/components/docs-nav'
import { SiteMark } from '@/components/site-logo'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { NAV_TABS, findLibrary, isTabActive } from '@/lib/routes'
import { cn } from '@/lib/utils'

/**
 * Everything the header hides below `md`: the header tabs, and the pages of
 * whichever library you are currently reading — the same `DocsNav` the desktop
 * column renders, so the two cannot list different pages.
 */
export function MobileNav(): JSX.Element {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const current = findLibrary(pathname.split('/')[2] ?? '')

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open navigation">
            <MenuIcon />
          </Button>
        }
      />
      <SheetContent side="left" className="w-[19rem] p-0">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2 text-left">
            <SiteMark />
            starmap
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto pb-8">
          <nav aria-label="Site" className="flex flex-col p-3">
            {NAV_TABS.map((tab) => {
              const active = isTabActive(tab, pathname)

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setOpen(false)}
                  // `page` only on the exact page: a library tab is lit for its
                  // whole subtree, but only one link is the current page.
                  aria-current={pathname === tab.href ? 'page' : active ? 'true' : undefined}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>

          {current ? (
            <>
              <Separator />
              <DocsNav library={current} onNavigate={() => setOpen(false)} />
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
