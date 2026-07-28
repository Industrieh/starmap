import type { RouteType, StarSystem, StationType, Vec2 } from '../types/galaxy'

export const toRad = (d: number): number => (d * Math.PI) / 180

/** Position sur une orbite circulaire à l'instant t (period = secondes par tour). */
export function orbitPos(orbit: number, angleDeg: number, period: number, t: number): Vec2 {
  const a = toRad(angleDeg + (period ? (t / period) * 360 : 0))
  return { x: Math.cos(a) * orbit, y: Math.sin(a) * orbit }
}

/** Toutes les positions du système à l'instant t, indexées par id. */
export function systemPositions(system: StarSystem, t: number): Map<string, Vec2> {
  const pos = new Map<string, Vec2>()
  pos.set(system.star.id, { x: 0, y: 0 })

  for (const p of system.planets) {
    const pp = orbitPos(p.orbit, p.angle, p.period, t)
    pos.set(p.id, pp)
    for (const s of p.stations) {
      const sp = orbitPos(s.orbit, s.angle, s.period, t)
      pos.set(s.id, { x: pp.x + sp.x, y: pp.y + sp.y })
    }
  }
  for (const g of system.gates) pos.set(g.id, orbitPos(g.orbit, g.angle, 0, 0))
  for (const f of system.asteroidFields) {
    pos.set(
      f.id,
      f.kind === 'belt' ? orbitPos(f.orbit, f.arcStart + f.arcSweep / 2, 0, 0) : { x: f.x, y: f.y },
    )
  }
  return pos
}

export interface RouteStyle {
  stroke: string
  dash: string
  width: number
}

export const ROUTE_STYLE: Record<RouteType, RouteStyle> = {
  orbital: { stroke: '#5f7fa8', dash: '6 8', width: 1.1 },
  shortcut: { stroke: '#43607f', dash: '2 10', width: 0.9 },
  docking: { stroke: '#61d6c4', dash: '3 4', width: 0.8 },
  'jump-lane': { stroke: '#9a7bff', dash: '10 6', width: 1.4 },
  mining: { stroke: '#c9a227', dash: '4 6', width: 0.9 },
}

export const STATION_GLYPH: Record<StationType, string> = {
  trade: '#61d6c4',
  mining: '#c9a227',
  military: '#ff6b81',
  research: '#7fb3ff',
  shipyard: '#d0a6ff',
}

export const STATION_LABEL: Record<StationType, string> = {
  trade: 'Comptoir commercial',
  mining: 'Plateforme minière',
  military: 'Base militaire',
  research: 'Station de recherche',
  shipyard: 'Chantier naval',
}

export function securityLabel(sec: number): string {
  if (sec > 0.75) return 'sécurisé'
  if (sec > 0.45) return 'surveillé'
  if (sec > 0.2) return 'contesté'
  return 'sans loi'
}

export interface BackdropStar {
  x: number
  y: number
  r: number
  o: number
}

/** Champ d'étoiles décoratif, déterministe. */
export function backdropStars(count: number, radius: number, seed = 1): BackdropStar[] {
  let a = seed >>> 0
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return Array.from({ length: count }, () => ({
    x: (rnd() * 2 - 1) * radius,
    y: (rnd() * 2 - 1) * radius,
    r: 0.4 + rnd() * 1.4,
    o: 0.12 + rnd() * 0.55,
  }))
}
