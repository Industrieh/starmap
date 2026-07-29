/**
 * The galaxy-level controls — seed, size, look.
 *
 * Every one of these rebuilds or redraws the whole universe, which is the point
 * of a playground: type a seed, get another galaxy, and the same seed always
 * gives the same one back.
 */

import { useState, type FormEvent, type JSX } from 'react'

import type { ThemeName } from '../themes'
import { BUTTON, BUTTON_ON, FIELD } from '../ui'

export interface ToolbarProps {
  seed: string
  systemCount: number
  themeName: ThemeName
  backdrop: boolean
  onGenerate: (seed: string, systemCount: number) => void
  onTheme: (theme: ThemeName) => void
  onBackdrop: (on: boolean) => void
}

export function Toolbar(props: ToolbarProps): JSX.Element {
  // The fields are local until submitted, so typing a seed does not rebuild the
  // galaxy on every keystroke.
  const [seed, setSeed] = useState(props.seed)
  const [count, setCount] = useState(props.systemCount)

  const submit = (event: FormEvent): void => {
    event.preventDefault()
    props.onGenerate(seed.trim() || 'starmap', count)
  }

  const surprise = (): void => {
    // `Math.random()` is fine here: this is the application choosing a seed. The
    // generator itself never calls it — that is what makes a seed reproducible.
    const next = Math.random().toString(36).slice(2, 8)
    setSeed(next)
    props.onGenerate(next, count)
  }

  return (
    <form className="col-span-full flex flex-wrap items-center gap-2.5" onSubmit={submit}>
      <strong className="tracking-[0.08em] text-accent uppercase">starmap</strong>

      <label className="flex items-center gap-1.5 text-muted">
        seed
        <input
          className={`${FIELD} w-36`}
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          spellCheck={false}
        />
      </label>

      <label className="flex items-center gap-1.5 text-muted">
        systems
        <input
          className={`${FIELD} w-18`}
          type="number"
          min={2}
          max={60}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
      </label>

      <button className={BUTTON} type="submit">
        Generate
      </button>
      <button className={BUTTON} type="button" onClick={surprise}>
        Surprise me
      </button>

      <div className="flex-1" />

      <button
        className={BUTTON}
        type="button"
        onClick={() => props.onTheme(props.themeName === 'dark' ? 'light' : 'dark')}
      >
        {props.themeName === 'dark' ? '☾ dark' : '☀ light'}
      </button>
      <button
        className={props.backdrop ? `${BUTTON} ${BUTTON_ON}` : BUTTON}
        type="button"
        onClick={() => props.onBackdrop(!props.backdrop)}
      >
        ✦ stars
      </button>
    </form>
  )
}
