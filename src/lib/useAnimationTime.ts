import { useEffect, useRef, useState } from 'react'

/** Horloge de simulation (secondes), accélérable et pausable. */
export function useAnimationTime(speed = 1, paused = false): number {
  const [t, setT] = useState(0)
  const clock = useRef(0)

  useEffect(() => {
    if (paused || speed === 0) return
    let raf: number
    let last = performance.now()
    const loop = (now: number) => {
      clock.current += ((now - last) / 1000) * speed
      last = now
      setT(clock.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [speed, paused])

  return t
}
