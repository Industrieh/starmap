import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'
import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { StarField } from '@/components/star-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LIBRARIES, routes } from '@/lib/routes'

/** A real call against the real API — nothing on this page is mocked up. */
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

const FACTS = [
  { title: 'No dependencies', body: 'Neither library pulls anything in. Read the lockfile.' },
  { title: 'No DOM, no framework', body: 'The renderer returns a string. Where it goes is yours.' },
  {
    title: 'Typed all the way',
    body: 'Every export carries an explicit signature, checked in CI.',
  },
]

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

          <div className="mx-auto mt-16 max-w-3xl">
            <CodeBlock code={SAMPLE} lang="ts" filename="galaxy.ts" className="shadow-sm" />
          </div>
        </div>
      </section>

      <section className="border-b">
        {/* Two nested divs on purpose: the padding belongs to the outer one, so
            that `bg-border` — which is only there to paint the 1px gaps between
            the cells — does not bleed into the gutters. */}
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6">
          <div className="grid gap-px bg-border md:grid-cols-3">
            {FACTS.map((fact) => (
              <div key={fact.title} className="bg-background px-6 py-10 md:px-8">
                <h2 className="font-medium">{fact.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{fact.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-screen-xl px-4 py-20 sm:px-6">
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
      </section>
    </>
  )
}
