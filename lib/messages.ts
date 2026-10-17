import type { Match } from './domaine/match';

/** Panneau → script de page. */
export interface DemandeChercher {
  type: 'chercher';
}

export type ReponseChercher = { ok: true; matchs: Match[] } | { ok: false; erreur: string };

/** Script de page → panneau, pendant le défilement de Betclic. */
export interface Progression {
  type: 'progression';
  cartes: number;
}

/** Script de page → service worker : la page tourne dans Arc. */
export interface NavigateurArc {
  type: 'navigateur-arc';
}
