import type { Match } from './domaine/match';

/** Panneau → script de page. */
export interface DemandeChercher {
  type: 'chercher';
}

export type ReponseChercher = { ok: true; matchs: Match[] } | { ok: false; erreur: string };

/** Script de page → panneau, pendant une lecture en plusieurs étapes. */
export interface Progression {
  type: 'progression';
  /** Matchs lus jusqu'ici. */
  matchs: number;
}
