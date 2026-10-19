import { storage } from '#imports';
import type { IdBookmaker } from './bookmakers';
import type { Match } from './domaine/match';

/** Résultat de la dernière recherche sur un Bookmaker. */
export interface Recherche {
  matchs: Match[];
  /** Heure de la lecture des Cotes, en millisecondes depuis l'epoch. */
  luA: number;
  /** Identifiants des Matchs cochés pour former la Paire. */
  selection: string[];
}

/**
 * Par Bookmaker, pour retrouver les résultats en rouvrant le panneau ou dans une autre fenêtre, sans relire le site.
 * La zone session est vidée à la fermeture de Chrome.
 */
export const recherches = storage.defineItem<Partial<Record<IdBookmaker, Recherche>>>('session:recherches', {
  fallback: {},
});
