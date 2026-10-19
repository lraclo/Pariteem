import type { Match } from '../domaine/match';
import { json, slug, troisCotes } from './commun';

export const URL_FOOTBALL_BETSSON = 'https://betsson.fr/fr/a-venir/football';

const API = 'https://velsv-bson-ssb-pr.betsson.fr/services/content/get';

/** Type du marché « Résultat » (1/N/2 en temps réglementaire). */
const RESULTAT = '1';
const FENETRE_JOURS = 22;

interface SelectionBetsson {
  hadvalue?: string;
  currentpriceup?: string;
  currentpricedown?: string;
  idfoselectionsuspensiontype?: string;
}

interface EvenementBetsson {
  idfoevent: string;
  idfoeventtype?: string;
  istradable?: boolean;
  participantname_home?: string;
  participantname_away?: string;
  tsstart: string;
  idfotournament?: string;
  tournamentname?: string;
  markets?: {
    idefmarkettype?: string;
    istradable?: boolean;
    idfobolifestate?: string;
    selections?: SelectionBetsson[];
  }[];
}

/** Cote décimale d'une Issue, que Betsson donne en fraction (gain net / mise). */
function cote(s: SelectionBetsson | undefined): number | null {
  if (!s || s.idfoselectionsuspensiontype) return null;
  const haut = Number(s.currentpriceup);
  const bas = Number(s.currentpricedown);
  return haut > 0 && bas > 0 ? Math.round((1 + haut / bas) * 100) / 100 : null;
}

/** Lit la liste des Matchs de football à venir de Betsson. */
export function lireBetsson(evenements: readonly EvenementBetsson[]): Match[] {
  const matchs: Match[] = [];
  for (const e of evenements) {
    if (e.idfoeventtype !== 'MATCH' || e.istradable === false) continue;
    const marche = e.markets?.find((m) => m.idefmarkettype === RESULTAT && m.istradable !== false && m.idfobolifestate === 'O');
    const issue = (had: string) => marche?.selections?.find((s) => s.hadvalue === had);
    const cotes = troisCotes(cote(issue('H')), cote(issue('D')), cote(issue('A')));
    const domicile = e.participantname_home?.trim();
    const exterieur = e.participantname_away?.trim();
    if (!cotes || !domicile || !exterieur) continue;
    const competition = e.tournamentname?.trim() ?? '';
    const url = new URL(`https://betsson.fr/fr/competitions/football/${slug(competition)}/${slug(`${domicile} vs ${exterieur}`)}`);
    if (e.idfotournament) url.searchParams.set('competition_id', e.idfotournament);
    url.searchParams.set('match_id', e.idfoevent);
    matchs.push({
      id: `betsson:${e.idfoevent}`,
      equipeDomicile: domicile,
      equipeExterieur: exterieur,
      competition,
      debut: Date.parse(e.tsstart),
      cotes,
      url: url.href,
    });
  }
  return matchs;
}

/** AAAAMMJJHHmm, en heure locale comme le site. */
function horodatage(d: Date, heure: string): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${heure}`;
}

/** Une requête rend tous les Matchs des trois semaines à venir (une dizaine de secondes). */
export async function chercherBetsson(): Promise<Match[]> {
  const debut = new Date();
  const fin = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + FENETRE_JOURS);
  const reponse = await json<{ data?: EvenementBetsson[] }>('Betsson', API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      clientContext: { language: 'FR', ipAddress: '0.0.0.0' },
      contentId: {
        type: 'eventListBySportTypeDate',
        id: `FBL/${horodatage(debut, '0000')}/${horodatage(fin, '2359')}/0/2000/D`,
      },
    }),
  });
  return lireBetsson(reponse.data ?? []);
}
