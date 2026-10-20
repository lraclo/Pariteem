import { storage } from '#imports';
import type { Bookmaker, IdBookmaker } from './bookmakers';
import { attendre, enParallele } from './bookmakers/commun';
import { lecturesAvecPeuDeMatchs, matchsAVenir, type Lectures } from './domaine/comparaison';
import type { Match } from './domaine/match';

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
  /** Petite fenêtre visible d'un site lu par défilement (Betclic), à fermer de même. */
  fenetreVisible?: number | null;
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

/** Rejette avec `message` si `promesse` n'a pas abouti en `ms` millisecondes. */
export function avecDelai<T>(promesse: Promise<T>, ms: number, message: string): Promise<T> {
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<never>((_, rejeter) => (minuteur = setTimeout(() => rejeter(new Error(message)), ms)));
  return Promise.race([promesse, delai]).finally(() => clearTimeout(minuteur));
}

export class Arret extends Error {
  constructor() {
    super('Lecture arrêtée');
  }
}

/**
 * Relance `essayer` chaque seconde jusqu'à ce qu'il réussisse : le script de page se charge avec la page.
 * Échoue avec `message` après `delaiMs`, ou avec `Arret` dès que le Trésorier arrête la lecture.
 */
export async function attendreReponse(
  essayer: () => Promise<unknown>,
  options: { arrete: () => boolean; delaiMs: number; message: string; pause?: (ms: number) => Promise<void>; maintenant?: () => number },
): Promise<void> {
  const { arrete, delaiMs, message, pause = attendre, maintenant = Date.now } = options;
  const limite = maintenant() + delaiMs;
  while (!arrete()) {
    try {
      await essayer();
      return;
    } catch {
      if (maintenant() > limite) throw new Error(message);
      await pause(1000);
    }
  }
  throw new Arret();
}

/**
 * Note le nombre de Matchs lus jusqu'ici par un site en cours de lecture. Renvoie faux, sans rien changer,
 * pour un message arrivé après la fin de sa lecture.
 */
export function avancer(etat: ToutLire, id: IdBookmaker, matchs: number): boolean {
  if (etat.sites[id]?.etat !== 'lecture') return false;
  etat.sites[id] = { etat: 'lecture', matchs };
  return true;
}

/** L'état à publier quand le service worker redémarre au milieu d'une lecture : elle est perdue. */
export function interrompre(etat: ToutLire): ToutLire {
  return { ...etat, enCours: false, fenetre: null, fenetreVisible: null, sites: finir(etat.sites, 'Lecture interrompue') };
}

/** En deçà de ce nombre de Matchs à venir, une Lecture précédente ne sert pas de référence. */
const REFERENCE_MINIMALE = 40;

/**
 * Les nombres de Matchs à venir lus et attendus quand une lecture de `id` paraît venir d'une page qui a mal
 * chargé ; null sinon. Elle l'est si elle ramène moins de la moitié de la Lecture précédente de ce Bookmaker,
 * ou, faute de référence, moins du quart de la médiane des autres Bookmakers (la règle de la pastille orange).
 * Une telle lecture ne remplace pas la précédente.
 */
export function lectureIncomplete(
  id: IdBookmaker,
  matchs: readonly Match[],
  lectures: Lectures,
  maintenant = Date.now(),
): { lus: number; attendus: number } | null {
  const lus = matchsAVenir(matchs, maintenant);
  const precedente = lectures[id];
  const attendus = precedente ? matchsAVenir(precedente.matchs, maintenant) : 0;
  if (attendus >= REFERENCE_MINIMALE && lus < attendus / 2) return { lus, attendus };
  const peu = lecturesAvecPeuDeMatchs({ ...lectures, [id]: { lueA: maintenant, matchs: [...matchs] } }, maintenant)[id];
  return peu ? { lus, attendus: peu.habituel } : null;
}

/** Taille de la petite fenêtre visible d'un site lu par défilement (Betclic). */
export const PETITE_FENETRE = { largeur: 520, hauteur: 560, marge: 24 };

/**
 * Où poser la petite fenêtre : en bas à gauche de la fenêtre du Trésorier, loin du panneau latéral qui occupe
 * le bord droit et montre l'avancement. Sans dimensions connues, Chrome choisit.
 */
export function positionPetiteFenetre(principale: {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
} | null): { left: number; top: number } | Record<string, never> {
  if (principale?.left === undefined || principale.top === undefined || !principale.height) return {};
  const { hauteur, marge } = PETITE_FENETRE;
  return { left: principale.left + marge, top: principale.top + Math.max(0, principale.height - hauteur - marge) };
}
