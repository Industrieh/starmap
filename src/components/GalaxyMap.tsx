import { useMemo, useState } from 'react'

import { backdropStars } from '../lib/space'
import { useViewport } from '../lib/useViewport'
import type { Galaxy, Hyperlane, Selection, StarSystem } from '../types/galaxy'

interface GalaxyMapProps {
  galaxy: Galaxy
  selected: Selection | null
  onSelect: (sel: Selection) => void
  onEnter: (id: string) => void
}

export default function GalaxyMap({ galaxy, selected, onSelect, onEnter }: GalaxyMapProps) {
  const [hover, setHover] = useState<string | null>(null)

  const bounds = useMemo(() => {
    const pad = 220
    const xs = galaxy.systems.map((s) => s.x)
    const ys = galaxy.systems.map((s) => s.y)
    const x = Math.min(...xs) - pad
    const y = Math.min(...ys) - pad
    return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y }
  }, [galaxy])

  const vp = useViewport(bounds, { minZoom: 0.08, maxZoom: 2.5 })
  const stars = useMemo(() => backdropStars(600, galaxy.meta.galaxyRadius * 1.6, 7), [galaxy])

  const byId = useMemo(
    () => new Map<string, StarSystem>(galaxy.systems.map((s) => [s.id, s])),
    [galaxy],
  )
  const selectedId = selected?.kind === 'system' ? selected.id : null
  const activeId = hover ?? selectedId

  const isActiveLane = (l: Hyperlane) =>
    activeId !== null && (l.from === activeId || l.to === activeId)

  const click = (sys: StarSystem) => {
    if (vp.hasDragged()) return
    onSelect({ kind: 'system', id: sys.id })
  }

  return (
    <div className="map">
      <svg
        ref={vp.svgRef}
        viewBox={vp.viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="map-svg"
        {...vp.handlers}
      >
        <defs>
          <radialGradient id="sysGlow">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#8fb6ff" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#8fb6ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className="backdrop">
          {stars.map((s, i) => (
            // oxlint-disable-next-line react/no-array-index-key -- décor statique, jamais réordonné
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#cdd9ff" opacity={s.o} />
          ))}
        </g>

        <g className="lanes">
          {galaxy.lanes.map((l) => {
            const a = byId.get(l.from)
            const b = byId.get(l.to)
            if (!a || !b) return null
            const on = isActiveLane(l)
            return (
              <line
                key={l.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={on ? '#9a7bff' : '#39507a'}
                strokeWidth={on ? 2.4 : 1.2}
                strokeDasharray={on ? 'none' : '7 7'}
                opacity={on ? 0.95 : 0.55}
              />
            )
          })}
        </g>

        <g className="systems" style={{ fontSize: `${vp.view.w / 75}px` }}>
          {galaxy.systems.map((s) => {
            const isSel = s.id === selectedId
            const isHover = s.id === hover
            return (
              <g
                key={s.id}
                className="system-node"
                transform={`translate(${s.x} ${s.y})`}
                onPointerEnter={() => setHover(s.id)}
                onPointerLeave={() => setHover((h) => (h === s.id ? null : h))}
                onClick={() => click(s)}
                onDoubleClick={() => onEnter(s.id)}
              >
                <circle r={54} fill="url(#sysGlow)" opacity={isHover || isSel ? 0.9 : 0.5} />
                <circle
                  r={26}
                  fill="none"
                  stroke={s.faction.color}
                  strokeWidth={isSel ? 2.2 : 1}
                  opacity={isSel ? 0.95 : 0.4}
                  strokeDasharray={isSel ? 'none' : '3 5'}
                />
                <circle r={9} fill={s.star.color} />
                <circle r={9} fill="none" stroke="#0b1020" strokeWidth={0.6} />
                <text className="sys-label" y={-34} textAnchor="middle">
                  {s.name}
                </text>
                <text className="sys-sub" y={44} textAnchor="middle">
                  {s.planets.length}P · {s.gates.length}G
                  {s.asteroidFields.length ? ` · ${s.asteroidFields.length}A` : ''}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      <div className="map-hint">
        molette : zoom · glisser : déplacer · clic : sélectionner · double-clic : entrer
      </div>

      <div className="zoom-controls">
        <button onClick={() => vp.zoom(0.75)} title="Zoom avant">
          +
        </button>
        <button onClick={() => vp.zoom(1.33)} title="Zoom arrière">
          −
        </button>
        <button onClick={vp.reset} title="Recadrer">
          ⌂
        </button>
      </div>
    </div>
  )
}
