/**
 * The inspector — **step 6 of the tour**.
 *
 * A click gives an id and nothing else. `indexGalaxy(galaxy)` turns that id
 * into the object plus the system it belongs to, for every kind of object at
 * once, and its `kind` field discriminates the union — so each branch below is
 * fully typed with no cast anywhere.
 *
 * Build that index **once** per galaxy: it walks the whole universe.
 */

import type { GalaxyIndex, IndexEntry } from '@cotontigeh/starmap'
import type { JSX } from 'react'

/** The way there, already resolved to names — see `findRoute()`. */
export interface RouteSummary {
  jumps: number
  distance: number
  /** Every system passed through, origin first. */
  path: string[]
}

export interface DetailsProps {
  index: GalaxyIndex
  id: string | null
  /** How to reach the selection from where the ship is, when it is a system. */
  route?: RouteSummary
}

/** The panel itself: a scrolling column, in the right-hand grid track. */
const PANEL =
  'relative flex max-h-[40vh] flex-col gap-3.5 overflow-y-auto rounded-xl border border-line' +
  ' bg-[linear-gradient(180deg,var(--color-panel-top),var(--color-panel)_140px)] p-4' +
  ' shadow-panel [scrollbar-color:var(--color-line)_transparent] [scrollbar-width:thin]' +
  ' wide:max-h-none'

/** A hairline of the object's own colour along the top edge, fading out. */
const EDGE =
  "before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:content-['']" +
  ' before:bg-[linear-gradient(90deg,var(--tint),transparent_70%)]'

/**
 * The accent, one whole class per kind. Written out rather than built from the
 * kind, because Tailwind scans this file as text: a name that only exists once
 * assembled at runtime is a name it never sees, and never generates.
 */
const TINT: Record<IndexEntry['kind'], string> = {
  system: '[--tint:var(--color-tint-system)]',
  star: '[--tint:var(--color-tint-star)]',
  planet: '[--tint:var(--color-tint-planet)]',
  station: '[--tint:var(--color-tint-station)]',
  gate: '[--tint:var(--color-tint-gate)]',
  field: '[--tint:var(--color-tint-field)]',
}

export function Details({ index, id, route }: DetailsProps): JSX.Element {
  const entry = id === null ? undefined : index.get(id)

  if (!entry) {
    return (
      <aside className={`${PANEL} justify-center`}>
        <p className="text-center text-balance text-muted">
          <span aria-hidden="true" className="mb-2.5 block text-[26px] text-accent opacity-50">
            ◎
          </span>
          Click anything — a system, a star, a planet, a station, a gate, a belt.
        </p>
      </aside>
    )
  }

  return (
    <aside className={`${PANEL} ${EDGE} ${TINT[entry.kind]}`}>
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title(entry)}</h2>
        <span className="shrink-0 rounded-full border border-(--tint)/35 bg-(--tint)/15 px-2 py-0.5 text-[11px] tracking-[0.06em] text-(--tint) uppercase">
          {entry.kind}
        </span>
      </header>

      {/* One row per fact: label left, value right, hairline between. A narrow
          column reads far better down than across. */}
      <dl className="flex flex-col">
        {rowsOf(entry).map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-3 border-t border-line/60 py-[7px] first:border-t-0"
          >
            <dt className="shrink-0 text-xs tracking-[0.04em] text-muted uppercase">{label}</dt>
            <dd className="text-right tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {route ? <Route route={route} /> : null}

      <p className="mt-auto pt-2.5 font-mono text-[11px] text-muted opacity-55">{entry.obj.id}</p>
    </aside>
  )
}

/**
 * The path, as a chain of hops — down rather than across, because a column this
 * narrow wraps a row of arrows onto two lines and leaves one dangling at the
 * start of the second.
 *
 * Each stop is a dot (`before:`) and the leg to the next one is a dashed line
 * (`after:`), hidden on the last. Which is the whole reason the connector is a
 * pseudo-element: the alternative is an empty `<span>` in the markup that means
 * nothing to a reader.
 */
function Route({ route }: { route: RouteSummary }): JSX.Element {
  return (
    <section className="rounded-lg border border-accent/25 bg-accent/8 px-3 py-2.5">
      <h3 className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-accent uppercase">
        route
      </h3>
      {route.jumps === 0 ? (
        <p className="text-muted">The ship is already here.</p>
      ) : (
        <>
          <ol className="mb-2.5 grid gap-2.5 pl-4">
            {route.path.map((name, i) => (
              <li key={`${name}-${i}`} className={HOP}>
                {name}
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted">
            {route.jumps} jumps · {Math.round(route.distance)} units
          </p>
        </>
      )}
    </section>
  )
}

/** A stop on the route: the dot, the leg to the next one, and the two ends. */
const HOP =
  'relative text-[13px] text-muted' +
  // The stop.
  " before:absolute before:top-[0.4em] before:-left-4 before:size-[7px] before:rounded-full before:bg-muted before:content-['']" +
  // The leg down to the next one — none after the last.
  " after:absolute after:top-[calc(0.4em+9px)] after:-left-[13px] after:h-[calc(100%-0.4em)] after:border-l after:border-dashed after:border-accent/65 after:content-['']" +
  ' last:after:hidden' +
  // Where the ship is, and where it is going.
  ' first:before:bg-transparent first:before:shadow-[inset_0_0_0_1.5px_var(--color-muted)]' +
  ' last:font-medium last:text-text last:before:bg-accent' +
  ' last:before:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_22%,transparent)]'

function title(entry: IndexEntry): string {
  return 'name' in entry.obj ? entry.obj.name : entry.kind
}

/** One list of label/value pairs per kind of object. */
function rowsOf(entry: IndexEntry): [string, string][] {
  switch (entry.kind) {
    case 'system': {
      const s = entry.obj
      return [
        ['faction', s.faction?.name ?? 'unclaimed'],
        ['security', s.security === undefined ? 'unknown' : securityLabel(s.security)],
        ['planets', String(s.planets.length)],
        ['gates', String(s.gates.length)],
        ['edge', `${s.outerLimit} units`],
      ]
    }
    case 'star':
      return [
        ['class', entry.obj.class ?? 'unclassified'],
        ['radius', String(entry.obj.radius)],
      ]
    case 'planet': {
      const p = entry.obj
      return [
        ['type', p.type ?? 'unsurveyed'],
        ['orbit', `${p.orbit} units, ${p.period}s per turn`],
        ['radius', String(p.radius)],
        ['moons', p.moons === undefined ? 'unknown' : String(p.moons)],
        ['habitable', p.habitable ? 'yes' : 'no'],
        ['stations', String(p.stations.length)],
      ]
    }
    case 'station':
      return [
        ['type', entry.obj.type ?? 'unspecified'],
        ['docks', entry.obj.docks === undefined ? 'unknown' : String(entry.obj.docks)],
        ['orbits', entry.obj.planetId],
      ]
    case 'gate':
      return [
        ['status', entry.obj.status],
        ['leads to', entry.obj.links.join(', ') || 'nowhere'],
        ['orbit', String(entry.obj.orbit)],
      ]
    case 'field': {
      const f = entry.obj
      return [
        ['shape', f.kind],
        ['richness', f.richness ?? 'unsurveyed'],
        ['rocks', String(f.rocks.length)],
      ]
    }
  }
}

/**
 * `security` is a number from 0 to 1 and the library says nothing about what it
 * means. These thresholds are a game decision — they live here, not in the
 * model.
 */
function securityLabel(value: number): string {
  if (value > 0.75) return `${value} · patrolled`
  if (value > 0.45) return `${value} · watched`
  if (value > 0.2) return `${value} · contested`
  return `${value} · lawless`
}
