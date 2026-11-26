/**
 * The simulation clock, shared without re-rendering the whole app.
 *
 * `useAnimationTime()` changes sixty times a second. Called in `Explorer`, it
 * would re-render everything below it on every frame — the galaxy map and the
 * inspector included, although neither depends on time.
 *
 * So the clock lives in `<Clock>`, and the time travels through a context. The
 * trick is the `children` prop: when the time changes, `<Clock>` re-renders,
 * but the elements it was handed are the same objects as on the last frame, so
 * React skips them — except the components that read the context. Here that is
 * the system drawing and the `t =` label, and nothing else.
 */

import { createContext, useContext, type JSX, type ReactNode } from 'react'

import { useAnimationTime } from './useAnimationTime'

const TimeContext = createContext(0)

export interface ClockProps {
  /** Simulation seconds per real second. `0` pauses without resetting. */
  speed: number
  children: ReactNode
}

/** Runs the clock and hands the time to whatever reads {@link useSimulationTime}. */
export function Clock({ speed, children }: ClockProps): JSX.Element {
  const t = useAnimationTime(speed)
  return <TimeContext value={t}>{children}</TimeContext>
}

/** The current simulation time, in seconds. Re-renders its caller every frame. */
export function useSimulationTime(): number {
  return useContext(TimeContext)
}

/** The `t = 12.3s` readout: the smallest component that has to tick. */
export function ClockLabel(): JSX.Element {
  const t = useSimulationTime()
  return <span className="text-muted tabular-nums">t = {t.toFixed(1)}s</span>
}
