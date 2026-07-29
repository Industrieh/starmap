/**
 * The bridge between a drawing and the mouse — **step 3 of the tour**.
 *
 * `renderSystem()` and `renderGalaxy()` return a string, so a React component
 * that shows one is `dangerouslySetInnerHTML` and nothing more. There is no
 * `<Planet>` component in this app, and the renderer ships none.
 *
 * Interactivity rests on one thing: every object the renderer draws sits in a
 * group carrying `data-kind` and `data-id`.
 *
 *     <g data-kind="planet" data-id="sys-3-p2" transform="translate(129.9 75)">
 *
 * So a single listener on the container is enough. `closest('[data-id]')` walks
 * up from whatever was actually hit — the shading circle of a planet, the square
 * of a gate — to the group the renderer tagged. Nothing is bound per object,
 * which is what lets the whole markup be replaced on the next frame.
 *
 * That last part is also why this component cannot use `click` and `dblclick`.
 * A system drawing is rebuilt sixty times a second, so the circle the pointer
 * went down on is gone by the time it comes back up: the browser then reports
 * the click on the nearest surviving ancestor — this `<div>`, which carries no
 * `data-id` — and never reports a double-click at all, because that needs two
 * clicks on one node. Both gestures are therefore recognised from `pointerdown`,
 * where the hit is read while the node still exists.
 */

import { useMemo, useRef, type JSX, type PointerEvent } from 'react'

/** What was under the pointer: the object's id and what kind of thing it is. */
export interface Hit {
  id: string
  kind: string
}

export interface SvgStageProps {
  /** The SVG document, as returned by the renderer. */
  svg: string
  className?: string
  /** An object was pressed. */
  onPick?: (hit: Hit) => void
  /** The same object was pressed twice in a row — "enter" and "travel" here. */
  onEnter?: (hit: Hit) => void
  /** Pointer moved onto an object, or off every object (`null`). */
  onHover?: (hit: Hit | null) => void
}

/**
 * The group the renderer tagged, walking up from whatever was actually hit.
 *
 * `null` when the pointer is over the background, an orbit line or the backdrop
 * — none of which the renderer tags, because none of them is an object.
 */
function hitOf(target: EventTarget | null): Hit | null {
  const node = (target as Element | null)?.closest('[data-id]')
  const id = node?.getAttribute('data-id')
  return id ? { id, kind: node?.getAttribute('data-kind') ?? '' } : null
}

/** How long after a press a second one still counts as a double-click. */
const DOUBLE_CLICK_MS = 400

/** How far the pointer may travel between the two, in CSS pixels. */
const DOUBLE_CLICK_SLOP = 8

export function SvgStage({ svg, className, onPick, onEnter, onHover }: SvgStageProps): JSX.Element {
  // The previous press: what it hit, when, and where. Kept in a ref because
  // nothing on screen depends on it — it only has to survive to the next press.
  const previous = useRef<{ id: string; time: number; x: number; y: number } | null>(null)

  const press = (event: PointerEvent<HTMLDivElement>): void => {
    const hit = hitOf(event.target)
    if (!hit) {
      previous.current = null
      return
    }

    const last = previous.current
    const double =
      last !== null &&
      last.id === hit.id &&
      event.timeStamp - last.time < DOUBLE_CLICK_MS &&
      Math.hypot(event.clientX - last.x, event.clientY - last.y) < DOUBLE_CLICK_SLOP

    if (double) {
      // Cleared, so three presses in a row are one double-click and not two.
      previous.current = null
      onEnter?.(hit)
      return
    }

    previous.current = { id: hit.id, time: event.timeStamp, x: event.clientX, y: event.clientY }
    onPick?.(hit)
  }

  // Hover is reported on every move, including the moves that leave every
  // object — the caller wants to know when nothing is under the pointer too.
  const hover = (event: PointerEvent<HTMLDivElement>): void => onHover?.(hitOf(event.target))

  // A fresh `{ __html }` object counts as a changed prop, and React writes the
  // markup again whether or not the string moved — sixty pointless rewrites a
  // second on a galaxy map, which never changes between frames. Keeping the
  // object stable for as long as the string is leaves that DOM alone.
  const html = useMemo(() => ({ __html: svg }), [svg])

  // `stage` is not decoration: it is the hook the rules in `styles.css` need to
  // reach inside the injected drawing, where there is no element to class.
  // `select-none`, because entering a system is two presses on one label —
  // which is also how a browser is asked to select the text under it.
  return (
    <div
      className={`stage min-h-0 overflow-hidden rounded-xl border border-line shadow-panel select-none ${className ?? ''}`}
      onPointerDown={press}
      onPointerMove={onHover ? hover : undefined}
      onPointerLeave={onHover ? () => onHover(null) : undefined}
      dangerouslySetInnerHTML={html}
    />
  )
}
