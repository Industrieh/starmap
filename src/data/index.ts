import type { Galaxy } from '../types/galaxy'
import raw from './galaxy.json'

/**
 * Seule porte d'entrée des données du monde. Le JSON est produit par
 * `scripts/generate-galaxy.ts` : le cast est le point unique où l'on fait
 * confiance au générateur plutôt qu'au compilateur.
 */
export const galaxy = raw as unknown as Galaxy
