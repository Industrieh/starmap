import type { ReactNode } from 'react'

import { STATION_LABEL, securityLabel } from '../lib/space'
import type {
  Galaxy,
  GalaxyIndex,
  IndexEntry,
  Selection,
  SystemsById,
  ViewMode,
} from '../types/galaxy'

interface RowProps {
  label: ReactNode
  value: ReactNode
}

const Row = ({ label, value }: RowProps) => (
  <div className="row">
    <span>{label}</span>
    <b>{value}</b>
  </div>
)

interface InfoPanelProps {
  entry: IndexEntry | null
  galaxy: Galaxy
  index: GalaxyIndex
  systemsById: SystemsById
  mode: ViewMode
  onSelect: (sel: Selection) => void
  onEnter: (systemId: string) => void
  onTravel: (systemId: string) => void
}

export default function InfoPanel({
  entry,
  galaxy,
  index,
  systemsById,
  mode,
  onSelect,
  onEnter,
  onTravel,
}: InfoPanelProps) {
  if (!entry) {
    return (
      <aside className="panel">
        <h2>Galaxie</h2>
        <p className="muted">
          Sélectionne un système, une planète, une station, une porte ou un champ d'astéroïdes.
        </p>
        <Row label="Seed" value={galaxy.meta.seed} />
        <Row label="Systèmes" value={galaxy.meta.systemCount} />
        <Row label="Hyperlanes" value={galaxy.meta.laneCount} />
        <Row label="Planètes" value={galaxy.meta.planetCount} />
        <Row label="Stations" value={galaxy.meta.stationCount} />
        <Row label="Portes" value={galaxy.meta.gateCount} />
        <Row label="Champs d'astéroïdes" value={galaxy.meta.asteroidFieldCount} />
      </aside>
    )
  }

  const system = systemsById.get(entry.systemId)
  if (!system) return null

  if (entry.kind === 'system') {
    const { obj } = entry
    const lanes = galaxy.lanes.filter((l) => l.from === obj.id || l.to === obj.id)
    return (
      <aside className="panel">
        <span className="kind">Système</span>
        <h2>{obj.name}</h2>
        <Row
          label="Faction"
          value={<span style={{ color: obj.faction.color }}>{obj.faction.name}</span>}
        />
        <Row
          label="Sécurité"
          value={`${Math.round(obj.security * 100)}% · ${securityLabel(obj.security)}`}
        />
        <Row label="Étoile" value={`${obj.star.class} — ${obj.star.typeName}`} />
        <Row label="Planètes" value={obj.planets.length} />
        <Row label="Stations" value={obj.planets.reduce((n, p) => n + p.stations.length, 0)} />
        <Row label="Portes" value={obj.gates.length} />
        <Row label="Champs d'astéroïdes" value={obj.asteroidFields.length} />

        {mode !== 'system' && (
          <button className="primary" onClick={() => onEnter(obj.id)}>
            Entrer dans le système
          </button>
        )}

        <h3>Hyperlanes ({lanes.length})</h3>
        <ul className="list">
          {lanes.map((l) => {
            const other = systemsById.get(l.from === obj.id ? l.to : l.from)
            if (!other) return null
            return (
              <li key={l.id}>
                <button className="link" onClick={() => onSelect({ kind: 'system', id: other.id })}>
                  {other.name}
                </button>
                <span className="muted">{Math.round(l.length)} ua</span>
              </li>
            )
          })}
        </ul>

        <h3>Planètes</h3>
        <ul className="list">
          {obj.planets.map((p) => (
            <li key={p.id}>
              <button className="link" onClick={() => onSelect({ kind: 'planet', id: p.id })}>
                <span className="dot" style={{ background: p.color }} />
                {p.name}
              </button>
              <span className="muted">{p.typeName}</span>
            </li>
          ))}
        </ul>
      </aside>
    )
  }

  if (entry.kind === 'star') {
    const { obj } = entry
    return (
      <aside className="panel">
        <span className="kind">Étoile · {system.name}</span>
        <h2>{system.name} A</h2>
        <Row label="Classe" value={obj.class} />
        <Row label="Type" value={obj.typeName} />
        <Row label="Rayon (proto)" value={obj.radius} />
        <Row label="Planètes en orbite" value={system.planets.length} />
      </aside>
    )
  }

  if (entry.kind === 'planet') {
    const { obj } = entry
    return (
      <aside className="panel">
        <span className="kind">Planète · {system.name}</span>
        <h2>
          <span className="dot" style={{ background: obj.color }} />
          {obj.name}
        </h2>
        <Row label="Type" value={obj.typeName} />
        <Row label="Habitable" value={obj.habitable ? 'oui' : 'non'} />
        <Row label="Orbite" value={`${obj.orbit} · ${obj.period}s / tour`} />
        <Row label="Lunes" value={obj.moons} />
        <Row label="Ressources" value={obj.resources} />
        <h3>Stations en orbite ({obj.stations.length})</h3>
        <ul className="list">
          {obj.stations.map((s) => (
            <li key={s.id}>
              <button className="link" onClick={() => onSelect({ kind: 'station', id: s.id })}>
                {s.name}
              </button>
              <span className="muted">{STATION_LABEL[s.type]}</span>
            </li>
          ))}
          {!obj.stations.length && <li className="muted">Aucune</li>}
        </ul>
      </aside>
    )
  }

  if (entry.kind === 'station') {
    const { obj } = entry
    const planet = index.get(obj.planetId)?.obj
    return (
      <aside className="panel">
        <span className="kind">Station · {system.name}</span>
        <h2>{obj.name}</h2>
        <Row label="Type" value={STATION_LABEL[obj.type]} />
        <Row label="En orbite de" value={planet?.name ?? '—'} />
        <Row label="Docks" value={obj.docks} />
        <Row label="Période orbitale" value={`${obj.period}s`} />
        <button
          className="link back"
          onClick={() => onSelect({ kind: 'planet', id: obj.planetId })}
        >
          ← Voir la planète
        </button>
      </aside>
    )
  }

  if (entry.kind === 'gate') {
    const { obj } = entry
    return (
      <aside className="panel">
        <span className="kind">Porte · {system.name}</span>
        <h2>{obj.name}</h2>
        <Row label="État" value={obj.status} />
        <Row label="Destinations" value={obj.links.length} />
        <h3>Sauter vers</h3>
        <ul className="list">
          {obj.links.map((id) => (
            <li key={id}>
              <button className="link" onClick={() => onTravel(id)}>
                {systemsById.get(id)?.name}
              </button>
              <span className="muted">saut</span>
            </li>
          ))}
          {!obj.links.length && <li className="muted">Porte inerte</li>}
        </ul>
      </aside>
    )
  }

  if (entry.kind === 'field') {
    const { obj } = entry
    return (
      <aside className="panel">
        <span className="kind">Champ d'astéroïdes · {system.name}</span>
        <h2>{obj.name}</h2>
        <Row label="Forme" value={obj.kind === 'belt' ? 'ceinture' : 'amas'} />
        <Row label="Densité" value={`${Math.round(obj.density * 100)}%`} />
        <Row label="Richesse" value={obj.richness} />
        <Row label="Blocs" value={obj.rocks.length} />
      </aside>
    )
  }

  return null
}
