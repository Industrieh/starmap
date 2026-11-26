/**
 * A message in place of the explorer: an empty galaxy, or one that failed to
 * build.
 *
 * It spans the rows the header, the drawing and the inspector would have
 * taken, so the toolbar above it stays usable — type another seed and the
 * message goes away.
 */

import type { JSX, ReactNode } from 'react'

export interface NoticeProps {
  title: string
  /** `alert` for an error, which a screen reader announces at once; `status` otherwise. */
  role: 'alert' | 'status'
  children: ReactNode
}

export function Notice({ title, role, children }: NoticeProps): JSX.Element {
  return (
    <section
      role={role}
      className="col-span-full row-span-3 min-h-0 overflow-y-auto rounded-xl border border-line bg-panel p-5 shadow-panel"
    >
      <h2 className="mb-2 text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}
