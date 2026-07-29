import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * The same command, spelled four ways.
 *
 * Bun comes first because it is what this repository uses, but a reader on npm
 * should not have to translate. The blocks are highlighted on the server like
 * every other one; only the tab switching is client-side.
 */

const MANAGERS = [
  { id: 'bun', label: 'bun', command: (pkg: string) => `bun add ${pkg}` },
  { id: 'npm', label: 'npm', command: (pkg: string) => `npm install ${pkg}` },
  { id: 'pnpm', label: 'pnpm', command: (pkg: string) => `pnpm add ${pkg}` },
  { id: 'yarn', label: 'yarn', command: (pkg: string) => `yarn add ${pkg}` },
] as const

export function PackageManagerTabs({ packageName }: { packageName: string }): JSX.Element {
  return (
    <Tabs defaultValue="bun" className="mt-6 gap-3">
      <TabsList>
        {MANAGERS.map((manager) => (
          <TabsTrigger key={manager.id} value={manager.id}>
            {manager.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {MANAGERS.map((manager) => (
        <TabsContent key={manager.id} value={manager.id}>
          <CodeBlock code={manager.command(packageName)} lang="bash" />
        </TabsContent>
      ))}
    </Tabs>
  )
}
