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
import { SidebarProvider } from '@/components/ui/sidebar'
import { NAV_TABS, findLibrary, isTabActive } from '@/lib/routes'
import { cn } from '@/lib/utils'

/**
 * Everything the header hides below `md`: the header tabs, and the pages of
 * whichever library you are currently reading.
 *
 * `SidebarProvider` is here because `DocsNav` is built from the sidebar
 * primitives, and those read the sidebar context. `collapsible="none"` is not
 * involved — inside a Sheet the drawer *is* the container.
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
          <nav className="flex flex-col p-3">
            {NAV_TABS.map((tab) => {
              const active = isTabActive(tab, pathname)

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setOpen(false)}
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
              <SidebarProvider className="min-h-0 w-full">
                <div className="w-full">
                  <DocsNav library={current} onNavigate={() => setOpen(false)} />
                </div>
              </SidebarProvider>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
