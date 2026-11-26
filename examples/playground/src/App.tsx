/**
 * The shell: a seed in, a galaxy out.
 *
 * It holds only what describes the *universe* — the seed, how many systems, how
 * it looks. Everything about where you are and what you clicked lives one level
 * down, in `Explorer`.
 *
 * The `key` on `<ErrorBoundary>` is the interesting line. Generating a new
 * galaxy invalidates every id the explorer is holding — the ship's location, the
 * selection — and React's answer to "this state no longer applies" is to give
 * the component a new identity. A changed `key` throws the old state away and
 * mounts a fresh one, which is exactly what a new galaxy means. It resets the
 * boundary too: a galaxy that failed to build does not stay on screen once you
 * ask for another one.
 */

import { useMemo, useState, type JSX } from 'react'

import { ErrorBoundary } from './ErrorBoundary'
import { Explorer } from './Explorer'
import { THEMES, type ThemeName } from './themes'
import { clampSystemCount, generateGalaxy, SYSTEM_COUNT } from './universe/generate'
import { Toolbar } from './views/Toolbar'

export function App(): JSX.Element {
  const [{ seed, systemCount }, setUniverse] = useState({
    seed: 'orion-7',
    systemCount: SYSTEM_COUNT.default,
  })
  const [themeName, setThemeName] = useState<ThemeName>('dark')
  const [backdrop, setBackdrop] = useState(true)

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
        // Clamped here as well as in the toolbar: this is the only way into
        // the state, so no count outside the generator's range can get past it.
        onGenerate={(nextSeed, nextCount) =>
          setUniverse({ seed: nextSeed, systemCount: clampSystemCount(nextCount) })
        }
        onTheme={setThemeName}
        onBackdrop={setBackdrop}
      />

      <ErrorBoundary key={`${seed}:${systemCount}`}>
        <Universe seed={seed} systemCount={systemCount} theme={themeName} backdrop={backdrop} />
      </ErrorBoundary>
    </main>
  )
}

interface UniverseProps {
  seed: string
  systemCount: number
  theme: ThemeName
  backdrop: boolean
}

/**
 * The galaxy, and everything drawn from it.
 *
 * Generating happens here rather than in `App` so that it happens *inside* the
 * error boundary: when `createGalaxy()` rejects what the generator built, the
 * boundary catches it and shows the problems instead of a blank page.
 */
function Universe({ seed, systemCount, theme, backdrop }: UniverseProps): JSX.Element {
  // Generating takes a few milliseconds — not free, and nothing to redo when
  // only the theme or the backdrop changes, which re-render this component.
  const galaxy = useMemo(() => generateGalaxy(seed, systemCount), [seed, systemCount])

  return (
    <>
      <Explorer galaxy={galaxy} theme={THEMES[theme]} backdrop={backdrop} />

      <footer className="col-span-full flex justify-between gap-3 text-xs text-muted">
        <span>
          {galaxy.meta.systemCount} systems · {galaxy.meta.planetCount} planets ·{' '}
          {galaxy.meta.stationCount} stations · {galaxy.meta.laneCount} lanes
        </span>
        <span>
          seed “{galaxy.meta.seed}” · format v{galaxy.meta.formatVersion}
        </span>
      </footer>
    </>
  )
}
