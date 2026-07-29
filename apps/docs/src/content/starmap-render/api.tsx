import type { JSX } from 'react'

import { ApiEntry } from '@/components/docs/api-entry'
import { Callout } from '@/components/docs/callout'
import { PropsTable } from '@/components/docs/props-table'
import { A, C, H2, Lead, P } from '@/components/docs/prose'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'rendering', title: 'Rendering', depth: 2 },
  { id: 'renderSystem', title: 'renderSystem', depth: 3 },
  { id: 'renderSystemContent', title: 'renderSystemContent', depth: 3 },
  { id: 'renderGalaxy', title: 'renderGalaxy', depth: 3 },
  { id: 'renderGalaxyContent', title: 'renderGalaxyContent', depth: 3 },
  { id: 'options', title: 'Options', depth: 2 },
  { id: 'framing', title: 'Framing', depth: 2 },
  { id: 'systemViewBox', title: 'systemViewBox', depth: 3 },
  { id: 'galaxyViewBox', title: 'galaxyViewBox', depth: 3 },
  { id: 'viewBoxAttr', title: 'viewBoxAttr', depth: 3 },
  { id: 'svgDocument', title: 'svgDocument', depth: 3 },
  { id: 'shapes', title: 'Shapes', depth: 2 },
  { id: 'arcPath', title: 'arcPath', depth: 3 },
  { id: 'backdropStars', title: 'backdropStars', depth: 3 },
  { id: 'theme', title: 'Theme', depth: 2 },
  { id: 'resolveTheme', title: 'resolveTheme', depth: 3 },
  { id: 'pickColor', title: 'pickColor / pickRouteStyle', depth: 3 },
  { id: 'primitives', title: 'String primitives', depth: 2 },
  { id: 'types', title: 'Types', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        Every export of <C>@cotontigeh/starmap-render</C>, with its signature. Everything comes from
        the package root.
      </Lead>

      <Callout tone="note" title="Looking for explanations rather than signatures?">
        <A href={routes.page('starmap-render', 'drawing')}>Drawing</A> covers the layers,{' '}
        <A href={routes.page('starmap-render', 'theming')}>Theming</A> the colours,{' '}
        <A href={routes.page('starmap-render', 'framing')}>Framing</A> the viewBox and embedding.
      </Callout>

      <H2 id="rendering">Rendering</H2>

      <ApiEntry
        id="renderSystem"
        name="renderSystem"
        kind="function"
        signature={`function renderSystem(
  system: StarSystem,
  options?: RenderSystemOptions,
): string`}
        summary="Draw one system as a standalone SVG document, at a given moment."
        params={[
          {
            name: 'system',
            type: 'StarSystem',
            description: (
              <>
                One system — <C>galaxy.systems[0]</C>, not the galaxy.
              </>
            ),
          },
          {
            name: 'options',
            type: 'RenderSystemOptions',
            description: <A href="#options">See the table below.</A>,
          },
        ]}
        returns={
          <>
            A complete <C>&lt;svg&gt;…&lt;/svg&gt;</C> string — write it to a file, inline it, or
            put it in a <C>data:</C> URI.
          </>
        }
        example={`const svg = renderSystem(galaxy.systems[0], { t: 12.5, width: 700, height: 700 })
await Bun.write('sol.svg', svg)`}
      />

      <ApiEntry
        id="renderSystemContent"
        name="renderSystemContent"
        kind="function"
        signature={`function renderSystemContent(
  system: StarSystem,
  options?: RenderSystemOptions,
): string`}
        summary={
          <>
            The same drawing, without the <C>&lt;svg&gt;</C> around it. This is what an interactive
            application wants: it owns the root element, so it owns the <C>viewBox</C> — and pan and
            zoom are then nothing more than changing it.
          </>
        }
        example={`const body = renderSystemContent(system, { t })
const box = systemViewBox(system)
container.innerHTML = \`<svg viewBox="\${viewBoxAttr(box)}">\${body}</svg>\``}
      />

      <ApiEntry
        id="renderGalaxy"
        name="renderGalaxy"
        kind="function"
        signature={`function renderGalaxy(
  galaxy: Galaxy,
  options?: RenderGalaxyOptions,
): string`}
        summary={
          <>
            Draw the whole map: systems as points, hyperlanes as the network between them.{' '}
            <strong>Takes no </strong>
            <C>t</C> — at galaxy scale a planet is smaller than a rounding error.
          </>
        }
        example={`const route = findRoute(galaxy, 'sol', 'vega')
const map = renderGalaxy(galaxy, { highlight: route?.systemIds })`}
      />

      <ApiEntry
        id="renderGalaxyContent"
        name="renderGalaxyContent"
        kind="function"
        signature={`function renderGalaxyContent(
  galaxy: Galaxy,
  options?: RenderGalaxyOptions,
): string`}
        summary={
          <>
            The galaxy&apos;s layers alone. Pair it with <C>galaxyViewBox()</C> when your
            application owns the root element.
          </>
        }
      />

      <H2 id="options">Options</H2>
      <P>
        Both option types extend <C>DocumentOptions</C>, so <C>width</C>, <C>height</C> and{' '}
        <C>title</C> are available on all four functions — the two <C>…Content</C> ones ignore them,
        since they emit no root element.
      </P>

      <PropsTable
        rows={[
          {
            name: 't',
            type: 'number',
            defaultValue: '0',
            description: (
              <>
                Simulation time, in seconds. <strong>System only</strong> — compared against each
                object&apos;s <C>period</C>, the same way <C>systemPositions()</C> does it.
              </>
            ),
          },
          {
            name: 'theme',
            type: 'ThemeInput',
            defaultValue: 'DEFAULT_THEME',
            description: (
              <>
                Colours. Anything left out is merged from the default —{' '}
                <A href={routes.page('starmap-render', 'theming')}>Theming</A>.
              </>
            ),
          },
          {
            name: 'margin',
            type: 'number',
            defaultValue: '0.45 / 0.12',
            description:
              'Empty space around the drawing, as a fraction. 0.45 of outerLimit for a system; 0.12 of the largest dimension for a galaxy.',
          },
          {
            name: 'labels',
            type: 'boolean',
            defaultValue: 'true',
            description: 'Names of planets and gates, or of systems on the galaxy map.',
          },
          {
            name: 'backdrop',
            type: 'number',
            defaultValue: '260 / 400',
            description: (
              <>
                How many decorative background stars. <C>0</C> draws none — worth doing for a
                thumbnail or an animation.
              </>
            ),
          },
          {
            name: 'idPrefix',
            type: 'string',
            defaultValue: "'starmap'",
            description: (
              <>
                Prefix of the gradient ids this drawing declares. Two SVGs inlined on one page share
                an id namespace, so give each its own —{' '}
                <A href={`${routes.page('starmap-render', 'framing')}#ids`}>why it matters</A>.
              </>
            ),
          },
          {
            name: 'systems',
            type: 'SystemsById',
            description: (
              <>
                <strong>System only.</strong> From <C>indexSystems(galaxy)</C>. When given, a gate
                label names where it leads.
              </>
            ),
          },
          {
            name: 'highlight',
            type: 'readonly string[]',
            description: (
              <>
                <strong>Galaxy only.</strong> An ordered path — exactly what <C>findRoute()</C>{' '}
                returns in <C>systemIds</C>. Consecutive entries light the lane between them.
              </>
            ),
          },
          {
            name: 'width, height',
            type: 'number',
            description:
              'On the root element, in pixels. Left out by default, so the drawing fills its container.',
          },
          {
            name: 'title',
            type: 'string',
            description: (
              <>
                Adds a <C>&lt;title&gt;</C> child and <C>role=&quot;img&quot;</C>, so a screen
                reader announces the drawing instead of skipping it.
              </>
            ),
          },
        ]}
      />

      <H2 id="framing">Framing</H2>

      <ApiEntry
        id="systemViewBox"
        name="systemViewBox"
        kind="function"
        signature={`function systemViewBox(system: StarSystem, margin?: number): ViewBox
const SYSTEM_MARGIN = 0.45`}
        summary={
          <>
            The framing <C>renderSystem()</C> would use. Square and centred on the origin, because a
            system&apos;s star is always at <C>(0, 0)</C>.
          </>
        }
        returns={
          <>
            <C>{`{ x, y, w, h }`}</C> in world units. A system whose <C>outerLimit</C> is <C>0</C>{' '}
            or nonsense falls back to <C>100</C>.
          </>
        }
        example={`systemViewBox(system)      // { x: -435, y: -435, w: 870, h: 870 }  — outerLimit 300 + 45%
systemViewBox(system, 0)   // { x: -300, y: -300, w: 600, h: 600 }  — cropped to the edge`}
      />

      <ApiEntry
        id="galaxyViewBox"
        name="galaxyViewBox"
        kind="function"
        signature={`function galaxyViewBox(galaxy: Galaxy, margin?: number): ViewBox
const GALAXY_MARGIN = 0.12`}
        summary={
          <>
            The bounding box of the systems, plus a margin. <strong>Not centred</strong> — a galaxy
            keeps the coordinates you gave it.
          </>
        }
        returns={
          <>
            An empty galaxy returns <C>-100 -100 200 200</C>. A single system, or several in a
            straight line, would give a box with zero width or height — both are clamped to at least{' '}
            <C>1</C>.
          </>
        }
        example={`galaxyViewBox(galaxy)   // { x: -50.4, y: -50.4, w: 520.8, h: 260.8 }`}
      />

      <ApiEntry
        id="viewBoxAttr"
        name="viewBoxAttr"
        kind="function"
        signature={`function viewBoxAttr(view: ViewBox): string`}
        summary="Format a ViewBox as the attribute value."
        example={`viewBoxAttr(systemViewBox(system))   // '-435 -435 870 870'`}
      />

      <ApiEntry
        id="svgDocument"
        name="svgDocument"
        kind="function"
        signature={`function svgDocument(
  view: ViewBox,
  body: string,
  options?: DocumentOptions,
): string`}
        summary={
          <>
            Wrap finished layers in a standalone document. Writes <C>xmlns</C>, which is what makes
            the string usable outside an HTML parser — a <C>.svg</C> file, a <C>data:</C> URI, an{' '}
            <C>&lt;img src&gt;</C>.
          </>
        }
        example={`svgDocument({ x: 0, y: 0, w: 10, h: 10 }, '<circle r="1"/>', { title: 'T' })
// <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"
//      preserveAspectRatio="xMidYMid meet" role="img">
// <title>T</title>
// <circle r="1"/>
// </svg>`}
      />

      <H2 id="shapes">Shapes</H2>

      <ApiEntry
        id="arcPath"
        name="arcPath"
        kind="function"
        signature={`function arcPath(r: number, startDeg: number, sweepDeg: number): string`}
        summary={
          <>
            The <C>d</C> of a circular arc centred on the origin. Used for asteroid belts, which are
            arcs rather than full rings.
          </>
        }
        example={`arcPath(220, 0, 120)
// 'M 220 0 A 220 220 0 0 1 -110 190.53'

arcPath(220, 0, 360)
// 'M 220 0 A 220 220 0 1 1 -220 0 A 220 220 0 1 1 220 0'`}
      >
        <Callout tone="note" title="Past 359.5° it becomes two arcs">
          A single SVG arc cannot describe a complete circle — its end point would be its start
          point, and the arc would collapse to nothing.
        </Callout>
      </ApiEntry>

      <ApiEntry
        id="backdropStars"
        name="backdropStars"
        kind="function"
        signature={`function backdropStars(
  count: number,
  radius: number,
  seed: string | number,
  scale?: number,
): BackdropStar[]`}
        summary="A field of decorative stars, sown in a square centred on the origin. Deterministic: the same seed always gives the same sky."
        params={[
          { name: 'count', type: 'number', description: 'How many.' },
          {
            name: 'radius',
            type: 'number',
            description: 'Half-side of the square they are sown in.',
          },
          {
            name: 'seed',
            type: 'string | number',
            description: 'Anything stable. A string is hashed, a number is used as is.',
          },
          {
            name: 'scale',
            type: 'number = 1',
            description:
              'Multiplies each dot radius. Dots are sized in world units, so a galaxy-wide view needs bigger ones than a single system to look the same.',
          },
        ]}
        returns={
          <>
            <C>{`{ x, y, r, o }[]`}</C> — position, radius, opacity.
          </>
        }
      >
        <Callout tone="tip" title="It runs on its own seed, not the galaxy's">
          A generator sharing one sequence with its backdrop would shift its whole universe by
          changing the number of background stars.
        </Callout>
      </ApiEntry>

      <H2 id="theme">Theme</H2>

      <ApiEntry
        id="resolveTheme"
        name="resolveTheme"
        kind="function"
        signature={`function resolveTheme(input?: ThemeInput): Theme
const DEFAULT_THEME: Theme`}
        summary={
          <>
            Fill a <C>ThemeInput</C> in from the default. Tables are merged key by key, so{' '}
            <C>{`{ planets: { terran: '#7ee787' } }`}</C> keeps every other planet colour.
          </>
        }
        returns="A complete Theme — every field filled in, every table carrying its default entry."
        example={`const theme = resolveTheme({ background: '#000', planets: { terran: '#7ee787' } })

theme.background      // '#000'      yours
theme.planets.terran  // '#7ee787'   yours
theme.planets.gas     // '#d8a06a'   still the default`}
      >
        <Callout tone="warning" title="Nothing is merged deeper than a table">
          A <C>RouteStyle</C> is replaced whole, because a dash pattern without its width is not a
          style. And a field explicitly set to <C>undefined</C> falls back to the default rather
          than leaving a hole in the drawing.
        </Callout>
      </ApiEntry>

      <ApiEntry
        id="pickColor"
        name="pickColor, pickRouteStyle"
        kind="function"
        signature={`function pickColor(table: ColorMap, key: string | undefined): string
function pickRouteStyle(table: RouteStyleMap, key: string | undefined): RouteStyle`}
        summary={
          <>
            Look a key up, falling back to the table&apos;s <C>default</C>. The core&apos;s
            vocabularies are open unions, so a table can never be exhaustive — which is why{' '}
            <C>default</C> is required by the type.
          </>
        }
        example={`pickColor(theme.planets, 'terran')      // '#7ee787'
pickColor(theme.planets, 'shattered')   // '#8b8377' — the default
pickColor(theme.planets, undefined)     // '#8b8377' — the default too`}
      />

      <H2 id="primitives">String primitives</H2>
      <P>
        The four functions the whole package writes its output through, exported so your own overlay
        gets the same escaping and number formatting. See{' '}
        <A href={`${routes.page('starmap-render', 'recipes')}#overlay`}>Draw your own overlay</A>.
      </P>

      <PropsTable
        rows={[
          {
            name: 'el(name, attrs, children?)',
            type: '=> string',
            description: (
              <>
                One element, self-closing when it has no children. An attribute that is{' '}
                <C>undefined</C>, <C>null</C> or <C>false</C> is dropped.
                <br />
                <C>el(&apos;circle&apos;, {`{ r: 4.005 }`})</C> →{' '}
                <C>&lt;circle r=&quot;4&quot;/&gt;</C>
              </>
            ),
          },
          {
            name: 'group(attrs, parts)',
            type: '=> string',
            description: (
              <>
                A <C>&lt;g&gt;</C> around several parts. Empty parts are dropped, and a group left
                with nothing returns <C>&apos;&apos;</C> — which is why an empty layer is never
                emitted.
              </>
            ),
          },
          {
            name: 'text(content, attrs)',
            type: '=> string',
            description: 'A <text> element. The content is escaped; pass raw names.',
          },
          {
            name: 'num(value)',
            type: '=> string',
            description: (
              <>
                Two decimals, no exponent. A non-finite value becomes <C>&apos;0&apos;</C> rather
                than <C>&apos;NaN&apos;</C>, which no SVG reader accepts.
              </>
            ),
          },
          {
            name: 'dash(...lengths)',
            type: '=> string',
            description: (
              <>
                A <C>stroke-dasharray</C> value. Dash lengths are written into a string rather than
                an attribute, so they would otherwise escape <C>num()</C>.
              </>
            ),
          },
          {
            name: 'escapeXml(value)',
            type: '=> string',
            description: (
              <>
                Escapes <C>&amp;</C>, <C>&lt;</C>, <C>&gt;</C>, <C>&quot;</C> and <C>&apos;</C>.
                Every name in a galaxy is user data.
              </>
            ),
          },
          {
            name: 'background(view, fill)',
            type: '=> string',
            description: (
              <>
                The oversized rectangle behind everything —{' '}
                <A href={`${routes.page('starmap-render', 'framing')}#letterbox`}>
                  why three times
                </A>
                .
              </>
            ),
          },
        ]}
      />

      <H2 id="types">Types</H2>
      <PropsTable
        rows={[
          {
            name: 'RenderSystemOptions, RenderGalaxyOptions',
            type: 'options',
            description: (
              <>
                Both extend <C>DocumentOptions</C>. <A href="#options">The table above.</A>
              </>
            ),
          },
          {
            name: 'DocumentOptions',
            type: 'options',
            description: (
              <>
                <C>{`{ width?, height?, title? }`}</C> — the root element.
              </>
            ),
          },
          {
            name: 'ViewBox',
            type: 'geometry',
            description: (
              <>
                <C>{`{ x, y, w, h }`}</C>, in SVG <C>viewBox</C> order.
              </>
            ),
          },
          {
            name: 'BackdropStar',
            type: 'geometry',
            description: (
              <>
                <C>{`{ x, y, r, o }`}</C>.
              </>
            ),
          },
          {
            name: 'Theme, ThemeInput',
            type: 'theme',
            description:
              'What the drawing reads, and what you write. The same two-layer split as the core.',
          },
          {
            name: 'ColorMap',
            type: 'theme',
            description: (
              <>
                A colour per key, plus a required <C>default</C>.
              </>
            ),
          },
          {
            name: 'RouteStyle, RouteStyleMap',
            type: 'theme',
            description: (
              <>
                <C>{`{ stroke, dash, width }`}</C>, and a table of them.
              </>
            ),
          },
          {
            name: 'Attrs, AttrValue',
            type: 'primitives',
            description: (
              <>
                What <C>el()</C> accepts. <C>AttrValue</C> includes <C>undefined</C>, <C>null</C>{' '}
                and <C>false</C>, all of which drop the attribute.
              </>
            ),
          },
        ]}
      />
    </>
  )
}
