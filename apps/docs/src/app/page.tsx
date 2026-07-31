import { findRoute } from '@industrieh/starmap'
import { renderGalaxy, renderSystem } from '@industrieh/starmap-render'
import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'
import type { JSX, ReactNode } from 'react'

import { CodeBlock } from '@/components/code-block'
import { aspectOf } from '@/components/docs/render-preview'
import { StarField } from '@/components/star-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GALAXY, SOL } from '@/content/starmap-render/fixture'
import { LIBRARIES, routes } from '@/lib/routes'
import { cn } from '@/lib/utils'

/**
 * The home page.
 *
 * Every picture on it is the renderer's real output, produced while the page is
 * being prerendered from the same fixture the `starmap-render` documentation
 * draws from. Nothing here is a screenshot, so nothing here can drift from what
 * the libraries actually do — which is the whole argument the page is making.
 *
 * **Each drawing needs its own `idPrefix`.** A drawing declares gradients in
 * `<defs>` and SVG ids are global to the document, so two drawings sharing a
 * prefix would both use the first one's star colour. There are five on this page.
 */

/** A real call against the real API — this is the code, and below it the output. */
const SAMPLE = `import { createGalaxy, findRoute } from '@industrieh/starmap'
import { renderGalaxy } from '@industrieh/starmap-render'

const galaxy = createGalaxy({
  systems: [
    { id: 'sol', name: 'Sol', x: 0, y: 0, star: { class: 'G', radius: 18 } },
    { id: 'alpha', name: 'Alpha', x: 400, y: 300, star: { radius: 14 } },
  ],
  lanes: [{ from: 'sol', to: 'alpha' }],
})

findRoute(galaxy, 'sol', 'alpha') // ['sol', 'alpha']
renderGalaxy(galaxy)              // '<svg …>'`

// --- the drawings, all five of them, built once at module scope.

const ROUTE = findRoute(GALAXY, 'altair', 'lyra')

// No `width` or `height` on any of them: those write pixel attributes onto the
// root element, and a drawing pinned to 900px cannot fit a phone. Left out, the
// SVG scales to its box, and `aspectOf` gives the box the drawing's own shape.

const MAP = renderGalaxy(GALAXY, { idPrefix: 'home-map' })

const MAP_ROUTED = renderGalaxy(GALAXY, {
  idPrefix: 'home-route',
  highlight: ROUTE?.systemIds,
})

const SYSTEM_EARLY = renderSystem(SOL, { t: 0, idPrefix: 'home-t0' })
const SYSTEM_LATE = renderSystem(SOL, { t: 14, idPrefix: 'home-t14' })

const SYSTEM_THEMED = renderSystem(SOL, {
  t: 14,
  idPrefix: 'home-theme',
  theme: {
    background: '#0b1020',
    lane: '#4c6ef5',
    orbit: '#2a3a6b',
    label: '#c7d2fe',
    planets: { terran: '#5eead4', rocky: '#94a3b8', default: '#64748b' },
  },
})

const FACTS = [
  { value: '0', label: 'dependencies', body: 'Neither package pulls anything in.' },
  { value: '2', label: 'packages', body: 'The model, and the drawing. Take one or both.' },
  { value: 'SVG', label: 'output', body: 'A string. No DOM, no component, no framework.' },
  { value: 'MIT', label: 'license', body: 'Use it in anything, including a game you sell.' },
]

/**
 * A drawing in a frame shaped like itself — no caption, no code above it.
 *
 * The frame takes its ratio from the drawing's own `viewBox`, the same way
 * `RenderPreview` does on the documentation pages: without it a square system in
 * a wide box is letterboxed, and the wasted background reads as a bug. The
 * `[&>svg]` selector has to sit on the element that *directly* wraps the markup,
 * or it matches nothing.
 */
function Figure({ svg, className }: { svg: string; className?: string }): JSX.Element {
  return (
    <div
      style={{ aspectRatio: aspectOf(svg) }}
      className={cn('overflow-hidden rounded-xl border bg-muted/20 shadow-sm', className)}
    >
      {/* The drawing carries its own background, so it needs a box and nothing
          else. */}
      <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}

/**
 * One feature: prose on one side, the drawing it is talking about on the other.
 *
 * `reverse` alternates the sides down the page. On a narrow screen the picture
 * always comes second — the sentence explaining it has to be read first.
 */
function Feature({
  eyebrow,
  title,
  children,
  figure,
  reverse,
}: {
  eyebrow: string
  title: string
  children: ReactNode
  figure: ReactNode
  reverse?: boolean
}): JSX.Element {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={cn(reverse && 'lg:order-2')}>
        <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {title}
        </h2>
        <div className="mt-4 space-y-4 text-pretty text-muted-foreground">{children}</div>
      </div>
      <div className={cn(reverse && 'lg:order-1')}>{figure}</div>
    </div>
  )
}

export default function HomePage(): JSX.Element {
  return (
    <>
      <section className="relative overflow-hidden border-b">
        {/* The sky is masked so it thins out behind the text — a backdrop has to
            lose against the words in front of it. */}
        <StarField className="[mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_78%)]" />

        <div className="relative mx-auto max-w-screen-xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="font-mono">
              v{LIBRARIES[0].version}
            </Badge>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              A star universe you can query.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-pretty text-muted-foreground">
              Describe your systems as a typed object. Get back indexes, routes and orbital
              positions over time — then draw the whole thing as SVG. Two libraries, and neither one
              of them wants to be your game engine.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {/* Both render an `<a>`, so both have to say `nativeButton={false}` —
                  Base UI otherwise expects a real `<button>` and warns. */}
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href={routes.docs}>Read the docs</Link>}
              />
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={
                  <Link href={routes.github} target="_blank" rel="noreferrer">
                    View on GitHub
                  </Link>
                }
              />
            </div>
          </div>

          {/* The code, and immediately under it what that code produces. The two
              are joined into one panel because they are one statement. */}
          <div className="mx-auto mt-16 max-w-4xl">
            <CodeBlock
              code={SAMPLE}
              lang="ts"
              filename="galaxy.ts"
              className="rounded-b-none border-b-0 shadow-sm"
            />
            <Figure svg={MAP} className="rounded-t-none" />
            <p className="mt-3 text-center text-sm text-muted-foreground">
              The picture above is that call, run while this page was built — not a screenshot.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b">
        {/* Two nested divs on purpose: the padding belongs to the outer one, so
            that `bg-border` — which is only there to paint the 1px gaps between
            the cells — does not bleed into the gutters. */}
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map((fact) => (
              <div key={fact.label} className="bg-background px-6 py-10 md:px-8">
                <p className="text-3xl font-semibold tracking-tight">{fact.value}</p>
                <p className="mt-1 text-sm font-medium">{fact.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{fact.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-screen-xl space-y-24 px-4 py-24 sm:px-6 lg:space-y-32">
        <Feature
          eyebrow="Query it"
          title="Ask where things are, and how to get there"
          figure={<Figure svg={MAP_ROUTED} />}
        >
          <p>
            <code className="font-mono text-sm">findRoute()</code> walks the hyperlane network and
            gives you the systems, the jumps and the distance. Hand the result straight to the
            renderer and the path lights up.
          </p>
          <p>
            The drawing beside this paragraph is{' '}
            <code className="font-mono text-sm">Altair → Lyra</code>: {ROUTE?.jumps} jumps,{' '}
            {ROUTE === null ? '—' : Math.round(ROUTE.distance).toLocaleString('en-US')} units,
            highlighted by passing the route back in.
          </p>
        </Feature>

        <Feature
          eyebrow="Animate it"
          title="Every orbit, at any moment you ask for"
          reverse
          figure={
            <div className="grid gap-4 sm:grid-cols-2">
              <figure>
                <Figure svg={SYSTEM_EARLY} />
                <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                  t = 0s
                </figcaption>
              </figure>
              <figure>
                <Figure svg={SYSTEM_LATE} />
                <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                  t = 14s
                </figcaption>
              </figure>
            </div>
          }
        >
          <p>
            Give the renderer a time and it places every planet, moon and station where its period
            says it should be. The same two calls made both pictures; only the number changed.
          </p>
          <p>
            There is no clock inside the library, and no{' '}
            <code className="font-mono text-sm">Date</code>. Your loop owns time — which is what
            lets it pause, scrub backwards, or run a simulation faster than real life.
          </p>
        </Feature>

        <Feature
          eyebrow="Theme it"
          title="Your palette. The model never had one."
          figure={<Figure svg={SYSTEM_THEMED} />}
        >
          <p>
            No colour lives in the data model: a planet has a{' '}
            <code className="font-mono text-sm">type</code>, never a{' '}
            <code className="font-mono text-sm">color</code>. What a type looks like is a decision
            of the project displaying it, so it enters through the theme.
          </p>
          <p>
            A table you pass is merged over the default one key by key, so changing one colour keeps
            the other twenty — and a planet type you invented still gets drawn.
          </p>
        </Feature>
      </section>

      <section className="border-t">
        <div className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">The two libraries</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            They ship separately on purpose. Take the model alone if you draw your own; take both if
            you want pixels without writing an SVG by hand.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {LIBRARIES.map((library) => (
              <Card
                key={library.slug}
                className="relative transition-colors hover:border-foreground/20"
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-mono text-base">{library.packageName}</CardTitle>
                    <Badge variant="secondary">v{library.version}</Badge>
                  </div>
                  <CardDescription className="text-base">{library.tagline}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href={routes.library(library.slug)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium after:absolute after:inset-0 hover:underline"
                  >
                    Documentation
                    <ArrowRightIcon className="size-3.5" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
