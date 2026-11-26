import { indexSystems } from '@industrieh/starmap'
import { renderGalaxy, renderSystem } from '@industrieh/starmap-render'
import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { PropsTable } from '@/components/docs/props-table'
import { A, C, H2, H3, LI, Lead, P, Quote, UL } from '@/components/docs/prose'
import { RenderCompare, RenderPreview } from '@/components/docs/render-preview'
import type { TocEntry } from '@/content/registry'
import { GALAXY, SOL } from '@/content/starmap-render/fixture'
import { routes } from '@/lib/routes'
import { outlineElement } from '@/lib/svg-outline'

const T = 4

const FULL = renderSystem(SOL, { t: T, idPrefix: 'dr-full' })
const BARE = renderSystem(SOL, { t: T, idPrefix: 'dr-bare', backdrop: 0, labels: false })
const GATE_LABELLED = renderSystem(SOL, {
  t: T,
  idPrefix: 'dr-gate',
  systems: indexSystems(GALAXY),
})
const MAP = renderGalaxy(GALAXY, { idPrefix: 'dr-map' })
const EMPTY_SYSTEM = renderSystem(GALAXY.systems[2], { idPrefix: 'dr-empty' })

/** What a planet's group holds, in emitted order — folded from the real output. */
const PLANET_PARTS: readonly [test: (tag: string) => boolean, note: string][] = [
  [(tag) => tag.startsWith('<ellipse'), 'the ring of a giant'],
  [(tag) => tag.includes('-shade)'), 'the shading'],
  [(tag) => tag.startsWith('<circle') && tag.includes('stroke='), 'the habitable ring'],
  [(tag) => tag.startsWith('<circle'), 'the disc'],
  [(tag) => tag.startsWith('<text'), 'the label'],
  [(tag) => tag.includes('data-kind="station"'), 'a station, placed relative to its planet'],
]

const PLANET_LISTING = outlineElement(renderSystem(SOL, { t: T }), {
  match: (tag) => tag.includes('data-id="sol-p1"'),
  parentOf: (tag) => tag.includes('data-layer="planets"'),
  note: (tag) => PLANET_PARTS.find(([test]) => test(tag))?.[1],
})

export const toc: readonly TocEntry[] = [
  { id: 'layers', title: 'Order is the composition', depth: 2 },
  { id: 'system-layers', title: 'The system layers', depth: 3 },
  { id: 'galaxy-layers', title: 'The galaxy layers', depth: 3 },
  { id: 'scale', title: 'Two kinds of size', depth: 2 },
  { id: 'objects', title: 'How each object is built', depth: 2 },
  { id: 'star', title: 'The star', depth: 3 },
  { id: 'planets', title: 'Planets and stations', depth: 3 },
  { id: 'gates', title: 'Gates', depth: 3 },
  { id: 'fields', title: 'Asteroid fields', depth: 3 },
  { id: 'galaxy-objects', title: 'Systems and lanes', depth: 3 },
  { id: 'empty', title: 'The empty cases', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        What the renderer actually puts on screen: the layers, the order they are stacked in, and
        how each object is constructed out of circles and paths.
      </Lead>

      <H2 id="layers">Order is the composition</H2>
      <P>
        SVG has no <C>z-index</C>. What is written later is drawn on top — so the order of the
        layers <em>is</em> the composition, and changing it is a visual change.
      </P>

      <Quote>
        Each layer is a <C>&lt;g&gt;</C> carrying a <C>data-layer</C>. That attribute is not
        decoration: it is how an application dims, hides or restyles a whole class of thing without
        the package knowing anything about it.
      </Quote>

      <RenderCompare
        left={{
          svg: FULL,
          alt: 'The Sol system with every layer drawn: backdrop stars, orbits, fields, the star, planets, the gate and their labels.',
          label: <>Everything on. This is the default.</>,
        }}
        right={{
          svg: BARE,
          alt: 'The same Sol system without the backdrop stars and without any label.',
          label: (
            <>
              <C>{`{ backdrop: 0, labels: false }`}</C> — the same drawing without the backdrop
              layer and without the labels, which is the easiest way to see what the rest is doing.
            </>
          ),
        }}
      />

      <H3 id="system-layers">The system layers</H3>
      <P>
        Bottom to top, exactly as they are emitted — and as <C>SYSTEM_LAYERS</C> lists them. The{' '}
        <C>layers</C> option draws a subset, still in this order; only <C>routes</C> and{' '}
        <C>planets</C> depend on <C>t</C>, so an animation can draw the others once.
      </P>

      <PropsTable
        rows={[
          {
            name: 'defs',
            type: 'not a layer',
            description: (
              <>
                Three radial gradients — the star&apos;s halo, its core, and the shading on a
                planet. Their ids are prefixed, see <C>idPrefix</C>.
              </>
            ),
          },
          {
            name: 'background',
            type: 'a bare <rect>',
            description: (
              <>
                Fills the view. Three times the <C>viewBox</C> and centred on it, on purpose —{' '}
                <A href={`${routes.page('starmap-render', 'framing')}#letterbox`}>
                  the letterboxing story
                </A>
                .
              </>
            ),
          },
          {
            name: 'backdrop',
            type: 'data-layer',
            description: 'The decorative star field. Seeded, so it never flickers between frames.',
          },
          {
            name: 'orbits',
            type: 'data-layer',
            description: 'The circles planets and gates travel on.',
          },
          {
            name: 'fields',
            type: 'data-layer',
            description: 'Asteroid belts and clusters, with their rocks.',
          },
          {
            name: 'routes',
            type: 'data-layer',
            description:
              'Local routes, each stroked with its own dash pattern, each a line carrying data-kind="route" and its data-id.',
          },
          {
            name: 'star',
            type: 'data-kind',
            description:
              'Not a layer of its own — one group, sitting between the routes and the planets.',
          },
          {
            name: 'planets',
            type: 'data-layer',
            description: 'Planets, their stations, their labels.',
          },
          {
            name: 'gates',
            type: 'data-layer',
            description: 'Last, so a gate is never hidden behind a planet that drifts over it.',
          },
        ]}
      />

      <H3 id="galaxy-layers">The galaxy layers</H3>
      <P>Shorter, because at galaxy scale there is less to say:</P>

      <PropsTable
        rows={[
          {
            name: 'defs',
            type: 'not a layer',
            description: (
              <>
                One radial gradient, the halo every system dot shares — <C>theme.light</C> at its
                centre. Its id is prefixed, see <C>idPrefix</C>.
              </>
            ),
          },
          { name: 'background', type: 'a bare <rect>', description: 'Same as above.' },
          {
            name: 'backdrop',
            type: 'data-layer',
            description:
              'The star field, sown around the centre of the view and across its longer side — wherever your coordinates put the galaxy.',
          },
          {
            name: 'lanes',
            type: 'data-layer',
            description: 'The hyperlane network. Highlighted lanes are drawn in the same layer.',
          },
          {
            name: 'systems',
            type: 'data-layer',
            description: 'A dot per system, its faction ring, its halo, its label.',
          },
        ]}
      />

      <RenderPreview
        svg={MAP}
        alt="The galaxy map: five systems joined by five hyperlanes, nothing highlighted."
        height="md"
        caption={
          <>
            Five systems, five lanes, nothing highlighted. Sol and Vega wear their faction&apos;s
            colour; Rigel, Altair and Lyra have no faction, so their ring falls back to{' '}
            <C>factions.default</C>.
          </>
        }
      />

      <Callout tone="note" title="Nothing moves on the galaxy map">
        <C>renderGalaxy()</C> takes no <C>t</C>. At galaxy scale a planet is smaller than a rounding
        error, so there is nothing to animate — the systems are where <C>createGalaxy()</C> put
        them.
      </Callout>

      <H2 id="scale">Two kinds of size</H2>
      <P>
        A system can be 300 world units across, or 30 000. That single fact shapes every number in
        the renderer, and it splits them into two families:
      </P>

      <UL>
        <LI>
          <strong>Real sizes stay real.</strong> A star&apos;s radius, a planet&apos;s radius, an
          orbit — those come from the model and are drawn as they are. A planet twice as big looks
          twice as big.
        </LI>
        <LI>
          <strong>Everything else is a fraction of the view.</strong> Gate glyphs, stroke widths,
          label sizes, the gaps between things. Sizing those in absolute units would make them fill
          the screen in a small system and vanish in a large one.
        </LI>
      </UL>

      <P>
        That second family is computed by <C>systemScale(view)</C> — <C>u</C> for spacing (a 200th
        of the view), <C>k</C> for strokes, <C>font</C> for labels — and <C>galaxyScale(view)</C> on
        the map. Both are exported: an overlay drawn with them is sized exactly like the drawing
        under it, and that is why either holds up at any size.
      </P>

      <Callout tone="tip" title="This is what makes a thumbnail work">
        Render a system at 64 pixels and the labels are still legible relative to the drawing,
        because they were never 12 pixels — they were a fraction of the frame.
      </Callout>

      <H2 id="objects">How each object is built</H2>

      <H3 id="star">The star</H3>
      <P>
        Two circles stacked: a wide halo on the glow gradient, six times the radius of the star, and
        the disc itself, filled with the core gradient — <C>theme.light</C> at the centre, the
        star&apos;s colour at the edge. The halo is what reads as brightness rather than as a bigger
        star.
      </P>
      <P>
        Its colour comes from <C>theme.stars</C>, keyed by <C>star.class</C>. A class the table does
        not list falls back to the table&apos;s <C>default</C>.
      </P>

      <H3 id="planets">Planets and stations</H3>
      <P>
        A planet is a disc filled from <C>theme.planets</C> by its <C>type</C>, with a shading
        gradient over it — <C>theme.light</C> on the lit side, <C>theme.shade</C> on the dark one —
        so it does not read as a flat dot. Three optional additions:
      </P>

      <UL>
        <LI>
          a tilted ring around a planet with three <C>moons</C> or more whose type is listed in{' '}
          <C>theme.ringed</C> — <C>gas</C> and <C>ice-giant</C> by default — drawn before the disc,
          so the disc hides its near half;
        </LI>
        <LI>
          a ring in <C>theme.habitable</C> when <C>planet.habitable</C> is true;
        </LI>
        <LI>
          a label with its name, when <C>labels</C> is on.
        </LI>
      </UL>

      <P>
        Stations are drawn <strong>inside the planet&apos;s group</strong>, because they travel with
        it. Each is a small mark coloured from <C>theme.stations</C> by its <C>type</C>.
      </P>

      {/* Folded from the real output, so the order and the attributes are the
          renderer's, not a memory of them. */}
      <CodeBlock lang="xml" noCopy code={PLANET_LISTING} />

      <H3 id="gates">Gates</H3>
      <P>
        A glyph on its orbit circle, which is dashed to tell it apart from a planet&apos;s. A gate
        whose <C>status</C> is <C>unstable</C> gets a second ring in <C>theme.gateUnstable</C>.
      </P>

      <Callout tone="tip" title="A gate label can name where it leads">
        Pass <C>systems: indexSystems(galaxy)</C> and the label adds the destination&apos;s name
        after the gate&apos;s — <C>Sol Gate → Vega</C>. The renderer cannot know it otherwise — a
        system does not carry its neighbours.
      </Callout>

      <RenderPreview
        svg={GATE_LABELLED}
        alt="The Sol system, its gate at the top right labelled Sol Gate → Vega."
        height="md"
        code={`import { indexSystems } from '@industrieh/starmap'

renderSystem(system, { systems: indexSystems(galaxy) })`}
        caption="The gate at the top right reads “Sol Gate → Vega”: its own name, then where it leads. Without the index the label stops at “Sol Gate” — a system does not carry its neighbours."
      />

      <H3 id="fields">Asteroid fields</H3>
      <P>Two shapes, chosen by the field&apos;s discriminant:</P>

      <UL>
        <LI>
          <strong>A belt</strong> is an arc, stroked at the width of the ring. It is a path rather
          than a circle because a belt is usually a partial arc.
        </LI>
        <LI>
          <strong>A cluster</strong> is a circle at its own position.
        </LI>
      </UL>

      <P>
        Either way, the <C>rocks</C> you provided are drawn inside it. The renderer never invents
        any — an empty <C>rocks</C> array draws the outline and nothing else.
      </P>

      <P>
        A full ring is a special case worth knowing about: a single SVG arc cannot describe a
        complete circle, because its end point would be its start point and the arc would collapse
        to nothing. Past 359.5° the path becomes two half-circles instead.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { arcPath } from '@industrieh/starmap-render'

arcPath(220, 0, 120)
// 'M 220 0 A 220 220 0 0 1 -110 190.53'

arcPath(220, 0, 360)
// 'M 220 0 A 220 220 0 1 1 -220 0 A 220 220 0 1 1 220 0'
//   ↑ two arcs, because one cannot close a circle`}
      />

      <H3 id="galaxy-objects">Systems and lanes</H3>
      <P>On the galaxy map, a system is three things stacked, and a fourth when labels are on:</P>

      <UL>
        <LI>a halo, so a dense cluster still reads as points of light;</LI>
        <LI>
          a ring in <C>theme.factions</C>, keyed by <C>faction.id</C> — always drawn: a system with
          no faction gets <C>factions.default</C>;
        </LI>
        <LI>the dot itself, coloured by its star&apos;s class;</LI>
        <LI>its name, when labels are on.</LI>
      </UL>

      <P>
        A lane is a line between two systems, in <C>theme.lane</C> — or in <C>theme.highlight</C>{' '}
        when it is part of the highlighted path — carrying <C>data-kind=&quot;lane&quot;</C> and its{' '}
        <C>data-id</C>, like every object an application may want to hit.
      </P>

      <Callout tone="tip" title="The faction ring is dashed until it is highlighted">
        A highlighted system gets a <em>solid</em> ring in <C>theme.highlight</C>; every other one
        is dashed, in its faction&apos;s colour. Two channels rather than one, so the path is still
        obvious in greyscale — the same reasoning as the{' '}
        <A href={`${routes.page('starmap-render', 'theming')}#routes`}>route dash patterns</A>.
      </Callout>

      <H2 id="empty">The empty cases</H2>
      <P>
        The core makes most fields optional, so the renderer meets them constantly. All of these
        produce a valid document:
      </P>

      <PropsTable
        rows={[
          {
            name: 'No planets',
            type: 'a system',
            description: 'No planets layer at all — an empty group is never emitted.',
          },
          {
            name: 'No type on a planet',
            type: 'undefined',
            description: (
              <>
                Falls back to <C>theme.planets.default</C>. Not a bug — the core never invents a
                value, so every table has a fallback.
              </>
            ),
          },
          {
            name: 'No systems',
            type: 'an empty galaxy',
            description: (
              <>
                A fallback <C>viewBox</C> of <C>-100 -100 200 200</C>, so the document is still
                displayable.
              </>
            ),
          },
          {
            name: 'One system',
            type: 'a galaxy',
            description:
              'Its bounding box would have zero width and height, which renders as nothing. Both are clamped to at least 1.',
          },
          {
            name: 'outerLimit of 0',
            type: 'a system',
            description: (
              <>
                Falls back to <C>100</C>. A drawing that cannot be framed is worse than one framed
                arbitrarily.
              </>
            ),
          },
        ]}
      />

      <RenderPreview
        svg={EMPTY_SYSTEM}
        alt="Rigel: a lone blue-white star on its backdrop, nothing orbiting it."
        height="sm"
        caption="Rigel: a star and nothing else. No planets layer, no fields layer, no gates layer — and still a perfectly valid document."
      />

      <Callout tone="note" title="A name with an ampersand does not break the document">
        Every name in a galaxy is user data, and it goes through XML escaping before it reaches a
        string — the control characters XML cannot hold at all are dropped on the way. A system
        called <C>Ohm &amp; Sons</C> comes out as <C>Ohm &amp;amp; Sons</C> — which is also what
        stops a name carrying a tag from injecting markup into the page that embeds the drawing.
      </Callout>
    </>
  )
}
