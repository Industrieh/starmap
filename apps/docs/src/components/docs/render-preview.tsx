import type { JSX, ReactNode } from 'react'

import { CodeBlock } from '@/components/code-block'
import { cn } from '@/lib/utils'

/**
 * A drawing produced by the renderer, shown as itself.
 *
 * The SVG is generated while the page is prerendered — the same call the code
 * above it shows — so what a reader sees is the real output rather than a
 * screenshot that will drift. Nothing here runs in the browser.
 *
 * `dangerouslySetInnerHTML` is the right tool and not a risk: the string comes
 * from our own fixture at build time, and the renderer escapes every name it is
 * given anyway. There is no user input on this path at all.
 *
 * Every drawing takes an `alt`, for the same reason an `<img>` does: the frame
 * is announced as one image with that name, rather than skipped — or read out
 * as a run of planet labels in document order. A drawing rendered with a
 * `title` already names itself (`role="img"` and a `<title>` child), and then
 * keeps its own name: wrapping it would hide the very thing the Framing page
 * demonstrates.
 */

/**
 * Props that name a drawing, unless its markup already does — for the element
 * that wraps the injected `<svg>`.
 *
 * `role="img"` on a `div` is deliberate. The drawing is inline markup, not a
 * file an `<img>` could point at, and turning every one into a `data:` URI would
 * add a third to the weight of pages that are already mostly SVG.
 */
export function drawingName(svg: string, alt: string): { role?: 'img'; 'aria-label'?: string } {
  return svg.includes('<title>') ? {} : { role: 'img', 'aria-label': alt }
}

/**
 * The frame takes the shape of the drawing inside it.
 *
 * A drawing is letterboxed by `preserveAspectRatio` when its box does not match
 * the space it is given, and a square system in a 312×224 frame was rendering at
 * 198px with 44px of wasted background down each side. Reading the ratio out of
 * the `viewBox` and giving it to the frame removes the letterboxing entirely, so
 * a drawing is always as large as its column allows.
 *
 * @returns width ÷ height, or `1` if the string carries no usable `viewBox`.
 */
export function aspectOf(svg: string): number {
  const match = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg)
  if (!match) return 1

  const width = Number(match[3])
  const height = Number(match[4])
  return height > 0 && width > 0 ? width / height : 1
}

export type RenderPreviewProps = {
  /** The drawing itself, already rendered. */
  svg: string
  /** What the drawing shows, for a screen reader. */
  alt: string
  /** The call that produced it. Omit for a bare picture. */
  code?: string
  /** A line under the frame — what to look at, usually. */
  caption?: ReactNode
  /**
   * How tall the frame is allowed to get. The shape comes from the drawing, so
   * this only caps a tall one; a wide one is limited by the column instead.
   */
  height?: 'sm' | 'md' | 'lg'
  className?: string
}

/** Caps, not heights — see `height` above. */
const MAX_HEIGHTS = {
  sm: 'max-h-64',
  md: 'max-h-[28rem]',
  lg: 'max-h-[38rem]',
} as const

export function RenderPreview({
  svg,
  alt,
  code,
  caption,
  height = 'lg',
  className,
}: RenderPreviewProps): JSX.Element {
  return (
    <figure className={cn('mt-6', className)}>
      {/* Joined to the frame below it — no margin, no rounded corners where they
          meet — because the code and its output are one statement. */}
      {code ? <CodeBlock code={code} lang="ts" className="rounded-b-none border-b-0" /> : null}

      <div
        style={{ aspectRatio: aspectOf(svg) }}
        className={cn(
          'mx-auto flex w-full items-center justify-center overflow-hidden rounded-xl border bg-muted/20',
          code && 'mt-0 rounded-t-none',
          MAX_HEIGHTS[height],
        )}
      >
        {/* The drawing carries its own background, so it needs no styling of its
            own — only a box shaped like it. `[&>svg]` reaches the root element
            the renderer emitted. */}
        <div
          {...drawingName(svg, alt)}
          className="size-full [&>svg]:size-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {caption ? (
        <figcaption className="mt-2.5 text-sm text-muted-foreground">{caption}</figcaption>
      ) : null}
    </figure>
  )
}

/** Two drawings next to each other, for a before/after or a light/dark pair. */
export function RenderCompare({
  left,
  right,
  className,
}: {
  left: { svg: string; alt: string; label: ReactNode }
  right: { svg: string; alt: string; label: ReactNode }
  className?: string
}): JSX.Element {
  return (
    <div className={cn('mt-6 grid gap-4 sm:grid-cols-2', className)}>
      {[
        { ...left, side: 'left' },
        { ...right, side: 'right' },
      ].map((side) => (
        <figure key={side.side}>
          <div
            style={{ aspectRatio: aspectOf(side.svg) }}
            className="flex w-full items-center justify-center overflow-hidden rounded-xl border bg-muted/20"
          >
            <div
              {...drawingName(side.svg, side.alt)}
              className="size-full [&>svg]:size-full"
              dangerouslySetInnerHTML={{ __html: side.svg }}
            />
          </div>
          <figcaption className="mt-2.5 text-sm text-muted-foreground">{side.label}</figcaption>
        </figure>
      ))}
    </div>
  )
}
