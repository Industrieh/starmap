import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { PropsTable } from '@/components/docs/props-table'
import { A, C, H2, H3, LI, Lead, P, Quote, UL } from '@/components/docs/prose'
import { Step, Steps } from '@/components/docs/steps'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'setup', title: 'Get set up', depth: 2 },
  { id: 'commands', title: 'The commands', depth: 2 },
  { id: 'house-rule', title: 'The house rule', depth: 2 },
  { id: 'belongs', title: 'What belongs here', depth: 2 },
  { id: 'checklists', title: 'Checklists', depth: 2 },
  { id: 'look', title: 'Change how an object looks', depth: 3 },
  { id: 'colour', title: 'Add a colour', depth: 3 },
  { id: 'option', title: 'Add a render option', depth: 3 },
  { id: 'object', title: 'Add a drawable object', depth: 3 },
  { id: 'primitives', title: 'Touch the string primitives', depth: 3 },
  { id: 'looking', title: 'Looking at what you changed', depth: 2 },
  { id: 'tests', title: 'Writing tests', depth: 2 },
  { id: 'comments', title: 'Comments and docs', depth: 2 },
  { id: 'style', title: 'Style', depth: 2 },
  { id: 'sending', title: 'Sending a change', depth: 2 },
  { id: 'bugs', title: 'Reporting a bug', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        Thanks for taking the time. Everything below is specific to the renderer — the core has{' '}
        <A href={routes.library('starmap')}>its own guide</A>, and most of what makes a change good
        here comes down to one thing: a visual change needs eyes on it.
      </Lead>

      <H2 id="setup">Get set up</H2>
      <CodeBlock
        lang="bash"
        code={`git clone git@github.com:Industrieh/starmap.git
cd starmap
bun install
bun run check`}
      />

      <P>
        <A href="https://bun.com">Bun</A> is the only thing you need installed — <C>bun install</C>{' '}
        resolves the whole workspace.
      </P>

      <Callout tone="tip" title="You never have to build the core first">
        This package depends on the core through <C>workspace:*</C>, and its tests alias{' '}
        <C>@cotontigeh/starmap</C> to the core&apos;s <strong>sources</strong>. Change something in
        the core and the renderer&apos;s tests see it immediately.
      </Callout>

      <H2 id="commands">The commands</H2>
      <PropsTable
        rows={[
          {
            name: 'bun run test',
            type: 'from the package',
            description: 'Vitest, this package only.',
          },
          {
            name: 'bun run test:watch',
            type: 'from the package',
            description: 'The same, in watch mode.',
          },
          { name: 'bun run typecheck', type: 'from the package', description: 'tsc --noEmit.' },
          {
            name: 'bun run build',
            type: 'from the package',
            description: 'Typecheck, then build dist/ with tsdown.',
          },
          {
            name: 'bun run check',
            type: 'from the root',
            description: 'Format, lint, types and tests over everything. Run it before you push.',
          },
        ]}
      />

      <H2 id="house-rule">The house rule</H2>
      <Quote>
        <C>src/</C> imports <C>@cotontigeh/starmap</C>, or something relative. Nothing else.
      </Quote>

      <P>
        No DOM, no framework, no stylesheet, no clock, no unseeded randomness, no <C>.tsx</C>, no{' '}
        <C>.css</C>. A purity test checks every source file, and the TypeScript config drops{' '}
        <C>DOM</C> from <C>lib</C> — so a stray <C>document.</C> does not even compile.
      </P>

      <P>Two consequences worth stating on their own.</P>

      <P>
        <strong>A drawing is a pure function of its arguments.</strong> Same data, same <C>t</C>,
        same theme, same string — byte for byte. That is what lets a caller cache it, diff it or
        snapshot it, and it is why <C>Math.random()</C> and <C>Date.now()</C> are banned rather than
        discouraged.
      </P>

      <P>
        <strong>The package returns strings and never touches the page.</strong> If a change needs
        an element, a listener or a stylesheet, it belongs in the application — and the
        package&apos;s job is to give it the hooks it needs, which today are <C>data-id</C>,{' '}
        <C>data-kind</C> and <C>data-layer</C>.
      </P>

      <H2 id="belongs">What belongs here</H2>
      <PropsTable
        rows={[
          {
            name: 'Drawing',
            type: 'belongs here',
            description: 'Shapes, layers, framing, colours.',
          },
          {
            name: 'Interaction',
            type: 'does not',
            description:
              'Pan, zoom, selection, hover, the clock — application state, handled differently by every project. The package draws one frame for one moment.',
          },
          {
            name: 'Anything about the world',
            type: 'does not',
            description: (
              <>
                If a value describes the universe rather than its picture, it goes in the{' '}
                <A href={routes.page('starmap', 'data-model')}>core&apos;s data model</A>. This
                package reads the model; it never asks for a field to be added to it for the sake of
                a drawing.
              </>
            ),
          },
        ]}
      />

      <Callout tone="note" title="The line, in one sentence">
        No colour in the core, and no world fact in the theme. That is the reason the two packages
        are separate.
      </Callout>

      <H2 id="checklists">Checklists</H2>
      <P>
        Read the code first, in this order:{' '}
        <A href={routes.page('starmap-render', 'architecture')}>Architecture</A> for the module map,{' '}
        <A href={routes.page('starmap-render', 'drawing')}>Drawing</A> for what each object is made
        of, <A href={routes.page('starmap-render', 'theming')}>Theming</A> for the colours. Then the
        sources: <C>svg.ts</C>, <C>theme.ts</C>, <C>geometry.ts</C>, <C>root.ts</C>,{' '}
        <C>system.ts</C>, <C>galaxy.ts</C>.
      </P>

      <H3 id="look">Change how an object looks</H3>
      <Steps>
        <Step title="Edit the draw function">
          <P>
            <C>src/core/system.ts</C> or <C>galaxy.ts</C>, the matching <C>draw*</C>.
          </P>
        </Step>
        <Step title="Look at it">
          <P>
            <A href="#looking">Below.</A> A visual change needs eyes on it, not only a green test
            run.
          </P>
        </Step>
        <Step title="Assert on what must be true">
          <P>
            In <C>tests/system.test.ts</C> — that a ring is there, that an id is there. Not on the
            exact markup.
          </P>
        </Step>
        <Step title="Update the description">
          <P>
            <C>docs/drawing.md</C>, if the construction changed.
          </P>
        </Step>
      </Steps>

      <Callout tone="warning" title="Sizes go through the file's Scale">
        <C>u</C>, <C>k</C>, <C>font</C> — never absolute units. A drawing has to hold up in a system
        300 units across and in one 30 000 units across.
      </Callout>

      <H3 id="colour">Add a colour</H3>
      <UL>
        <LI>
          <C>src/core/theme.ts</C> — add it to <strong>both</strong> <C>Theme</C> and{' '}
          <C>ThemeInput</C>, and give it a value in <C>DEFAULT_THEME</C>.
        </LI>
        <LI>Use it in the drawing.</LI>
        <LI>
          <C>docs/theming.md</C> — add the row, and the value in the defaults block.
        </LI>
      </UL>
      <P>
        A new <em>keyed table</em> also needs merging in <C>resolveTheme()</C> and a required{' '}
        <C>default</C> entry.
      </P>

      <H3 id="option">Add a render option</H3>
      <UL>
        <LI>
          The options interface in <C>system.ts</C> or <C>galaxy.ts</C>, with a <C>@default</C> tag.
        </LI>
        <LI>
          The destructuring at the top of <C>renderXContent()</C>, with the default value.
        </LI>
        <LI>One test that it does something, one that the default is unchanged.</LI>
        <LI>
          The option table in <C>README.md</C>.
        </LI>
      </UL>
      <P>
        An option that only some drawings honour is a smell. If it applies to both, put it in both.
      </P>

      <H3 id="object">Add a drawable object</H3>
      <UL>
        <LI>
          A <C>draw*</C> function returning a string, and its place in the layer order — order{' '}
          <em>is</em> the composition, SVG has no <C>z-index</C>.
        </LI>
        <LI>
          <C>data-kind</C> and <C>data-id</C> on its group, so an application can find it.
        </LI>
        <LI>Its colour in the theme.</LI>
        <LI>
          <C>tests/fixture.ts</C> — one of them, so every other test sees it too.
        </LI>
        <LI>
          <C>docs/drawing.md</C> — how it is built.
        </LI>
      </UL>

      <H3 id="primitives">Touch the string primitives</H3>
      <P>
        <C>src/core/svg.ts</C> is the only file that writes a tag. A change there reaches every
        drawing, so it comes with tests in <C>tests/svg.test.ts</C> <strong>first</strong>, and the
        change to the callers second.
      </P>

      <H2 id="looking">Looking at what you changed</H2>
      <P>Tests do not tell you whether a drawing looks right. Render one and open it:</P>

      <CodeBlock
        lang="bash"
        code={`# from packages/starmap-render/
bun -e '
  import { renderSystem } from "./src/index"
  import { sol } from "./tests/fixture"
  await Bun.write("/tmp/sol.svg", renderSystem(sol, { t: 3, width: 700, height: 700 }))
' && open /tmp/sol.svg`}
      />

      <P>Worth a look every time:</P>

      <UL>
        <LI>a large system and a small one;</LI>
        <LI>a system with no planets;</LI>
        <LI>the drawing at 64 pixels;</LI>
        <LI>
          a non-square <C>width</C>/<C>height</C> — that last one is what catches a background that
          does not cover the letterboxed bands.
        </LI>
      </UL>

      <H2 id="tests">Writing tests</H2>
      <P>
        Vitest, in <C>tests/</C>. Assert on <strong>what must be true</strong>, not on the markup:
      </P>

      <CodeBlock
        lang="ts"
        code={`// good — survives any visual change that keeps the meaning
expect(svg).toContain('data-kind="planet" data-id="earth"')
expect(svg.match(/data-kind="planet"/g)).toHaveLength(3)

// bad — fails the next time a stroke width is tuned
expect(svg).toContain('<circle r="6" fill="#4fae6a" stroke-width="0.87"/>')`}
      />

      <P>
        <C>tests/fixture.ts</C> holds one universe carrying one of everything drawable. Start there;
        build a galaxy inline only for a case the fixture cannot express — a degenerate one,
        usually.
      </P>

      <P>Two habits that pay for themselves:</P>

      <UL>
        <LI>
          <strong>Check well-formedness</strong> with <C>xmlProblems()</C> whenever you add markup.
          It catches an unclosed tag and an unescaped name, which are the two ways a string renderer
          breaks.
        </LI>
        <LI>
          <strong>Cover the degenerate case.</strong> An empty galaxy, a system with nothing in it,
          a planet with no <C>type</C>. The model makes most fields optional, so the drawing meets
          them.
        </LI>
      </UL>

      <H2 id="comments">Comments and docs</H2>
      <P>
        Every exported symbol has JSDoc: what it does in one line, then what a caller needs to know
        — what it returns when it finds nothing, what it costs, what has to be unique.
      </P>

      <P>
        Comments in the body explain <strong>why</strong>. In this package that usually means why a
        number is what it is:
      </P>

      <CodeBlock
        lang="ts"
        code={`// The halo is six times the disc. It is what reads as brightness.
el('circle', { r: star.radius * 6, fill: \`url(#\${prefix}-glow)\` })`}
      />

      <Callout tone="tip" title="A magic number with no comment">
        It is the one thing a reviewer will ask about, every time. Write the sentence while you
        still remember the answer.
      </Callout>

      <P>
        The prose style is short sentences, code example first, explanation after. One idea per
        sentence.
      </P>

      <PropsTable
        rows={[
          {
            name: 'README.md',
            type: 'file',
            description: 'What the package is, and how to use it.',
          },
          {
            name: 'docs/theming.md',
            type: 'file',
            description: 'Every colour, and how to replace it.',
          },
          { name: 'docs/drawing.md', type: 'file', description: 'How each object is constructed.' },
          { name: 'docs/recipes.md', type: 'file', description: 'How-to answers, task by task.' },
          {
            name: 'docs/architecture.md',
            type: 'file',
            description: 'How the code is built, for contributors.',
          },
        ]}
      />

      <H2 id="style">Style</H2>
      <P>
        Formatting and lint are automatic — <C>oxfmt</C> and <C>oxlint</C>, configured at the root.
        No semicolons, single quotes, 100 columns. Run <C>bun run fmt</C>.
      </P>

      <P>Two things the tools cannot decide:</P>

      <UL>
        <LI>
          <strong>Explicit types on exports.</strong> <C>isolatedDeclarations</C> is on, so every
          exported declaration carries its type — including a parameter with a default value.
        </LI>
        <LI>
          <strong>One dependency.</strong> The core, and nothing else. A change that adds a second
          one needs a very good reason.
        </LI>
      </UL>

      <H2 id="sending">Sending a change</H2>
      <CodeBlock
        lang="bash"
        code={`git checkout -b feat/short-description
bun run check
git commit -m "feat: draw rings on ice giants"`}
      />

      <P>
        Commits follow <A href="https://www.conventionalcommits.org">Conventional Commits</A>.
      </P>

      <Callout tone="warning" title="Show the drawing in the pull request">
        Before and after. A visual change is not reviewable from a diff — nobody can tell what{' '}
        <C>r * 6</C> becoming <C>r * 5.5</C> looks like by reading it.
      </Callout>

      <H2 id="bugs">Reporting a bug</H2>
      <P>Include the smallest galaxy that reproduces it, and say what you expected to see:</P>

      <CodeBlock
        lang="ts"
        code={`const galaxy = createGalaxy({
  systems: [{ id: 'a', name: 'A', x: 0, y: 0, star: { radius: 10 } }],
})
renderSystem(galaxy.systems[0])   // expected …, got …`}
      />

      <P>
        If the output is malformed, paste it. If it merely looks wrong, attach the rendered image —
        that is faster than describing it.
      </P>

      <P>Two things that are not bugs:</P>

      <UL>
        <LI>
          <strong>
            A field left <C>undefined</C> drawing as the fallback.
          </strong>{' '}
          The core never invents a value, so the drawing has one for every table.
        </LI>
        <LI>
          <strong>A drawing that does not react to a click.</strong> There is no interaction here on
          purpose — <C>data-id</C> is the hook, and{' '}
          <A href={routes.page('starmap-render', 'interactivity')}>the handler is yours</A>.
        </LI>
      </UL>
    </>
  )
}
