import { useEffect, useState } from 'react'

/**
 * Simulation time, in seconds, advanced by the browser's frame clock.
 *
 * The libraries keep no clock on purpose: `renderSystem()` draws the moment it
 * is handed. This hook is the whole of what an application has to add, and it
 * belongs to the application because pausing, rewinding and fast-forwarding are
 * game decisions.
 *
 * @param speed simulation seconds per real second. `0` freezes time without
 * resetting it, which is why the value is kept in state rather than recomputed
 * from a start timestamp.
 */
export function useAnimationTime(speed: number): number {
  const [t, setT] = useState(0)

  useEffect(() => {
    if (speed === 0) return

    let frame = 0
    let last = performance.now()

    const tick = (now: number): void => {
      // Advance by the real elapsed time rather than a fixed step, so a dropped
      // frame does not slow the simulation down.
      const elapsed = (now - last) / 1000
      last = now
      setT((previous) => previous + elapsed * speed)
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [speed])

  return t
}
