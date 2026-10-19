import { storage } from '#imports';
import type { Bookmaker, IdBookmaker } from './bookmakers';
import { enParallele } from './bookmakers/commun';

/** Où en est un Bookmaker pendant « Tout lire ». */
export type EtatSite =
  | { etat: 'attente' }
  | { etat: 'lecture'; matchs: number | null }
  | { etat: 'lu'; matchs: number }
  | { etat: 'erreur'; message: string }
  | { etat: 'lu-recemment' }
  | { etat: 'a-la-main' };

export interface ToutLire {
  /** Heure du lancement : une Lecture plus récente rend caduc l'état affiché pour son Bookmaker. */
  debut: number;
  enCours: boolean;
  /** Fenêtre réduite ouverte pour la lecture, à fermer si le service worker redémarre en route. */
  fenetre: number | null;
  sites: Partial<Record<IdBookmaker, EtatSite>>;
  erreur?: string;
}

/**
 * Le dernier « Tout lire », mené par le service worker et suivi par le panneau. La zone session
 * survit à la fermeture du panneau, pas à celle de Chrome.
 */
export const toutLire = storage.defineItem<ToutLire | null>('session:tout-lire', { fallback: null });

/** Sites lus en même temps au plus : chaque page de Bookmaker est lourde. */
export const SIMULTANES = 3;
/** Lus seuls et en dernier : le pare-feu de Genybet bloque quand les requêtes s'enchaînent (ADR 0004). */
export const LUS_SEULS: readonly IdBookmaker[] = ['genybet'];
/** Un site lu seul n'est pas relu s'il l'a été il y a moins de 10 minutes. */
export const RECENT_MS = 10 * 60_000;
/** Bookmakers que « Tout lire » ne sait pas lire dans une fenêtre réduite (ADR 0005). */
export const A_LIRE_A_LA_MAIN: readonly IdBookmaker[] = [];

export interface Outils {
  /** Lit le Bookmaker et enregistre sa Lecture ; renvoie le nombre de Matchs lus. */
  lire(bookmaker: Bookmaker): Promise<number>;
  /** Heure de la dernière Lecture du Bookmaker, ou null s'il n'a jamais été lu. */
  lueA(id: IdBookmaker): Promise<number | null>;
  maintenant(): number;
  signaler(id: IdBookmaker, etat: EtatSite): void;
  /** Vrai une fois que le Trésorier a cliqué sur « Arrêter » : plus aucun site ne commence. */
  arrete(): boolean;
  aLaMain?: readonly IdBookmaker[];
}

/**
 * Lit les Bookmakers, `SIMULTANES` à la fois, puis ceux de `LUS_SEULS` un par un. Un échec n'arrête
 * jamais les autres sites.
 */
export async function lireTout(bookmakers: readonly Bookmaker[], outils: Outils): Promise<void> {
  const { aLaMain = A_LIRE_A_LA_MAIN } = outils;
  const aLire: Bookmaker[] = [];
  for (const b of bookmakers) {
    if (aLaMain.includes(b.id)) {
      outils.signaler(b.id, { etat: 'a-la-main' });
      continue;
    }
    if (LUS_SEULS.includes(b.id)) {
      const lueA = await outils.lueA(b.id);
      if (lueA !== null && outils.maintenant() - lueA < RECENT_MS) {
        outils.signaler(b.id, { etat: 'lu-recemment' });
        continue;
      }
    }
    outils.signaler(b.id, { etat: 'attente' });
    aLire.push(b);
  }

  async function lire(b: Bookmaker) {
    if (outils.arrete()) return;
    outils.signaler(b.id, { etat: 'lecture', matchs: null });
    try {
      outils.signaler(b.id, { etat: 'lu', matchs: await outils.lire(b) });
    } catch (e) {
      // Après « Arrêter », les onglets fermés font échouer les lectures en cours : ce ne sont pas des erreurs du site.
      if (!outils.arrete()) outils.signaler(b.id, { etat: 'erreur', message: e instanceof Error ? e.message : String(e) });
    }
  }

  await enParallele(aLire.filter((b) => !LUS_SEULS.includes(b.id)), SIMULTANES, lire);
  for (const b of aLire.filter((b) => LUS_SEULS.includes(b.id))) await lire(b);
}

/**
 * Les états à garder une fois « Tout lire » fini : les sites en attente ou en cours de lecture sont oubliés
 * (après « Arrêter »), ou marqués en erreur avec `message` (lecture interrompue).
 */
export function finir(sites: ToutLire['sites'], message?: string): ToutLire['sites'] {
  const restants: ToutLire['sites'] = {};
  for (const [id, etat] of Object.entries(sites) as [IdBookmaker, EtatSite][]) {
    const inacheve = etat.etat === 'attente' || etat.etat === 'lecture';
    if (!inacheve) restants[id] = etat;
    else if (message) restants[id] = { etat: 'erreur', message };
  }
  return restants;
}
