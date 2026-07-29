import Link from 'next/link'
import type { JSX } from 'react'

import { routes } from '@/lib/routes'
import { cn } from '@/lib/utils'

/**
 * The mark: a star and two bodies on their orbit, drawn rather than imported so
 * it inherits `currentColor` and needs no dark-mode variant.
 */
export function SiteMark({ className }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-5', className)}>
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.35"
        transform="rotate(-20 12 12)"
      />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <circle cx="21" cy="9" r="1.6" fill="currentColor" />
      <circle cx="3.4" cy="15.2" r="1.1" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

export function SiteLogo(): JSX.Element {
  return (
    <Link
      href={routes.home}
      className="flex items-center gap-2 font-medium tracking-tight transition-opacity hover:opacity-70"
    >
      <SiteMark />
      starmap
    </Link>
  )
}
