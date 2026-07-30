import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { A, C, H2, LI, Lead, P, Quote, UL } from '@/components/docs/prose'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'conventions', title: 'The conventions', depth: 2 },
  { id: 'positions', title: 'Every position at time t', depth: 2 },
  { id: 'nesting', title: 'Stations follow their planet', depth: 3 },
  { id: 'loop', title: 'A render loop', depth: 2 },
  { id: 'single', title: 'One orbit at a time', depth: 2 },
  { id: 'floats', title: 'Floating point, and round()', depth: 2 },
  { id: 'determinism', title: 't is the only input', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        Orbits are computed, never stored. You give a time in seconds; you get back where everything
        is at that instant. There is no simulation to step and no state to keep.
      </Lead>

      <H2 id="conventions">The conventions</H2>
      <P>Three of them, and they hold everywhere in the library:</P>

      <UL>
        <LI>
          <strong>The star sits at the origin.</strong> Positions inside a system are relative to{' '}
          <C>(0, 0)</C>. Where the system itself is in the galaxy is <C>system.x</C> and{' '}
          <C>system.y</C> — a separate coordinate space.
        </LI>
        <LI>
          <strong>
            The Y axis points <em>down</em>
          </strong>
          , as in SVG and Canvas. If you are drawing with a maths convention instead, negate{' '}
          <C>y</C> once at the boundary.
        </LI>
        <LI>
          <strong>Angles are degrees, measured clockwise</strong>, starting from the positive X
          axis. <C>angle: 0</C> is to the right; <C>angle: 90</C> is straight down.
        </LI>
      </UL>

      <H2 id="positions">Every position at time t</H2>
      <P>
        <C>systemPositions()</C> is the one you will use. It returns a <C>Map</C> from id to{' '}
        <C>{`{ x, y }`}</C>, covering everything in the system.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { systemPositions } from '@industrieh/starmap'

const at = systemPositions(system, 0)   // t = 0 seconds

at.get('sol-star')      // { x: 0, y: 0 }        — always the origin
at.get('sol-p0')        // { x: 100, y: 0 }      — angle 0, to the right
at.get('sol-p1')        // { x: 0, y: 200 }      — angle 90, straight down
at.get('sol-p1-st0')    // { x: 20, y: 200 }     — its station, offset from it
at.get('sol-gate0')     // { x: 212.13, y: 212.13 }
at.get('sol-ast0')      // { x: 176.78, y: 176.78 }  — a belt: the middle of its arc
at.get('sol-ast1')      // { x: -120, y: 60 }        — a cluster: its centre`}
      />

      <P>
        Gates and asteroid fields are included even though they never move — so the map is the one
        place to look, whatever you are drawing.
      </P>

      <H2 id="nesting">Stations follow their planet</H2>
      <P>
        A station&apos;s <C>orbit</C> is measured from its planet, and <C>systemPositions()</C>{' '}
        composes the two rotations for you. Watch what happens as time advances:
      </P>

      <CodeBlock
        lang="ts"
        code={`// t = 0
at.get('sol-p1')       // { x: 0,   y: 200 }
at.get('sol-p1-st0')   // { x: 20,  y: 200 }   — 20 units to the right of its planet

// t = 2 — the planet has moved, and carried the station with it
at.get('sol-p1')       // { x: -141.42, y: 141.42 }
at.get('sol-p1-st0')   // { x: -161.42, y: 141.42 }`}
      />

      <P>
        The station is on its own four-second orbit <em>and</em> on its planet&apos;s sixteen-second
        one. You never compose those yourself.
      </P>

      <Callout tone="note" title="Only one level of nesting">
        Stations orbit planets; nothing orbits stations. Moons are a count on the planet, not
        objects — which keeps this composition to exactly two terms and the whole thing predictable.
      </Callout>

      <H2 id="loop">A render loop</H2>
      <P>
        Because positions are derived, the loop is just: advance a number, ask for the map, draw.
      </P>

      <CodeBlock
        lang="ts"
        filename="render.ts"
        code={`import { systemPositions } from '@industrieh/starmap'

let t = 0
let last = performance.now()

function frame(now: number) {
  const dt = (now - last) / 1000
  last = now
  t += dt * timeScale          // your own speed control, pause = 0

  const at = systemPositions(system, t)

  ctx.clearRect(0, 0, width, height)
  drawStar(0, 0, system.star.radius)

  for (const planet of system.planets) {
    const p = at.get(planet.id)!
    drawOrbit(planet.orbit)
    drawPlanet(p.x, p.y, planet.radius, planet.type)

    for (const station of planet.stations) {
      const s = at.get(station.id)!
      drawStation(s.x, s.y)
    }
  }

  requestAnimationFrame(frame)
}

requestAnimationFrame(frame)`}
      />

      <Callout tone="tip" title="Nothing to cache, nothing to memoise">
        One call costs a single pass over the objects of one system — a few dozen at most. Wrapping
        it in a memo would cost more than it saves, and would introduce a staleness bug you did not
        have.
      </Callout>

      <P>
        Note that only <em>one</em> system is animated at a time. That is the usual case: the galaxy
        view shows static system positions, and orbits only matter once you are inside one.
      </P>

      <H2 id="single">One orbit at a time</H2>
      <P>
        <C>orbitPos()</C> is the primitive underneath. Reach for it when you are placing something
        the model does not know about — a ship, a projectile, a waypoint.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { orbitPos } from '@industrieh/starmap'

// orbitPos(orbit, angleDeg, period, t)
orbitPos(100, 0, 0, 0)    // { x: 100, y: 0 }   — period 0: never moves
orbitPos(100, 90, 0, 0)   // { x: 0, y: 100 }   — 90° is straight down
orbitPos(100, 0, 8, 2)    // { x: 0, y: 100 }   — a quarter of an 8s orbit

// Your own ship, parked in a holding pattern:
const ship = orbitPos(planet.orbit + 30, 210, 40, t)`}
      />

      <P>
        And <C>fieldCenter()</C> gives the anchor point of an asteroid field — the middle of the arc
        for a belt, the centre for a cluster:
      </P>

      <CodeBlock
        lang="ts"
        code={`import { fieldCenter } from '@industrieh/starmap'

fieldCenter(belt)      // { x: 176.78, y: 176.78 }  — mid-arc
fieldCenter(cluster)   // { x: -120, y: 60 }        — its own centre`}
      />

      <H2 id="floats">Floating point, and round()</H2>
      <P>Ask for the cosine of ninety degrees and you get this:</P>

      <CodeBlock
        lang="ts"
        code={`orbitPos(100, 90, 0, 0)
// { x: 6.123233995736766e-15, y: 100 }
//     ↑ zero, as far as anything visual is concerned`}
      />

      <P>
        That is not a bug, it is binary floating point, and every library that does trigonometry
        produces it. It is invisible on screen. It becomes a nuisance the moment you serialize —{' '}
        <C>0.30000000000000004</C> in a save file is noise that doubles your JSON for no precision
        anyone can use.
      </P>

      <P>
        So the library exports the rounding helper it uses internally, and you can use it at the
        same boundary:
      </P>

      <CodeBlock
        lang="ts"
        code={`import { round } from '@industrieh/starmap'

round(0.30000000000000004)   // 0.3
round(1.23456, 3)            // 1.235   — the second argument is decimal places`}
      />

      <Callout tone="warning" title="Round at the edges, not in the middle">
        Round when you write to disk or hand a number to a renderer. Rounding inside a computation
        accumulates error instead of removing it.
      </Callout>

      <H2 id="determinism">t is the only input</H2>
      <P>
        <C>systemPositions()</C> is a pure function of the system and a number. Nothing is
        accumulated, nothing is stored between calls. Which quietly buys you a lot:
      </P>

      <UL>
        <LI>
          <strong>Rewind and fast-forward are free.</strong> Pass <C>t - 60</C> to see where
          everything was a minute ago. There is no simulation to run backwards.
        </LI>
        <LI>
          <strong>A save file is one number.</strong> Store <C>t</C> and the universe resumes
          exactly where it was.
        </LI>
        <LI>
          <strong>Server and client agree without talking.</strong> Same galaxy, same <C>t</C>, same
          positions — no synchronisation of orbital state.
        </LI>
        <LI>
          <strong>Tests are trivial.</strong> No fake timers, no waiting. Assert on a position at{' '}
          <C>t = 12</C>.
        </LI>
      </UL>

      <Quote>
        Nothing in this library accumulates. Every position is recomputed from scratch, and that is
        why none of them can drift.
      </Quote>

      <P>
        The same principle drives the other half of the library:{' '}
        <A href={routes.page('starmap', 'randomness')}>Deterministic randomness</A>, where a seed
        plays the role that <C>t</C> plays here.
      </P>
    </>
  )
}
