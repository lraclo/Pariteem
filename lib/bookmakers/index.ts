import { URL_FOOTBALL_BETCLIC } from './betclic';
import { URL_FOOTBALL_WINAMAX } from './winamax';

export type IdBookmaker = 'winamax' | 'betclic';

export interface Bookmaker {
  id: IdBookmaker;
  nom: string;
  domaine: string;
  urlFootball: string;
  /** Vrai si « Chercher » doit d'abord ouvrir la page football dans l'onglet. */
  lectureSurPageFootball: boolean;
}

export const BOOKMAKERS: readonly Bookmaker[] = [
  {
    id: 'winamax',
    nom: 'Winamax',
    domaine: 'winamax.fr',
    urlFootball: URL_FOOTBALL_WINAMAX,
    lectureSurPageFootball: false,
  },
  {
    id: 'betclic',
    nom: 'Betclic',
    domaine: 'betclic.fr',
    urlFootball: URL_FOOTBALL_BETCLIC,
    lectureSurPageFootball: true,
  },
];

export function bookmakerPourUrl(url: string | undefined): Bookmaker | null {
  if (!url) return null;
  let hote: string;
  try {
    hote = new URL(url).hostname;
  } catch {
    return null;
  }
  return BOOKMAKERS.find((b) => hote === b.domaine || hote.endsWith(`.${b.domaine}`)) ?? null;
}

export function estSurPageFootball(bookmaker: Bookmaker, url: string | undefined): boolean {
  return !!url && url.split(/[?#]/)[0]!.replace(/\/$/, '') === bookmaker.urlFootball;
}
