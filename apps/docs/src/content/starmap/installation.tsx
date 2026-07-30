import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { PackageManagerTabs } from '@/components/docs/package-manager-tabs'
import { A, C, H2, LI, Lead, P, UL } from '@/components/docs/prose'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'install', title: 'Install it', depth: 2 },
  { id: 'requirements', title: 'What it needs from you', depth: 2 },
  { id: 'imports', title: 'Importing', depth: 2 },
  { id: 'no-bundler', title: 'Without a bundler', depth: 2 },
  { id: 'next', title: 'Next step', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        One package, no dependencies. If your project already builds TypeScript or modern
        JavaScript, there is nothing else to set up.
      </Lead>

      <H2 id="install">Install it</H2>
      <PackageManagerTabs packageName="@industrieh/starmap" />

      <P>
        That is the whole installation. The package pulls nothing else in — you can check the
        lockfile afterwards and find it alone.
      </P>

      <H2 id="requirements">What it needs from you</H2>
      <P>
        Very little, and deliberately so. The library is pure logic: it never touches the DOM, never
        reaches for <C>window</C>, and never calls <C>Math.random()</C>.
      </P>

      <UL>
        <LI>
          <strong>Any JavaScript runtime.</strong> Browser, Node, Bun, Deno, a Web Worker, a server,
          React Native, or inside a game engine. The same code runs everywhere.
        </LI>
        <LI>
          <strong>ES modules.</strong> The package ships ESM only, with type declarations alongside.
          There is no CommonJS build.
        </LI>
        <LI>
          <strong>TypeScript 5 or later</strong>, if you use TypeScript. It is optional — the
          library is plain JavaScript at runtime — but the types are most of what makes it pleasant,
          so it would be a shame.
        </LI>
      </UL>

      <Callout tone="note" title="No build step of your own">
        The package ships pre-built. You do not need a compiler, a plugin, or a loader to consume
        it: your bundler treats it like any other ESM dependency.
      </Callout>

      <H2 id="imports">Importing</H2>
      <P>
        Everything comes from the package root. There are no sub-paths to remember, and the exports
        are named so your bundler can drop what you do not use.
      </P>

      <CodeBlock
        lang="ts"
        code={`import {
  createGalaxy,          // build a universe from a description
  validateGalaxy,        // check one you read back from disk
  indexGalaxy,           // id → object, for lookups
  findRoute,             // shortest path between two systems
  systemPositions,       // where everything is at time t
  createRng,             // deterministic randomness
  type Galaxy,           // the data contract
  type GalaxyInput,      // what you pass in
} from '@industrieh/starmap'`}
      />

      <P>
        Types are exported next to the functions, so <C>{`import type { Galaxy }`}</C> works the
        same way. The two you will reach for most are <C>GalaxyInput</C>, which describes what you
        write, and <C>Galaxy</C>, which describes what you get back.
      </P>

      <H2 id="no-bundler">Without a bundler</H2>
      <P>
        Because it is dependency-free ESM, the library also loads straight from a CDN — handy for a
        sketch, a CodePen, or a quick check that an idea holds.
      </P>

      <CodeBlock
        lang="ts"
        filename="index.html"
        code={`<script type="module">
  import { createGalaxy } from 'https://esm.sh/@industrieh/starmap'

  const galaxy = createGalaxy({
    systems: [{ id: 'sol', name: 'Sol', x: 0, y: 0, star: { radius: 18 } }],
  })

  console.log(galaxy.meta.systemCount) // 1
</script>`}
      />

      <Callout tone="tip" title="Pin the version in production">
        A bare CDN URL follows the latest release, which is exactly what you do not want in
        something you ship. Add the version — <C>@industrieh/starmap@0.1.0</C> — once the sketch
        becomes real.
      </Callout>

      <H2 id="next">Next step</H2>
      <P>
        Installed. The <A href={routes.page('starmap', 'quickstart')}>Quickstart</A> builds a small
        universe from nothing, then queries it — about fifteen minutes, and you will have touched
        every part of the library that matters.
      </P>
    </>
  )
}
