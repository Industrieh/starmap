import { useMemo } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

import { backdropStars, ROUTE_STYLE, STATION_GLYPH, systemPositions, toRad } from '../lib/space'
import { useAnimationTime } from '../lib/useAnimationTime'
import { useViewport } from '../lib/useViewport'
import type { ObjectKind, Selection, StarSystem, SystemsById } from '../types/galaxy'

function arcPath(r: number, startDeg: number, sweepDeg: number): string {
  if (sweepDeg >= 359.5) {
    return `M ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0`
  }
  const a0 = toRad(startDeg)
  const a1 = toRad(startDeg + sweepDeg)
  const large = sweepDeg > 180 ? 1 : 0
  return `M ${Math.cos(a0) * r} ${Math.sin(a0) * r} A ${r} ${r} 0 ${large} 1 ${Math.cos(a1) * r} ${Math.sin(a1) * r}`
}

interface SystemViewProps {
  system: StarSystem
  systemsById: SystemsById
  selected: Selection | null
  onSelect: (sel: Selection) => void
  onTravel: (systemId: string) => void
  speed: number
  paused: boolean
}

export default function SystemView({
  system,
  systemsById,
  selected,
  onSelect,
  onTravel,
  speed,
  paused,
}: SystemViewProps) {
  const t = useAnimationTime(speed, paused)
  const span = system.outerLimit * 1.45
  const vp = useViewport(
    { x: -span, y: -span, w: span * 2, h: span * 2 },
    { minZoom: 0.12, maxZoom: 6 },
  )
  const stars = useMemo(() => backdropStars(420, span * 1.6, 13), [span])
  const pos = systemPositions(system, t)

  const fs = vp.view.w / 65
  const isSel = (kind: ObjectKind, id: string) => selected?.kind === kind && selected?.id === id
  const select = (kind: ObjectKind, id: string) => (e: ReactMouseEvent) => {
    e.stopPropagation()
    if (!vp.hasDragged()) onSelect({ kind, id })
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
          <radialGradient id="starGlow">
            <stop offset="0%" stopColor={system.star.color} stopOpacity="0.85" />
            <stop offset="35%" stopColor={system.star.color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={system.star.color} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="starCore">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor={system.star.color} />
            <stop offset="100%" stopColor={system.star.color} stopOpacity="0.85" />
          </radialGradient>
          <radialGradient id="shade" cx="0.32" cy="0.3" r="0.85">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="45%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
          </radialGradient>
        </defs>

        <g className="backdrop">
          {stars.map((s, i) => (
            // oxlint-disable-next-line react/no-array-index-key -- décor statique, jamais réordonné
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#cdd9ff" opacity={s.o} />
          ))}
        </g>

        {/* orbites */}
        <g className="orbits">
          {system.planets.map((p) => (
            <circle
              key={p.id}
              r={p.orbit}
              fill="none"
              stroke="#2b3d63"
              strokeWidth={0.7}
              opacity={0.75}
            />
          ))}
          {system.gates.map((g) => (
            <circle
              key={g.id}
              r={g.orbit}
              fill="none"
              stroke="#43356e"
              strokeWidth={0.6}
              strokeDasharray="3 9"
              opacity={0.7}
            />
          ))}
        </g>

        {/* champs d'astéroïdes */}
        <g className="fields">
          {system.asteroidFields.map((f) => {
            const on = isSel('field', f.id)
            return (
              <g key={f.id} className="clickable" onClick={select('field', f.id)}>
                {f.kind === 'belt' ? (
                  <path
                    d={arcPath(f.orbit, f.arcStart, f.arcSweep)}
                    fill="none"
                    stroke={on ? '#c9a227' : '#6b5a2a'}
                    strokeOpacity={on ? 0.5 : 0.22}
                    strokeWidth={f.width + 8}
                  />
                ) : (
                  <circle
                    cx={f.x}
                    cy={f.y}
                    r={f.radius + 6}
                    fill={on ? 'rgba(201,162,39,0.10)' : 'rgba(201,162,39,0.05)'}
                    stroke={on ? '#c9a227' : '#6b5a2a'}
                    strokeWidth={0.8}
                    strokeDasharray="4 6"
                  />
                )}
                {f.rocks.map((r, i) => (
                  // oxlint-disable-next-line react/no-array-index-key -- blocs figés, générés une fois
                  <circle key={i} cx={r[0]} cy={r[1]} r={r[2]} fill="#a89468" opacity={0.85} />
                ))}
              </g>
            )
          })}
        </g>

        {/* routes locales */}
        <g className="routes">
          {system.localRoutes.map((r) => {
            const a = pos.get(r.from.id)
            const b = pos.get(r.to.id)
            if (!a || !b) return null
            const st = ROUTE_STYLE[r.type] ?? ROUTE_STYLE.orbital
            return (
              <line
                key={r.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={st.stroke}
                strokeWidth={st.width}
                strokeDasharray={st.dash}
                opacity={0.55}
              />
            )
          })}
        </g>

        {/* étoile */}
        <g className="clickable" onClick={select('star', system.star.id)}>
          <circle r={system.star.radius * 6} fill="url(#starGlow)" />
          <circle r={system.star.radius} fill="url(#starCore)" />
          {isSel('star', system.star.id) && (
            <circle
              r={system.star.radius + 8}
              fill="none"
              stroke="#fff"
              strokeWidth={1}
              opacity={0.8}
            />
          )}
        </g>

        {/* planètes + stations */}
        <g style={{ fontSize: `${fs}px` }}>
          {system.planets.map((p) => {
            const pp = pos.get(p.id)
            if (!pp) return null
            const on = isSel('planet', p.id)
            return (
              <g key={p.id} transform={`translate(${pp.x} ${pp.y})`}>
                <g className="clickable" onClick={select('planet', p.id)}>
                  <circle r={p.radius + 10} fill="transparent" />
                  {(p.type === 'gas' || p.type === 'ice-giant') && p.moons >= 3 && (
                    <ellipse
                      rx={p.radius * 1.9}
                      ry={p.radius * 0.55}
                      fill="none"
                      stroke={p.color}
                      strokeOpacity={0.45}
                      strokeWidth={p.radius * 0.28}
                      transform="rotate(-18)"
                    />
                  )}
                  <circle r={p.radius} fill={p.color} />
                  <circle r={p.radius} fill="url(#shade)" />
                  {p.habitable && (
                    <circle
                      r={p.radius + 3.5}
                      fill="none"
                      stroke="#4fd8a5"
                      strokeWidth={0.8}
                      opacity={0.8}
                    />
                  )}
                  {on && (
                    <circle
                      r={p.radius + 7}
                      fill="none"
                      stroke="#fff"
                      strokeWidth={1}
                      opacity={0.85}
                    />
                  )}
                  <text className="obj-label" y={-p.radius - 6} textAnchor="middle">
                    {p.name.split(' ').pop()}
                  </text>
                </g>

                {p.stations.map((s) => {
                  const sp = pos.get(s.id)
                  if (!sp) return null
                  const c = STATION_GLYPH[s.type] ?? '#9fb4d8'
                  const sOn = isSel('station', s.id)
                  return (
                    <g
                      key={s.id}
                      className="clickable"
                      transform={`translate(${sp.x - pp.x} ${sp.y - pp.y})`}
                      onClick={select('station', s.id)}
                    >
                      <circle r={5} fill="transparent" />
                      <rect
                        x={-2.2}
                        y={-2.2}
                        width={4.4}
                        height={4.4}
                        fill={c}
                        transform="rotate(45)"
                      />
                      {sOn && (
                        <circle r={6} fill="none" stroke="#fff" strokeWidth={0.8} opacity={0.9} />
                      )}
                    </g>
                  )
                })}
              </g>
            )
          })}
        </g>

        {/* portes */}
        <g style={{ fontSize: `${fs}px` }}>
          {system.gates.map((g) => {
            const gp = pos.get(g.id)
            if (!gp) return null
            const on = isSel('gate', g.id)
            const dests = g.links.map((id) => systemsById.get(id)?.name).filter(Boolean)
            return (
              <g
                key={g.id}
                className="clickable"
                transform={`translate(${gp.x} ${gp.y})`}
                onClick={select('gate', g.id)}
                onDoubleClick={() => {
                  const [only] = g.links
                  if (g.links.length === 1 && only) onTravel(only)
                }}
              >
                <circle r={16} fill="transparent" />
                <circle
                  r={11}
                  fill="rgba(154,123,255,0.10)"
                  stroke="#9a7bff"
                  strokeWidth={on ? 1.8 : 1}
                />
                <rect
                  x={-4}
                  y={-4}
                  width={8}
                  height={8}
                  fill="#9a7bff"
                  transform={`rotate(${45 + g.angle})`}
                />
                {g.status === 'instable' && (
                  <circle
                    r={14}
                    fill="none"
                    stroke="#ff6b81"
                    strokeWidth={0.7}
                    strokeDasharray="2 3"
                  />
                )}
                <text className="gate-label" y={-18} textAnchor="middle">
                  {g.name} → {dests.join(', ') || 'nulle part'}
                </text>
              </g>
            )
          })}
        </g>
      </svg>

      <div className="map-hint">
        clic : inspecter · double-clic sur une porte : voyager · molette : zoom
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
