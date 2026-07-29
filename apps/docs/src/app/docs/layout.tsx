import type { JSX, ReactNode } from 'react'

import { DocsSidebar } from '@/components/docs-sidebar'

/**
 * The reading layout: a fixed column of links on the left, the page on the
 * right, and nothing else competing for attention.
 *
 * The sidebar only exists from `md` up; below that the same links live in the
 * header's drawer, so there is one navigation and two presentations of it.
 */
export default function DocsLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-screen-xl px-4 sm:px-6">
      <DocsSidebar />
      <main className="min-w-0 flex-1 py-10 md:pl-10 lg:pl-14">{children}</main>
    </div>
  )
}
