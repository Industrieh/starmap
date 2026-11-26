import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { PropsTable } from '@/components/docs/props-table'
import { A, C, H2, LI, Lead, P, Quote, UL } from '@/components/docs/prose'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'why', title: 'Why not Math.random()', depth: 2 },
  { id: 'api', title: 'The generator', depth: 2 },
  { id: 'streams', title: 'Keep your sequences separate', depth: 2 },
  { id: 'order', title: 'Draw order is a contract', depth: 2 },
  { id: 'generator', title: 'Writing a universe generator', depth: 2 },
  { id: 'lower', title: 'The lower level', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        The library does not generate universes — but it ships the tool to write a generator
        yourself, and to derive game content that comes back identical tomorrow.
      </Lead>

      <H2 id="why">Why not Math.random()</H2>
      <P>
        <C>Math.random()</C> is not seedable. You cannot ask it to replay a sequence, which means
        you cannot rebuild a world from a seed, cannot reproduce a bug report, and cannot have a
        server and a client agree on what they generated.
      </P>

      <P>
        So the library never calls it — not once, anywhere. Everything random goes through{' '}
        <C>createRng()</C>, and every draw is a pure function of a seed.
      </P>

      <Quote>
        Store the seed, not the world. Six characters instead of six megabytes, and it rebuilds
        exactly.
      </Quote>

      <H2 id="api">The generator</H2>
      <P>
        <C>createRng()</C> takes any string and hands back a generator: six ways to draw, and{' '}
        <C>fork()</C> to split off an independent one. Each instance carries its own state, so two
        generators made from the same seed produce the same sequence.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { createRng } from '@industrieh/starmap'

const rng = createRng('my-game-001')

rng.next()                 // 0.721389…  float in [0, 1)
rng.rand(10, 20)           // float in [10, 20)
rng.randInt(1, 6)          // 2 — integer, BOTH bounds included
rng.pick(['a', 'b', 'c'])  // 'a'
rng.chance(0.5)            // true — true with probability p
rng.weighted([{ w: 9, id: 'common' }, { w: 1, id: 'rare' }])
// { w: 9, id: 'common' }  — picked in proportion to w`}
      />

      <PropsTable
        rows={[
          {
            name: 'next()',
            type: '() => number',
            description: 'Float in [0, 1). Every other method builds on this one.',
          },
          {
            name: 'rand(min, max)',
            type: '(number, number) => number',
            description: 'Float in [min, max).',
          },
          {
            name: 'randInt(min, max)',
            type: '(number, number) => number',
            description: (
              <>
                Integer in [min, max] — <strong>both bounds included</strong>, unlike <C>rand</C>. A
                dice roll is <C>randInt(1, 6)</C>.
              </>
            ),
          },
          {
            name: 'pick(arr)',
            type: '<T>(readonly T[]) => T',
            description: (
              <>
                A uniformly chosen element. Throws a <C>RangeError</C> on an empty array — there is
                nothing to pick.
              </>
            ),
          },
          {
            name: 'chance(p)',
            type: '(number) => boolean',
            description: (
              <>
                True with probability <C>p</C>. <C>0</C> never, <C>1</C> always.
              </>
            ),
          },
          {
            name: 'weighted(table)',
            type: '<T extends { w: number }>(readonly T[]) => T',
            description: (
              <>
                An element chosen in proportion to its <C>w</C>. Weights are relative, not
                probabilities — they need not sum to anything. Throws a <C>RangeError</C> on an
                empty table, a negative or non-finite weight, or when no weight is positive.
              </>
            ),
          },
          {
            name: 'fork(label)',
            type: '(string) => Rng',
            description: (
              <>
                An independent generator, derived from the seed and <C>label</C> — never from this
                one&apos;s state, so drawing from it does not move this one. Exactly{' '}
                <C>{'createRng(`${seed}:${label}`)'}</C>, and forks nest.
              </>
            ),
          },
        ]}
      />

      <Callout tone="note" title="Weights are relative">
        <C>{`[{ w: 9 }, { w: 1 }]`}</C> and <C>{`[{ w: 90 }, { w: 10 }]`}</C> behave identically.
        Over ten thousand draws, the first table returned the rare entry 943 times — about the 10%
        you would expect.
      </Callout>

      <H2 id="streams">Keep your sequences separate</H2>
      <P>
        This is the single most useful habit, and the one that is painful to retrofit. Give each
        mechanic its own generator, keyed by seed, subject and purpose — which is what <C>fork()</C>{' '}
        is for:
      </P>

      <CodeBlock
        lang="ts"
        code={`const world = createRng('world-7')
const sol = world.fork('sol')

const loot       = sol.fork('loot')         // exactly createRng('world-7:sol:loot')
const encounters = sol.fork('encounters')

loot.randInt(1, 100)         // 41
encounters.randInt(1, 100)   // 51 — a different sequence entirely`}
      />

      <P>
        A fork depends on the seed and its label only. However many draws <C>world</C> or <C>sol</C>{' '}
        have made, <C>sol.fork(&apos;loot&apos;)</C> starts the same sequence — and drawing from it
        never moves them.
      </P>

      <P>
        Now adding a mechanic — a new <C>sol.fork(&apos;weather&apos;)</C> stream — does not disturb
        the loot anyone has already seen. With a single shared generator, every insertion shifts
        everything downstream of it.
      </P>

      <Callout tone="tip" title="A stream per entity works too">
        <C>world.fork(systemId).fork(&apos;loot&apos;)</C> gives each system its own independent
        sequence, which means you can generate a system&apos;s contents lazily, when the player
        first arrives, and still get the same result as if you had generated everything up front.
      </Callout>

      <H2 id="order">Draw order is a contract</H2>
      <P>
        A seeded generator replays a <em>sequence</em>. The values it returns depend on how many
        times it has been called — so the order of your draws becomes part of what the seed means.
      </P>

      <CodeBlock
        lang="ts"
        code={`// Version 1
const name   = rng.pick(NAMES)
const radius = rng.randInt(10, 20)

// Version 2 — one innocent line inserted
const name   = rng.pick(NAMES)
const rarity = rng.pick(RARITIES)   // ← everything after this shifts
const radius = rng.randInt(10, 20)  //    now a different number`}
      />

      <P>
        Same seed, different universe. That is not a bug in the generator; it is what a sequence is.
        Two ways to live with it:
      </P>

      <UL>
        <LI>
          <strong>Snapshot-test your generator.</strong> One test that builds a galaxy from a fixed
          seed and compares it to a stored result. The day a draw moves, the diff tells you — and
          you decide whether it was intended.
        </LI>
        <LI>
          <strong>Use separate streams</strong> (above), so an addition is confined to its own
          sequence instead of shifting all of them.
        </LI>
      </UL>

      <Callout tone="warning" title="Append, do not insert">
        When you must extend an existing stream, add your draws at the end. Everything already drawn
        keeps its value, and old seeds keep producing old worlds.
      </Callout>

      <H2 id="generator">Writing a universe generator</H2>
      <P>
        Put the two halves together and a generator is about thirty lines: draw the numbers, build
        the input object, hand it to <C>createGalaxy()</C>.
      </P>

      <CodeBlock
        lang="ts"
        filename="generate.ts"
        code={`import { createGalaxy, createRng, type Galaxy } from '@industrieh/starmap'

const NAMES = ['Sol', 'Vega', 'Rigel', 'Altair', 'Lyra', 'Cygnus']
const TYPES = [
  { w: 4, type: 'rocky' },
  { w: 3, type: 'gas' },
  { w: 2, type: 'frozen' },
  { w: 1, type: 'terran' },
] as const

export function generate(seed: string, count: number): Galaxy {
  const root = createRng(seed)
  const rng = root.fork('layout')

  const systems = Array.from({ length: count }, (_, i) => {
    // One stream per system: adding a mechanic later stays local.
    const local = root.fork(\`system-\${i}\`)
    const planetCount = local.randInt(0, 5)

    return {
      id: \`sys-\${i}\`,
      name: \`\${rng.pick(NAMES)} \${i}\`,
      x: rng.rand(-1000, 1000),
      y: rng.rand(-1000, 1000),
      star: { radius: local.randInt(12, 26) },
      planets: Array.from({ length: planetCount }, (_, p) => ({
        name: \`Planet \${p}\`,
        type: local.weighted(TYPES).type,
        orbit: 80 + p * local.randInt(40, 70),
        radius: local.randInt(3, 9),
        angle: local.rand(0, 360),
        period: local.randInt(10, 60),
      })),
    }
  })

  // A ring, so the network is connected by construction. Below three systems a
  // ring would link a pair twice, or a system to itself — both rejected by
  // validation — so a smaller galaxy gets a plain chain instead.
  const lanes =
    count < 3
      ? systems.slice(1).map((s) => ({ from: systems[0].id, to: s.id }))
      : systems.map((s, i) => ({ from: s.id, to: systems[(i + 1) % count].id }))

  // Record the seed: this galaxy can be rebuilt from it alone.
  return createGalaxy({ seed, systems, lanes })
}`}
      />

      <Callout tone="tip" title="Put the seed in the input">
        <C>createGalaxy()</C> copies <C>seed</C> straight to <C>meta.seed</C>. A save file then
        carries the recipe for its own world — useful when a player reports something odd.
      </Callout>

      <P>
        Connectivity is worth a thought at generation time: a ring guarantees one component. If you
        wire lanes by proximity instead, check the result with{' '}
        <A href={routes.page('starmap', 'querying')}>
          <C>connectedComponents()</C>
        </A>{' '}
        before returning it.
      </P>

      <H2 id="lower">The lower level</H2>
      <P>
        Two primitives are exported under <C>createRng()</C>, for when you want the machinery rather
        than the convenience.
      </P>

      <CodeBlock
        lang="ts"
        code={`import { hashSeed, mulberry32 } from '@industrieh/starmap'

// FNV-1a: any string to an unsigned 32-bit integer.
hashSeed('sol')       // 3795205537
hashSeed('orion-7')   // 1161567822

// mulberry32: 32 bits of state, very fast. Returns a plain () => number.
const next = mulberry32(42)
next()   // 0.601104…
next()   // 0.448291…`}
      />

      <P>
        <C>createRng(seed)</C> is exactly <C>mulberry32(hashSeed(seed))</C> wrapped in the
        conveniences. Reach for the primitives if you need a numeric seed, or a bare function to
        hand to something else.
      </P>

      <Callout tone="danger" title="Not for anything that must be unguessable">
        mulberry32 is a content generator, not a cryptographic one. Thirty-two bits of state are
        trivially recoverable. Never use it for tokens, keys, shuffles that must resist inspection,
        or anything an adversary benefits from predicting.
      </Callout>
    </>
  )
}
