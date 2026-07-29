import type { JSX, ReactNode } from 'react'

/**
 * A numbered walkthrough.
 *
 * The counter is CSS, not markup: the numbers come from a counter on the list,
 * so inserting a step in the middle renumbers everything without touching any
 * other step. The vertical rule is a border on the container, cut short by the
 * last item so the line stops at the final marker instead of trailing off.
 */
export function Steps({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="mt-8 [counter-reset:step] [&>*:last-child]:border-transparent [&>*:last-child]:pb-0">
      {children}
    </div>
  )
}

export function Step({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="relative border-l pb-10 pl-9 [counter-increment:step] last:pb-0">
      <span
        aria-hidden
        className="absolute -left-[15px] flex size-[30px] items-center justify-center rounded-full border bg-background font-mono text-xs font-medium text-muted-foreground before:content-[counter(step)]"
      />
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <div className="[&>:first-child]:mt-3">{children}</div>
    </div>
  )
}
