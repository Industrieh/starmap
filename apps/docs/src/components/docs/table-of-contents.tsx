'use client'

import { useEffect, useState, type JSX } from 'react'

import type { TocEntry } from '@/content/registry'
import { cn } from '@/lib/utils'

/**
 * "On this page", in the right gutter.
 *
 * The active entry is tracked with an `IntersectionObserver` rather than a
 * scroll listener: the browser does the work off the main thread, and it fires
 * only when a heading actually crosses the band we care about.
 *
 * That band — `-88px 0px -70% 0px` — is the top of the reading area, below the
 * sticky header. A heading counts as "current" from the moment it reaches that
 * line until the next one does, which is what a reader means by *where am I*.
 */
export function TableOfContents({ entries }: { entries: readonly TocEntry[] }): JSX.Element | null {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (entries.length === 0) return

    const headings = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((element) => element !== null)

    const observer = new IntersectionObserver(
      (records) => {
        const visible = records.filter((record) => record.isIntersecting)
        if (visible.length === 0) return

        // Several headings can cross the band at once on a fast scroll; the
        // topmost one is the section you are actually in.
        const top = visible.reduce((best, record) =>
          record.boundingClientRect.top < best.boundingClientRect.top ? record : best,
        )
        setActiveId(top.target.id)
      },
      { rootMargin: '-88px 0px -70% 0px', threshold: 0 },
    )

    for (const heading of headings) observer.observe(heading)
    return () => observer.disconnect()
  }, [entries])

  if (entries.length === 0) return null

  return (
    <nav aria-label="On this page" className="flex flex-col gap-3">
      <p className="text-sm font-medium">On this page</p>
      <ul className="flex flex-col gap-2.5 border-l">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              aria-current={activeId === entry.id ? 'location' : undefined}
              className={cn(
                '-ml-px block border-l pl-4 text-sm leading-snug transition-colors',
                entry.depth === 3 && 'pl-7',
                activeId === entry.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {entry.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
