import type { JSX } from 'react'
import { createHighlighter, type BundledLanguage, type Highlighter } from 'shiki'

import { CopyButton } from '@/components/docs/copy-button'
import { cn } from '@/lib/utils'

/**
 * Syntax highlighting, done at build time.
 *
 * This is a Server Component: Shiki runs while the page is being prerendered and
 * what reaches the browser is plain coloured HTML — **no highlighter in the
 * client bundle**, and no flash of unstyled code. The copy button is the one
 * interactive part, and the only thing that ships as client JavaScript.
 *
 * The two themes are emitted at once. Shiki writes the light colour inline and
 * the dark one as a `--shiki-dark` custom property on every token; the rule in
 * `globals.css` swaps them under `.dark`. That is why the code follows the theme
 * toggle without a single line of JavaScript.
 */

const LANGUAGES = [
  'ts',
  'tsx',
  'bash',
  'json',
  'md',
  'xml',
] as const satisfies readonly BundledLanguage[]

/**
 * One highlighter for the whole build rather than one per page. Creating it
 * loads grammars and themes, which is the expensive part; `codeToHtml` on an
 * existing instance is not.
 */
let cached: Promise<Highlighter> | undefined

function highlighter(): Promise<Highlighter> {
  cached ??= createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: [...LANGUAGES],
  })

  return cached
}

export type CodeBlockProps = {
  code: string
  lang?: (typeof LANGUAGES)[number]
  /** Shown in the window chrome above the code. Omit for a bare block. */
  filename?: string
  /** Hides the copy button — for snippets that are illustrative, not runnable. */
  noCopy?: boolean
  className?: string
}

export async function CodeBlock({
  code,
  lang = 'ts',
  filename,
  noCopy,
  className,
}: CodeBlockProps): Promise<JSX.Element> {
  const trimmed = code.trim()
  const shiki = await highlighter()
  const html = shiki.codeToHtml(trimmed, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
  })

  return (
    <div className={cn('group relative overflow-hidden rounded-xl border bg-muted/30', className)}>
      {filename ? (
        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="size-2.5 rounded-full bg-muted-foreground/25" />
          <span className="ml-2 font-mono text-xs text-muted-foreground">{filename}</span>
        </div>
      ) : null}

      {!noCopy ? (
        // Always present so the layout never shifts. Revealed on hover, and
        // visible whenever focus is inside the block, so it stays reachable by
        // keyboard — and always visible on a device that cannot hover at all,
        // where "on hover" would mean never.
        <CopyButton
          value={trimmed}
          className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        />
      ) : null}

      {/* Shiki returns a full `<pre class="shiki">…`, already escaped. The
          typography is set on the wrapper so the theme only decides colours. */}
      <div
        className="overflow-x-auto p-5 font-mono text-[0.8125rem] leading-relaxed [&_pre]:bg-transparent"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
