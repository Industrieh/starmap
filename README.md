# Star Map — proto

Carte de l'espace pour un jeu JS. **Vite 8 + Bun + React + TypeScript**, rendu SVG, données 100 % générées.

## Démarrer

```bash
bun install
bun run gen      # génère src/data/galaxy.json
bun run dev      # http://localhost:5173
bun run check    # format (oxfmt) + lint (oxlint) + typecheck (tsc)
```

## Regénérer la galaxie

Le fichier `src/data/galaxy.json` est le seul source de vérité du monde. Il se regénère avec :

```bash
bun run gen                                         # seed aléatoire, 24 systèmes
bun run gen -- --systems=40 --seed=cotontigeh       # déterministe
bun run gen -- --out=src/data/autre-galaxie.json
```

Même seed = même galaxie (RNG `mulberry32`, aucun `Math.random` non seedé dans le contenu généré).

| option      | défaut                 | rôle                |
| ----------- | ---------------------- | ------------------- |
| `--systems` | `24`                   | nombre de systèmes  |
| `--seed`    | aléatoire              | seed (chaîne libre) |
| `--out`     | `src/data/galaxy.json` | fichier de sortie   |

## Ce que contient le monde

- **Systèmes** : position dans la galaxie, faction, indice de sécurité, étoile (classes O→M, couleur/rayon).
- **Planètes** : 1 à 11 par système, type dépendant de la zone orbitale (interne / médiane / externe), rayon, orbite, période (Kepler simplifié), lunes, habitabilité, ressources.
- **Stations spatiales** : en orbite autour des planètes (comptoir, minière, militaire, recherche, chantier naval), avec leur propre orbite/période.
- **Champs d'astéroïdes** : `belt` (arc de ceinture entre deux orbites) ou `cluster` (amas), positions des blocs pré-calculées.
- **Portes (gates)** : 1 à 3 par système, placées au-delà de la dernière orbite ; chaque porte dessert une ou plusieurs destinations. Les liaisons sont réparties entre les portes du système.
- **Hyperlanes** : réseau inter-systèmes = k plus proches voisins + arbre couvrant minimal, donc **toujours connexe** (aucun système injoignable).
- **Routes locales** : étoile → planètes → stations → portes → champs, avec des types (`orbital`, `shortcut`, `docking`, `jump-lane`, `mining`) rendus avec des tirets différents.

## Utilisation de la carte

| action                     | effet                                  |
| -------------------------- | -------------------------------------- |
| molette                    | zoom (centré sur le curseur)           |
| glisser                    | déplacer la vue                        |
| clic                       | sélectionner (détails dans le panneau) |
| double-clic sur un système | entrer dans le système                 |
| double-clic sur une porte  | sauter vers le système lié             |
| `Échap`                    | revenir à la vue galaxie               |
| `Espace`                   | pause / reprise du temps               |
| `⏸ ×1 ×4 ×16`              | vitesse de simulation orbitale         |

La barre du bas liste les systèmes voisins pour sauter directement.

## Structure

```
scripts/generate-galaxy.ts    générateur (seedé) -> src/data/galaxy.json
src/types/galaxy.ts           contrat de données du monde (source de vérité des types)
src/data/index.ts             chargement du JSON, typé Galaxy
src/App.tsx                   état global : mode galaxie/système, sélection, vitesse
src/components/GalaxyMap.tsx  vue galaxie : systèmes + hyperlanes
src/components/SystemView.tsx vue système : étoile, orbites, planètes, stations, portes, champs
src/components/InfoPanel.tsx  panneau de détails contextuel
src/lib/useViewport.ts        pan + zoom sur viewBox SVG
src/lib/useAnimationTime.ts   horloge de simulation
src/lib/space.ts              géométrie orbitale, styles, helpers
```

`src/types/galaxy.ts` est partagé entre le générateur et l'app : modifier une forme
de donnée casse le typecheck des deux côtés. `bun run typecheck` (ou `bun run build`,
qui lance `tsc --noEmit` avant Vite) vérifie l'ensemble.

Les positions animées sont recalculées à chaque frame depuis `orbite/angle/période`
(`systemPositions`) — les routes locales suivent donc les planètes en mouvement.

## Qualité

| commande            | rôle                                                        |
| ------------------- | ----------------------------------------------------------- |
| `bun run fmt`       | oxfmt, formate en place                                     |
| `bun run fmt:check` | vérifie le formatage sans écrire                            |
| `bun run lint`      | oxlint, `--deny-warnings` : tout avertissement fait échouer |
| `bun run lint:fix`  | applique les corrections automatiques sûres                 |
| `bun run typecheck` | `tsc --noEmit`                                              |
| `bun run check`     | fmt:check + lint + typecheck                                |

**Lint** — `.oxlintrc.json` : catégories `correctness` (erreur), `suspicious` et `perf`
(avertissement), plugins `typescript`, `react`, `jsx-a11y`, `import`, `unicorn`, `promise`, `oxc`.
Les rares exceptions sont documentées sur place par `// oxlint-disable-next-line <règle> -- <raison>`.

**Formatage** — `.oxfmtrc.json` : pas de point-virgule, guillemets simples, largeur 100 (les
guillemets doubles restent la règle en CSS). `src/data/*.json` est exclu, sa mise en forme
appartient au générateur. Les skills vendorisées (`.agents/`, `.claude/`) sont exclues aussi.
