import type { Match } from '../domaine/match';
import { json, slug, troisCotes, type Progression } from './commun';

export const URL_FOOTBALL_UNIBET = 'https://www.unibet.fr/paris-football';

/** Matchs par page : l'API refuse davantage. */
const PAR_PAGE = 100;
const LISTE = `/lvs-api/next/${PAR_PAGE}/p240?lineId=1&originId=3&breakdownEventsIntoDays=true&showPromotions=true`;

/** Élément de la réponse : ligue (p…), Match (e…), marché (m…) ou Issue (o…), liés par `parent`. */
interface Element {
  parent?: string;
  desc?: string;
  /** Début en UTC, au format AAMMJJHHmm. */
  start?: string;
  eType?: string;
  a?: string;
  b?: string;
  path?: { Category?: string; League?: string };
  style?: string;
  price?: string;
  pos?: number;
}

interface PageUnibet {
  items?: Record<string, Element>;
  numberOfEvents?: string;
}

function debut(start: string): number {
  const [aa, mm, jj, hh, mi] = start.match(/\d\d/g)!.map(Number);
  return Date.UTC(2000 + aa!, mm! - 1, jj!, hh!, mi!);
}

/** Lit une page de la liste « prochains Matchs » de football d'Unibet. */
export function lireUnibet(page: PageUnibet): Match[] {
  const items = Object.entries(page.items ?? {});
  const enfants = new Map<string, [string, Element][]>();
  for (const entree of items) {
    const parent = entree[1].parent;
    if (parent) enfants.set(parent, [...(enfants.get(parent) ?? []), entree]);
  }
  const matchs: Match[] = [];
  for (const [cle, e] of items) {
    // eType « G » : une vraie rencontre (les « R » sont des paris combinés tout faits).
    if (!cle.startsWith('e') || e.eType !== 'G' || !e.start || !e.a || !e.b) continue;
    const marche = (enfants.get(cle) ?? []).find(([k, m]) => k.startsWith('m') && m.style === 'WIN_DRAW_WIN');
    if (!marche) continue;
    const prix = (enfants.get(marche[0]) ?? [])
      .map(([, o]) => o)
      .sort((x, y) => (x.pos ?? 0) - (y.pos ?? 0))
      .map((o) => Number(o.price?.replace(',', '.')));
    const cotes = prix.length === 3 ? troisCotes(prix[0], prix[1], prix[2]) : null;
    if (!cotes) continue;
    const id = cle.slice(1);
    matchs.push({
      id: `unibet:${id}`,
      equipeDomicile: e.a,
      equipeExterieur: e.b,
      competition: e.path?.League ?? '',
      debut: debut(e.start),
      cotes,
      url: `https://www.unibet.fr/paris-football/${slug(e.path?.Category ?? '')}/${slug(e.path?.League ?? '')}/${id}/${slug(e.desc ?? '')}`,
    });
  }
  return matchs;
}

/** Parcourt toutes les pages de la liste football (même origine que la page). */
export async function chercherUnibet(progression: Progression): Promise<Match[]> {
  // Les pages hors cache exigent le jeton anonyme que le site obtient de la même façon.
  const { hsToken } = await json<{ hsToken: string }>('Unibet', '/lvs-api/acc/token');
  // Un Match peut apparaître en fin d'une page et en tête de la suivante.
  const matchs = new Map<string, Match>();
  for (let page = 0; page < 30; page++) {
    const reponse = await json<PageUnibet>('Unibet', `${LISTE}&pageIndex=${page}`, {
      headers: { 'X-LVS-HSToken': hsToken },
    });
    const lus = Object.keys(reponse.items ?? {}).filter((k) => k.startsWith('e')).length;
    for (const m of lireUnibet(reponse)) matchs.set(m.id, m);
    progression(matchs.size);
    if (lus < PAR_PAGE) break;
  }
  return [...matchs.values()];
}
