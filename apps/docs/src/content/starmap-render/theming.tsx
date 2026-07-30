import { renderSystem, type ThemeInput } from '@industrieh/starmap-render'
import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { PropsTable } from '@/components/docs/props-table'
import { A, C, H2, H3, LI, Lead, P, Quote, UL } from '@/components/docs/prose'
import { RenderCompare } from '@/components/docs/render-preview'
import type { TocEntry } from '@/content/registry'
import { SOL } from '@/content/starmap-render/fixture'
import { routes } from '@/lib/routes'

/** The light theme printed further down this page, and used to draw it. */
const LIGHT: ThemeInput = {
  background: '#f8fafc',
  backdropStar: '#94a3b8',
  label: '#0f172a',
  orbit: '#cbd5e1',
  gateOrbit: '#ddd6fe',
  lane: '#94a3b8',
  highlight: '#7c3aed',
  habitable: '#059669',
  gate: '#7c3aed',
  gateUnstable: '#e11d48',
  field: '#d6c9a0',
  rock: '#a8a29e',
  planets: { frozen: '#7dd3fc', terran: '#16a34a' },
}

const T = 4

const DARK_SVG = renderSystem(SOL, { t: T, idPrefix: 'th-dark' })
const LIGHT_SVG = renderSystem(SOL, { t: T, idPrefix: 'th-light', theme: LIGHT })
const ONE_COLOUR = renderSystem(SOL, {
  t: T,
  idPrefix: 'th-one',
  theme: { planets: { terran: '#f472b6' } },
})
const NO_BACKDROP_FIX = renderSystem(SOL, {
  t: T,
  idPrefix: 'th-trap',
  // Deliberately wrong: a light background with the default pale-blue stars.
  theme: { background: '#f8fafc', label: '#0f172a', orbit: '#cbd5e1' },
})

export const toc: readonly TocEntry[] = [
  { id: 'why', title: 'Why colour lives here', depth: 2 },
  { id: 'merging', title: 'How a theme merges', depth: 2 },
  { id: 'flat', title: 'The flat colours', depth: 2 },
  { id: 'tables', title: 'The keyed tables', depth: 2 },
  { id: 'default-entry', title: 'Every table needs a default', depth: 3 },
  { id: 'routes', title: 'Route styles', depth: 3 },
  { id: 'writing', title: 'Writing a light theme', depth: 2 },
  { id: 'resolve', title: 'Resolving once', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        Every colour the renderer reads, where it comes from, and how to replace one without
        restating the other twenty.
      </Lead>

      <H2 id="why">Why colour lives here</H2>
      <P>
        The core carries no <C>color</C> and no display label. Mapping <C>planet.type</C> to an
        appearance is a decision of the project that displays it — and a colour written into the
        model stops being usable the day that project needs a light theme, a colourblind mode, or a
        fixed brand palette.
      </P>

      <Quote>
        No colour in the core, and no world fact in the theme. That line is why the two packages are
        separate.
      </Quote>

      <P>
        So the theme is a <strong>parameter</strong>. It enters at the call, and the same universe
        can be drawn three different ways on the same page.
      </P>

      <H2 id="merging">How a theme merges</H2>
      <P>
        There are two layers, exactly like the core&apos;s <C>GalaxyInput</C> and <C>Galaxy</C>:{' '}
        <C>ThemeInput</C> is what you write and every field is optional; <C>Theme</C> is what the
        drawing functions read and everything is filled in.
      </P>

      <P>
        Tables merge <strong>key by key</strong>, so overriding one colour keeps the rest:
      </P>

      <CodeBlock
        lang="ts"
        code={`renderSystem(system, {
  theme: { background: '#000', planets: { terran: '#7ee787' } },
})

// background        → '#000'      yours
// planets.terran    → '#7ee787'   yours
// planets.gas       → '#d8a06a'   still the default
// planets.default   → '#8b8377'   still the default`}
      />

      <RenderCompare
        left={{ svg: DARK_SVG, label: <>The default theme, untouched.</> }}
        right={{
          svg: ONE_COLOUR,
          label: (
            <>
              One key changed — <C>{`{ planets: { terran: '#f472b6' } }`}</C>. Vesper is pink;
              Aurelia, the star, the belt and the gate are all still the default.
            </>
          ),
        }}
      />

      <Callout tone="warning" title="A RouteStyle is replaced whole">
        Merging stops at the table level. <C>{`{ routes: { mining: { … } } }`}</C> replaces the
        whole mining style, because a dash pattern without its width is not a style. Give all three
        fields.
      </Callout>

      <Callout tone="note" title="Setting a field to undefined does not erase it">
        <C>{`{ background: undefined }`}</C> falls back to the default rather than leaving a hole in
        the drawing. That is deliberate — a spread would otherwise let an optional variable blank
        out a colour and produce a transparent document.
      </Callout>

      <H2 id="flat">The flat colours</H2>
      <P>Thirteen single values. Every one of them is a string, passed straight into SVG.</P>

      <PropsTable
        rows={[
          {
            name: 'background',
            type: 'string',
            defaultValue: '#070b16',
            description: 'Fills the whole view.',
          },
          {
            name: 'backdropStar',
            type: 'string',
            defaultValue: '#cdd9ff',
            description: 'The decorative star field behind everything.',
          },
          { name: 'label', type: 'string', defaultValue: '#dbe4f5', description: 'Text colour.' },
          {
            name: 'font',
            type: 'string',
            defaultValue: 'ui-sans-serif, system-ui, sans-serif',
            description:
              'A font stack, written onto the label groups. Not a colour, but it belongs with them.',
          },
          {
            name: 'orbit',
            type: 'string',
            defaultValue: '#2b3d63',
            description: 'Planet orbit circles.',
          },
          {
            name: 'gateOrbit',
            type: 'string',
            defaultValue: '#43356e',
            description: 'Gate orbit circles, which are dashed.',
          },
          {
            name: 'lane',
            type: 'string',
            defaultValue: '#39507a',
            description: 'Hyperlanes, on the galaxy map.',
          },
          {
            name: 'highlight',
            type: 'string',
            defaultValue: '#9a7bff',
            description: (
              <>
                Systems and lanes on the path passed as <C>highlight</C>.
              </>
            ),
          },
          {
            name: 'habitable',
            type: 'string',
            defaultValue: '#4fd8a5',
            description: (
              <>
                The ring around a planet whose <C>habitable</C> is true.
              </>
            ),
          },
          { name: 'gate', type: 'string', defaultValue: '#9a7bff', description: 'The gate body.' },
          {
            name: 'gateUnstable',
            type: 'string',
            defaultValue: '#ff6b81',
            description: (
              <>
                The ring around a gate whose <C>status</C> is <C>unstable</C>.
              </>
            ),
          },
          {
            name: 'field',
            type: 'string',
            defaultValue: '#6b5a2a',
            description: 'Outline of an asteroid belt or cluster.',
          },
          {
            name: 'rock',
            type: 'string',
            defaultValue: '#a89468',
            description: 'The rocks inside a field.',
          },
        ]}
      />

      <H2 id="tables">The keyed tables</H2>
      <P>
        Four colour tables, each keyed by a value from the model. Here they are with their defaults:
      </P>

      <CodeBlock
        lang="ts"
        code={`stars: {          // by star.class
  O: '#9bb0ff',  B: '#aabfff',  A: '#cad7ff',  F: '#f8f7ff',
  G: '#ffe9a8',  K: '#ffc16f',  M: '#ff8f5a',
  default: '#ffe9a8',
}

planets: {        // by planet.type
  lava: '#e2542c',      rocky: '#a08d7d',   desert: '#d9a45b',
  barren: '#8b8377',    terran: '#4fae6a',  ocean: '#2f8fd8',
  toxic: '#9ac93b',     gas: '#d8a06a',     'ice-giant': '#6fb6d9',
  frozen: '#cfe4f0',
  default: '#8b8377',
}

stations: {       // by station.type
  trade: '#61d6c4',     mining: '#c9a227',  military: '#ff6b81',
  research: '#7fb3ff',  shipyard: '#d0a6ff',
  default: '#9fb4d8',
}

factions: {       // by faction.id — drawn as the ring around a system
  neutral: '#8e9bb3',   consortium: '#4ea3ff',  covenant: '#ff5c72',
  syndicate: '#c78bff', pilgrims: '#4fd8a5',
  default: '#8e9bb3',
}`}
      />

      <H3 id="default-entry">Every table needs a default</H3>
      <P>
        This is the part people trip on. The core&apos;s vocabularies are{' '}
        <A href={`${routes.page('starmap', 'data-model')}#open-unions`}>open unions</A>: a project
        can invent <C>type: &apos;shattered&apos;</C> and the model accepts it. A colour table
        therefore <strong>cannot be exhaustive</strong>.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { pickColor, resolveTheme } from '@industrieh/starmap-render'

const theme = resolveTheme({ planets: { terran: '#7ee787' } })

pickColor(theme.planets, 'terran')      // '#7ee787'
pickColor(theme.planets, 'shattered')   // '#8b8377' — the default
pickColor(theme.planets, undefined)     // '#8b8377' — the default too`}
      />

      <P>
        <C>default</C> is required by the type, so a table you build by hand cannot forget it. That
        is what guarantees a drawing is never missing a colour.
      </P>

      <H3 id="routes">Route styles</H3>
      <P>
        Local routes are the one table whose values are objects rather than strings — a route needs
        a stroke, a dash pattern and a width.
      </P>

      <CodeBlock
        lang="ts"
        code={`routes: {         // by localRoute.type
  orbital:     { stroke: '#5f7fa8', dash: '6 8',  width: 1.1 },
  shortcut:    { stroke: '#43607f', dash: '2 10', width: 0.9 },
  docking:     { stroke: '#61d6c4', dash: '3 4',  width: 0.8 },
  'jump-lane': { stroke: '#9a7bff', dash: '10 6', width: 1.4 },
  mining:      { stroke: '#c9a227', dash: '4 6',  width: 0.9 },
  default:     { stroke: '#5f7fa8', dash: '6 8',  width: 1.1 },
}`}
      />

      <Callout tone="tip" title="The dash patterns are an accessibility decision">
        Each route type gets a <em>distinct</em> pattern, not just a distinct colour — so the map
        stays readable in greyscale, and to a reader who cannot tell two of the colours apart.
        Changing a colour is safe; collapsing two patterns into one costs that.
      </Callout>

      <H2 id="writing">Writing a light theme</H2>
      <P>
        The default theme is dark. Nothing in the renderer assumes that — a light theme is the same
        object with different values.
      </P>

      <CodeBlock
        lang="ts"
        filename="theme-light.ts"
        code={`import type { ThemeInput } from '@industrieh/starmap-render'

export const LIGHT: ThemeInput = {
  background: '#f8fafc',
  backdropStar: '#94a3b8',
  label: '#0f172a',
  orbit: '#cbd5e1',
  gateOrbit: '#ddd6fe',
  lane: '#94a3b8',
  highlight: '#7c3aed',
  habitable: '#059669',
  gate: '#7c3aed',
  gateUnstable: '#e11d48',
  field: '#d6c9a0',
  rock: '#a8a29e',
  // The tables merge, so only the colours that need to change are listed.
  planets: { frozen: '#7dd3fc', terran: '#16a34a' },
}

renderSystem(system, { theme: LIGHT })`}
      />

      <RenderCompare
        left={{ svg: DARK_SVG, label: <>The default, dark.</> }}
        right={{
          svg: LIGHT_SVG,
          label: <>The theme above. Same system, same t — thirteen values and one table.</>,
        }}
      />

      <Callout tone="warning" title="Check the backdrop when you go light">
        <C>backdropStar</C> is the one that catches people out. Left at its default it is a pale
        blue, which all but disappears on a pale background — and you get a drawing that looks oddly
        empty for no obvious reason.
      </Callout>

      <RenderCompare
        left={{
          svg: NO_BACKDROP_FIX,
          label: (
            <>
              <strong>The trap.</strong> Background, label and orbit changed — <C>backdropStar</C>{' '}
              forgotten. The star field is still there, and you can barely see it.
            </>
          ),
        }}
        right={{
          svg: LIGHT_SVG,
          label: (
            <>
              <strong>Fixed.</strong> One more line, <C>backdropStar: &apos;#94a3b8&apos;</C>, and
              the sky comes back.
            </>
          ),
        }}
      />

      <H2 id="resolve">Resolving once</H2>
      <P>
        <C>resolveTheme()</C> is cheap but not free — it builds five merged tables. If you render
        every frame, resolve once outside the loop.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { resolveTheme } from '@industrieh/starmap-render'

// Once.
const theme = resolveTheme(LIGHT)

// Then per frame — a resolved Theme is a valid ThemeInput, so it just passes through.
function frame(t: number) {
  container.innerHTML = renderSystemContent(system, { t, theme })
}`}
      />

      <UL>
        <LI>
          <C>DEFAULT_THEME</C> is exported, so you can read a value or spread from it.
        </LI>
        <LI>
          <C>pickColor(table, key)</C> and <C>pickRouteStyle(table, key)</C> are exported too —
          useful when you draw your own overlay and want it to match.
        </LI>
      </UL>
    </>
  )
}
