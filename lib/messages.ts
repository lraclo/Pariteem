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

/** Service worker → script de page : vrai dès que le script de page est chargé et prêt à lire. */
export interface DemandePing {
  type: 'ping';
}

/** Panneau → service worker : lire tous les Bookmakers dans une fenêtre réduite (ADR 0005). */
export interface DemandeToutLire {
  type: 'tout-lire';
}

/** Panneau → service worker : fermer la fenêtre réduite et garder les Lectures déjà faites. */
export interface DemandeArreter {
  type: 'arreter';
}
