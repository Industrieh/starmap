import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { PackageManagerTabs } from '@/components/docs/package-manager-tabs'
import { A, C, H2, LI, Lead, P, UL } from '@/components/docs/prose'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'install', title: 'Install it', depth: 2 },
  { id: 'core', title: 'It needs the core', depth: 2 },
  { id: 'requirements', title: 'What it needs from you', depth: 2 },
  { id: 'imports', title: 'Importing', depth: 2 },
  { id: 'next', title: 'Next step', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        One package, one dependency — the core. It produces SVG strings, so there is no stylesheet
        to load and no component to mount.
      </Lead>

      <H2 id="install">Install it</H2>
      <PackageManagerTabs packageName="@industrieh/starmap-render" />

      <H2 id="core">It needs the core</H2>
      <P>
        The renderer draws a <C>Galaxy</C>, and only{' '}
        <A href={routes.library('starmap')}>
          <C>@industrieh/starmap</C>
        </A>{' '}
        produces one. So the two are installed together:
      </P>

      <PackageManagerTabs packageName="@industrieh/starmap @industrieh/starmap-render" />

      <P>
        That is the whole dependency tree — the core has none of its own. Two packages in your
        lockfile, and nothing else added on their behalf.
      </P>

      <Callout tone="note" title="Why two packages and not one">
        The core is useful without a picture: a server computing routes, a worker generating
        universes, a test suite. Bundling a renderer into it would ship SVG-building code to every
        one of those. The split is what keeps each of them honest — no colour in the core, no world
        fact in the theme.
      </Callout>

      <H2 id="requirements">What it needs from you</H2>
      <UL>
        <LI>
          <strong>Any JavaScript runtime.</strong> The package never touches the DOM, so it runs on
          a server, in a worker, or in a build script just as well as in a browser.
        </LI>
        <LI>
          <strong>ES modules.</strong> ESM only, with type declarations alongside. No CommonJS
          build.
        </LI>
        <LI>
          <strong>Somewhere to put a string.</strong> That is genuinely all. A file, an{' '}
          <C>innerHTML</C>, an <C>&lt;img src&gt;</C>, a <C>data:</C> URI — see{' '}
          <A href={routes.page('starmap-render', 'framing')}>Framing &amp; embedding</A>.
        </LI>
      </UL>

      <Callout tone="tip" title="No React, no Vue, no anything">
        The package has no peer dependency on a framework, because it does not produce components.
        If you are in React, the output goes in <C>dangerouslySetInnerHTML</C> or an{' '}
        <C>&lt;img&gt;</C> — and that is a feature, not a workaround.
      </Callout>

      <H2 id="imports">Importing</H2>
      <P>
        Everything comes from the package root. The two functions at the top are what most projects
        ever use; the rest is there for when you want to build your own drawing on the same
        primitives.
      </P>

      <CodeBlock
        lang="ts"
        code={`import {
  renderSystem,          // one system → a complete <svg> string
  renderGalaxy,          // the whole map → a complete <svg> string

  renderSystemContent,   // the layers alone, for when you own the <svg>
  renderGalaxyContent,

  systemViewBox,         // the framing those two would have used
  galaxyViewBox,
  viewBoxAttr,

  DEFAULT_THEME,         // the colours, and how to change them
  resolveTheme,

  el, group, text,       // the string primitives, for your own overlays
  type Theme,
  type RenderSystemOptions,
} from '@industrieh/starmap-render'`}
      />

      <H2 id="next">Next step</H2>
      <P>
        The <A href={routes.page('starmap-render', 'quickstart')}>Quickstart</A> takes a galaxy to a
        picture on screen, then makes it move — ten minutes, and every output on it was produced by
        running the code.
      </P>
    </>
  )
}
