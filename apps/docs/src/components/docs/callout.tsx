import { AlertTriangleIcon, InfoIcon, LightbulbIcon, OctagonAlertIcon } from 'lucide-react'
import type { JSX, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * The aside that carries what a paragraph should not: a caveat, a shortcut, a
 * trap. Four tones, no more — a palette of eight would only make readers guess
 * at the difference.
 */

const TONES = {
  note: {
    icon: InfoIcon,
    label: 'Note',
    className: 'border-border bg-muted/40',
    iconClassName: 'text-muted-foreground',
  },
  tip: {
    icon: LightbulbIcon,
    label: 'Tip',
    className: 'border-emerald-500/25 bg-emerald-500/[0.06]',
    iconClassName: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    icon: AlertTriangleIcon,
    label: 'Careful',
    className: 'border-amber-500/30 bg-amber-500/[0.07]',
    iconClassName: 'text-amber-600 dark:text-amber-400',
  },
  danger: {
    icon: OctagonAlertIcon,
    label: 'Do not',
    className: 'border-destructive/30 bg-destructive/[0.06]',
    iconClassName: 'text-destructive',
  },
} as const

export type CalloutTone = keyof typeof TONES

export function Callout({
  tone = 'note',
  title,
  children,
}: {
  tone?: CalloutTone
  /** Overrides the default label. Keep it to a few words. */
  title?: string
  children: ReactNode
}): JSX.Element {
  const { icon: Icon, label, className, iconClassName } = TONES[tone]

  return (
    <div className={cn('mt-6 flex gap-3 rounded-lg border p-4', className)}>
      <Icon className={cn('mt-0.5 size-4 shrink-0', iconClassName)} aria-hidden />
      <div className="min-w-0 flex-1 text-sm leading-6">
        <p className="font-medium">{title ?? label}</p>
        <div className="mt-1 text-muted-foreground [&>p]:mt-2 [&>p:first-child]:mt-0">
          {children}
        </div>
      </div>
    </div>
  )
}
