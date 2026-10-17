/** Un des trois résultats possibles d'un Match : victoire domicile, nul, victoire extérieur. */
export type Issue = '1' | 'N' | '2';

export const ISSUES: readonly Issue[] = ['1', 'N', '2'];

/** Une rencontre de football proposée par un Bookmaker, avec une Cote par Issue. */
export interface Match {
  id: string;
  equipeDomicile: string;
  equipeExterieur: string;
  competition: string;
  /** Heure de début, en millisecondes depuis l'epoch. */
  debut: number;
  cotes: Record<Issue, number>;
  url?: string;
}

export type Paire = readonly [Match, Match];

export function cotePlancher(match: Match): number {
  return Math.min(match.cotes['1'], match.cotes.N, match.cotes['2']);
}
