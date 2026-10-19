import { URL_FOOTBALL_BETCLIC } from './betclic';
import { URL_FOOTBALL_BETSSON } from './betsson';
import { URL_FOOTBALL_BWIN } from './bwin';
import { URL_FOOTBALL_POKERSTARS } from './pokerstars';
import { URL_FOOTBALL_UNIBET } from './unibet';
import { URL_FOOTBALL_WINAMAX } from './winamax';

export type IdBookmaker =
  | 'winamax'
  | 'betclic'
  | 'unibet'
  | 'pmu'
  | 'netbet'
  | 'genybet'
  | 'feelingbet'
  | 'vbet'
  | 'circusbet'
  | 'daznbet'
  | 'olybet'
  | 'bwin'
  | 'pokerstars'
  | 'betsson';

export interface Bookmaker {
  id: IdBookmaker;
  nom: string;
  domaine: string;
  urlFootball: string;
  /** Vrai si « Chercher » doit d'abord ouvrir la page football dans l'onglet. */
  lectureSurPageFootball: boolean;
}

function bookmaker(id: IdBookmaker, nom: string, domaine: string, urlFootball: string): Bookmaker {
  return { id, nom, domaine, urlFootball, lectureSurPageFootball: false };
}

/** Les Bookmakers agréés par l'ANJ dont l'extension sait lire le football. */
export const BOOKMAKERS: readonly Bookmaker[] = [
  bookmaker('winamax', 'Winamax', 'winamax.fr', URL_FOOTBALL_WINAMAX),
  { ...bookmaker('betclic', 'Betclic', 'betclic.fr', URL_FOOTBALL_BETCLIC), lectureSurPageFootball: true },
  bookmaker('unibet', 'Unibet', 'unibet.fr', URL_FOOTBALL_UNIBET),
  bookmaker('pmu', 'PMU', 'pmu.fr', 'https://www.pmu.fr/sport/'),
  bookmaker('netbet', 'NetBet', 'netbet.fr', 'https://www.netbet.fr/football'),
  bookmaker('genybet', 'Genybet', 'genybet.fr', 'https://www.genybet.fr/sport/football'),
  bookmaker('feelingbet', 'Feelingbet', 'feelingbet.fr', 'https://feelingbet.fr/football'),
  bookmaker('vbet', 'Vbet', 'vbet.fr', 'https://www.vbet.fr/paris-sportifs'),
  bookmaker('circusbet', 'CircusBet', 'circusbet.fr', 'https://www.circusbet.fr/paris-sportifs'),
  bookmaker('daznbet', 'DAZN Bet', 'daznbet.fr', 'https://www.daznbet.fr/sports'),
  bookmaker('olybet', 'Olybet', 'olybet.fr', 'https://www.olybet.fr/sportsbook/paris'),
  bookmaker('bwin', 'bwin', 'bwin.fr', URL_FOOTBALL_BWIN),
  bookmaker('pokerstars', 'PokerStars Sports', 'pokerstars.fr', URL_FOOTBALL_POKERSTARS),
  bookmaker('betsson', 'Betsson', 'betsson.fr', URL_FOOTBALL_BETSSON),
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

/** Vrai sur la page football du Bookmaker, quel que soit le sous-domaine ou les paramètres. */
export function estSurPageFootball(bookmaker: Bookmaker, url: string | undefined): boolean {
  if (bookmakerPourUrl(url)?.id !== bookmaker.id) return false;
  const chemin = (u: string) => new URL(u).pathname.replace(/\/$/, '');
  return chemin(url!) === chemin(bookmaker.urlFootball);
}
