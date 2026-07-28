import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, PointerEventHandler, RefObject } from 'react'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Échelle monde/écran : on garde le plus grand ratio pour respecter `xMidYMid meet`. */
const unitPerPx = (rect: DOMRect, v: ViewBox) => Math.max(v.w / rect.width, v.h / rect.height)

/** Fenêtre visible, en unités monde — sérialisée telle quelle dans `viewBox`. */
export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

export interface ViewportOptions {
  minZoom?: number
  maxZoom?: number
}

export interface ViewportHandlers {
  onPointerDown: PointerEventHandler<SVGSVGElement>
  onPointerMove: PointerEventHandler<SVGSVGElement>
  onPointerUp: PointerEventHandler<SVGSVGElement>
  onPointerCancel: PointerEventHandler<SVGSVGElement>
  onPointerLeave: PointerEventHandler<SVGSVGElement>
}

export interface Viewport {
  view: ViewBox
  svgRef: RefObject<SVGSVGElement | null>
  zoom: (factor: number) => void
  zoomAt: (factor: number, sx: number, sy: number) => void
  reset: () => void
  /** vrai si le pointeur a été traîné : à tester avant de traiter un clic */
  hasDragged: () => boolean
  handlers: ViewportHandlers
  viewBox: string
}

interface DragState {
  cx: number
  cy: number
  view: ViewBox
  captured: boolean
}

/**
 * Pan (drag) + zoom (molette) sur un viewBox SVG.
 * `initial` n'est lu qu'au montage : remonter le composant (prop `key`) pour recadrer.
 */
export function useViewport(
  initial: ViewBox,
  { minZoom = 0.06, maxZoom = 4 }: ViewportOptions = {},
): Viewport {
  const [view, setView] = useState<ViewBox>(initial)
  const base = useRef<ViewBox>(initial)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const drag = useRef<DragState | null>(null)
  const moved = useRef(false)

  const zoomAt = useCallback(
    (factor: number, sx: number, sy: number) => {
      setView((v) => {
        const target = clamp(v.w * factor, base.current.w * minZoom, base.current.w * maxZoom)
        const k = target / v.w
        return {
          x: sx - (sx - v.x) * k,
          y: sy - (sy - v.y) * k,
          w: v.w * k,
          h: v.h * k,
        }
      })
    },
    [minZoom, maxZoom],
  )

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      setView((v) => {
        const u = unitPerPx(rect, v)
        const sx = v.x + v.w / 2 + (e.clientX - rect.left - rect.width / 2) * u
        const sy = v.y + v.h / 2 + (e.clientY - rect.top - rect.height / 2) * u
        const target = clamp(
          v.w * Math.exp(e.deltaY * 0.0012),
          base.current.w * minZoom,
          base.current.w * maxZoom,
        )
        const k = target / v.w
        return { x: sx - (sx - v.x) * k, y: sy - (sy - v.y) * k, w: v.w * k, h: v.h * k }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [minZoom, maxZoom])

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    moved.current = false
    drag.current = { cx: e.clientX, cy: e.clientY, view, captured: false }
  }

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d) return
    const rect = e.currentTarget.getBoundingClientRect()
    const u = unitPerPx(rect, d.view)
    const dx = (e.clientX - d.cx) * u
    const dy = (e.clientY - d.cy) * u
    // capture différée : sans ça le pointer capture détourne le `click` des enfants SVG
    if (!d.captured && Math.hypot(e.clientX - d.cx, e.clientY - d.cy) > 3) {
      d.captured = true
      moved.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (!d.captured) return
    setView({ ...d.view, x: d.view.x - dx, y: d.view.y - dy })
  }

  const endDrag = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (drag.current?.captured && e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    drag.current = null
  }

  const reset = useCallback(() => setView(base.current), [])
  const zoom = useCallback(
    (factor: number) =>
      setView((v) => {
        const cx = v.x + v.w / 2
        const cy = v.y + v.h / 2
        const target = clamp(v.w * factor, base.current.w * minZoom, base.current.w * maxZoom)
        const k = target / v.w
        return { x: cx - (v.w * k) / 2, y: cy - (v.h * k) / 2, w: v.w * k, h: v.h * k }
      }),
    [minZoom, maxZoom],
  )

  return {
    view,
    svgRef,
    zoom,
    zoomAt,
    reset,
    hasDragged: () => moved.current,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onPointerLeave: endDrag,
    },
    viewBox: `${view.x} ${view.y} ${view.w} ${view.h}`,
  }
}
