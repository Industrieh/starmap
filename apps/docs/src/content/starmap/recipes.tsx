import type { JSX } from 'react'

import { CodeBlock } from '@/components/code-block'
import { Callout } from '@/components/docs/callout'
import { A, C, H2, LI, Lead, P, Quote, UL } from '@/components/docs/prose'
import type { TocEntry } from '@/content/registry'
import { routes } from '@/lib/routes'

export const toc: readonly TocEntry[] = [
  { id: 'game-state', title: 'Keep game state alongside', depth: 2 },
  { id: 'saving', title: 'Save and load', depth: 2 },
  { id: 'migrations', title: 'Change the world without breaking saves', depth: 2 },
  { id: 'appearance', title: 'Attach colours and labels', depth: 2 },
  { id: 'content-files', title: 'Load a universe from a file', depth: 2 },
  { id: 'scale', title: 'Scale up', depth: 2 },
]

export default function Content(): JSX.Element {
  return (
    <>
      <Lead>
        Short answers to the questions that come up twice — the ones about fitting this library into
        a real game rather than about the API itself.
      </Lead>

      <H2 id="game-state">Keep game state alongside</H2>
      <P>
        This is the decision the whole library leans on, so it is worth stating plainly:{' '}
        <strong>a Galaxy is terrain, not a game.</strong> Nothing in it changes once it is built.
      </P>

      <Quote>
        If a value would differ between two save files of the same universe, it is game state, and
        it does not belong in the model.
      </Quote>

      <P>
        The pattern is a separate object, keyed by the same ids. The galaxy is the map; your state
        is what has happened on it.
      </P>

      <CodeBlock
        lang="ts"
        filename="state.ts"
        code={`// The terrain — built once, never mutated.
const galaxy = createGalaxy(input)
const index = indexGalaxy(galaxy)

// Your game — keyed by the same ids.
interface GameState {
  shipSystemId: string
  visited: Set<string>
  owners: Map<string, string>          // systemId → factionId, as it changes hands
  stock: Map<string, Map<string, number>>  // stationId → goods
}

const state: GameState = {
  shipSystemId: 'sol',
  visited: new Set(['sol']),
  owners: new Map(),
  stock: new Map(),
}

// Reading the two together is a lookup, not a search.
const here = index.get(state.shipSystemId)
if (here?.kind === 'system') {
  console.log(\`\${here.obj.name} — \${state.visited.has(here.obj.id) ? 'known' : 'unexplored'}\`)
}`}
      />

      <Callout tone="danger" title="Do not write to a Galaxy">
        Adding <C>planet.owner</C> or <C>system.visited</C> feels convenient for about a day. Then
        you serialize, and your save carries a copy of the entire universe — which you cannot
        migrate, cannot regenerate, and cannot diff.
      </Callout>

      <H2 id="saving">Save and load</H2>
      <P>
        A <C>Galaxy</C> is plain JSON — no classes, no methods, no circular references. It
        round-trips through <C>JSON.stringify</C> without ceremony.
      </P>

      <P>
        Coming back the other way, though, <strong>TypeScript guarantees nothing</strong>. A save
        file may have been hand-edited, truncated, or written by a version that no longer matches.
        That is what <C>validateGalaxy()</C> is for:
      </P>

      <CodeBlock
        lang="ts"
        code={`import { assertValidGalaxy, validateGalaxy, type Galaxy } from '@industrieh/starmap'

function loadGalaxy(json: string): Galaxy {
  const data: unknown = JSON.parse(json)

  // validateGalaxy() never throws. A save written for another FORMAT_VERSION comes
  // back as a single issue on meta.formatVersion, with nothing else checked —
  // its shape is another contract's, so migrate it first.
  if (validateGalaxy(data)[0]?.path === 'meta.formatVersion') {
    return loadGalaxy(JSON.stringify(migrate(data)))   // migrate() is yours
  }

  assertValidGalaxy(data)   // throws GalaxyValidationError, every problem listed
  return data               // typed as a Galaxy from here on — no cast
}`}
      />

      <Callout tone="tip" title="If you stored the seed, you may not need the file at all">
        A generated universe rebuilds from its seed. Saving <C>{`{ seed, t, state }`}</C> instead of
        the whole galaxy is smaller, migrates better, and cannot go stale relative to your
        generator.
      </Callout>

      <H2 id="migrations">Change the world without breaking saves</H2>
      <P>
        Your universe will change — a new system, a renamed planet, a reworked lane network. Old
        saves hold ids from the old world. Three habits keep that from hurting:
      </P>

      <UL>
        <LI>
          <strong>Give explicit ids to anything you refer to.</strong> Derived ids like{' '}
          <C>sol-p1</C> encode a position; insert a planet and every later id shifts.{' '}
          <C>id: &apos;earth&apos;</C> survives.
        </LI>
        <LI>
          <strong>Bump nothing silently.</strong> <C>meta.formatVersion</C> records the shape of the
          data at build time, and <C>validateGalaxy()</C> compares it on load: a save from another
          format is reported as exactly that, before a missing field is.
        </LI>
        <LI>
          <strong>Treat unknown ids as data, not as crashes.</strong> A save referring to a system
          you removed is a normal event once a game ships.
        </LI>
      </UL>

      <CodeBlock
        lang="ts"
        code={`// Reconcile a save against the current universe.
function reconcile(state: GameState, index: GalaxyIndex): GameState {
  const stillThere = (id: string) => index.has(id)

  return {
    ...state,
    // The ship's system may no longer exist — put it somewhere real.
    shipSystemId: stillThere(state.shipSystemId) ? state.shipSystemId : 'sol',
    visited: new Set([...state.visited].filter(stillThere)),
    owners: new Map([...state.owners].filter(([id]) => stillThere(id))),
  }
}`}
      />

      <H2 id="appearance">Attach colours and labels</H2>
      <P>
        The model carries no appearance on purpose — <C>type</C>, <C>class</C> and <C>status</C> are
        labels, and what they look like is a decision your game makes. Keep the mapping in one
        table:
      </P>

      <CodeBlock
        lang="ts"
        filename="appearance.ts"
        code={`import type { PlanetType } from '@industrieh/starmap'

const PLANET_STYLE: Record<string, { fill: string; label: string }> = {
  terran:      { fill: '#4ade80', label: 'Terran' },
  ocean:       { fill: '#38bdf8', label: 'Ocean' },
  gas:         { fill: '#fbbf24', label: 'Gas giant' },
  frozen:      { fill: '#e0f2fe', label: 'Frozen' },
  rocky:       { fill: '#a8a29e', label: 'Rocky' },
}

const FALLBACK = { fill: '#6b7280', label: 'Unknown' }

// Types are open unions, so a value you invented is still valid — which is
// exactly why the lookup needs a fallback rather than an exhaustive switch.
export function styleOf(type: PlanetType | undefined) {
  return (type && PLANET_STYLE[type]) ?? FALLBACK
}`}
      />

      <Callout tone="note" title="Why a fallback and not a switch">
        <C>PlanetType</C> accepts any string. An exhaustive <C>switch</C> would compile today and
        silently miss the type you add next month — the fallback is not defensive programming, it is
        the contract.
      </Callout>

      <H2 id="content-files">Load a universe from a file</H2>
      <P>
        Writing a universe by hand in TypeScript gets you autocomplete and typechecking. Writing it
        in JSON gets you a file a designer can edit without a build step. Both end at{' '}
        <C>createGalaxy()</C>:
      </P>

      <CodeBlock
        lang="ts"
        code={`import { createGalaxy, type GalaxyInput } from '@industrieh/starmap'

// The JSON is *input*, not a finished galaxy — so it can stay terse, and
// createGalaxy fills in the ids, the counts and the lane lengths.
const input = JSON.parse(await readFile('universe.json', 'utf8')) as GalaxyInput

const galaxy = createGalaxy(input)   // throws, every problem listed with its path — a wrong shape too`}
      />

      <P>
        The distinction matters. A hand-written <em>input</em> file omits everything derivable and
        stays readable. A serialized <em>galaxy</em> is complete and verbose, and is what you save
        at runtime.
      </P>

      <H2 id="scale">Scale up</H2>
      <P>Where the naive implementations stop being enough, and what to do about it:</P>

      <UL>
        <LI>
          <strong>Many routes, every frame.</strong>{' '}
          <A href={routes.page('starmap', 'querying')}>
            <C>findRoute()</C>
          </A>{' '}
          is Dijkstra on a binary heap, <C>O((V + E) log V)</C>; what adds up is rebuilding the
          graph on each call when you hand it a galaxy. Build it once with <C>indexNetwork()</C> and
          pass that instead.
        </LI>
        <LI>
          <strong>Very large galaxies in memory.</strong> A galaxy is plain data, so it splits: keep
          the system positions and lanes loaded, and load each system&apos;s contents when the
          player arrives. Validation runs per galaxy, so validate the chunks as you build them.
        </LI>
        <LI>
          <strong>Hot paths you have already checked.</strong>{' '}
          <C>{`createGalaxy(input, { validate: false })`}</C> skips the pass. Only worth it if you
          are rebuilding constantly from input you produced yourself — the check is what stops a
          broken universe from existing.
        </LI>
        <LI>
          <strong>Rendering thousands of objects.</strong> Not this library&apos;s problem, but
          worth saying: <C>systemPositions()</C> handles one system, and one system is a few dozen
          objects. It is not what will slow you down.
        </LI>
      </UL>

      <Callout tone="warning" title="Turning validation off is a last resort">
        It is the one thing standing between a typo and a universe that fails three screens later,
        somewhere unrelated. Measure first; the check is a single pass.
      </Callout>
    </>
  )
}
