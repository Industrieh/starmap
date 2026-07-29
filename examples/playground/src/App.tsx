/**
 * The shell: a seed in, a galaxy out.
 *
 * It holds only what describes the *universe* — the seed, how many systems, how
 * it looks. Everything about where you are and what you clicked lives one level
 * down, in `Explorer`.
 *
 * The `key` on `<Explorer>` is the interesting line. Generating a new galaxy
 * invalidates every id the explorer is holding — the ship's location, the
 * selection — and React's answer to "this state no longer applies" is to give
 * the component a new identity. A changed `key` throws the old state away and
 * mounts a fresh one, which is exactly what a new galaxy means.
 */

import { useMemo, useState, type JSX } from 'react'

import { Explorer } from './Explorer'
import { THEMES, type ThemeName } from './themes'
import { generateGalaxy } from './universe/generate'
import { Toolbar } from './views/Toolbar'

export function App(): JSX.Element {
  const [{ seed, systemCount }, setUniverse] = useState({ seed: 'orion-7', systemCount: 14 })
  const [themeName, setThemeName] = useState<ThemeName>('dark')
  const [backdrop, setBackdrop] = useState(true)

  // Generating is cheap — a few milliseconds — but it is not free, and it must
  // not run on every re-render: the drawing depends on `t`, which changes sixty
  // times a second.
  const galaxy = useMemo(() => generateGalaxy(seed, systemCount), [seed, systemCount])

  // Four rows, two columns: the toolbar, the status line and the meta line each
  // span both, which leaves the drawing and the inspector side by side on the
  // row that takes the leftover height. `minmax(0, …)` on both axes is what
  // allows a child to be smaller than its content — without it the SVG refuses
  // to shrink and the panel refuses to scroll. Below `wide:` the column is
  // gone and the five rows stack.
  return (
    <main
      data-theme={themeName}
      className="grid h-screen grid-cols-1 grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] gap-2.5 bg-bg p-2.5 text-sm/normal text-text wide:grid-cols-[minmax(0,1fr)_320px] wide:grid-rows-[auto_auto_minmax(0,1fr)_auto]"
    >
      <Toolbar
        seed={seed}
        systemCount={systemCount}
        themeName={themeName}
        backdrop={backdrop}
        onGenerate={(nextSeed, nextCount) =>
          setUniverse({ seed: nextSeed, systemCount: nextCount })
        }
        onTheme={setThemeName}
        onBackdrop={setBackdrop}
      />

      <Explorer
        key={`${seed}:${systemCount}`}
        galaxy={galaxy}
        theme={THEMES[themeName]}
        backdrop={backdrop}
      />

      <footer className="col-span-full flex justify-between gap-3 text-xs text-muted">
        <span>
          {galaxy.meta.systemCount} systems · {galaxy.meta.planetCount} planets ·{' '}
          {galaxy.meta.stationCount} stations · {galaxy.meta.laneCount} lanes
        </span>
        <span>
          seed “{galaxy.meta.seed}” · format v{galaxy.meta.formatVersion}
        </span>
      </footer>
    </main>
  )
}
