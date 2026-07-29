import type { JSX, ReactNode } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

/**
 * One export of the public API: its signature, what it takes, what it gives
 * back, what it throws, and an example you can paste.
 *
 * Every section is optional except the signature — a type alias has no
 * parameters and a pure function throws nothing, and printing empty headings
 * for them would be noise.
 */

export type ApiParam = {
  name: string
  type: string
  description: ReactNode
}

export function ApiEntry({
  id,
  name,
  kind,
  signature,
  summary,
  params,
  returns,
  throws,
  example,
  children,
}: {
  id: string
  name: string
  kind: 'function' | 'type' | 'interface' | 'class' | 'constant'
  signature: string
  summary: ReactNode
  params?: ApiParam[]
  returns?: ReactNode
  throws?: ReactNode
  example?: string
  /** Anything else worth saying — caveats, complexity, related entries. */
  children?: ReactNode
}): JSX.Element {
  return (
    <section id={id} className="mt-14 scroll-mt-24 first:mt-0">
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 className="font-mono text-lg font-semibold tracking-tight">{name}</h3>
        <Badge variant="secondary" className="font-mono text-[0.7rem]">
          {kind}
        </Badge>
      </div>

      <div className="mt-3 text-pretty text-muted-foreground">{summary}</div>

      <CodeBlock code={signature} lang="ts" className="mt-4" noCopy />

      {params?.length ? (
        <>
          <h4 className="mt-6 text-sm font-medium">Parameters</h4>
          <dl className="mt-3 flex flex-col gap-3">
            {params.map((param) => (
              <div key={param.name} className="flex flex-col gap-1 border-l-2 pl-4">
                <dt className="font-mono text-sm">
                  {param.name}
                  <span className="ml-2 text-muted-foreground">{param.type}</span>
                </dt>
                <dd className="text-sm leading-6 text-muted-foreground">{param.description}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}

      {returns ? (
        <>
          <h4 className="mt-6 text-sm font-medium">Returns</h4>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">{returns}</div>
        </>
      ) : null}

      {throws ? (
        <>
          <h4 className="mt-6 text-sm font-medium">Throws</h4>
          <div className="mt-2 text-sm leading-6 text-muted-foreground">{throws}</div>
        </>
      ) : null}

      {children}

      {example ? <CodeBlock code={example} lang="ts" className="mt-6" /> : null}

      <Separator className="mt-10" />
    </section>
  )
}
