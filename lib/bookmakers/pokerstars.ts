import type { Match } from '../domaine/match';
import { enParallele, json, troisCotes, type Progression } from './commun';

export const URL_FOOTBALL_POKERSTARS = 'https://www.pokerstars.fr/sports/football/1/';

const FOOTBALL = 1;

/** En-têtes qu'envoie l'application du site ; sans eux, l'API refuse la requête. */
const ENTETES = {
  accept: 'application/json',
  'x-fi-ps-platform-id': '5',
  'x-isp-promotions-permitted': 'true',
  'x-stars-locale': 'fr',
  'x-stars-currency': 'EUR',
};

interface CompetitionPokerstars {
  data?: {
    competitions?: Record<string, { competitionName: string; competitionSlug: string; competitionId: number }>;
    events?: Record<string, {
      eventId: number;
      eventSlug: string;
      eventStartTime: string;
      isInPlay?: boolean;
      competitionId: number;
      enrichedParticipants?: { participant: string; type: string }[];
    }>;
    markets?: Record<string, {
      eventId: number;
      inPlay?: boolean;
      marketType: string;
      marketStatus: string;
      runners: {
        runnerName: string;
        runnerStatus: string;
        resultType?: string;
        winRunnerOdds?: { decimalDisplayOdds?: { decimalOdds?: number } };
      }[];
    }>;
  };
}

/** Lit les Matchs d'une compétition (avec leur marché 1/N/2) de PokerStars Sports. */
export function lirePokerstars(reponse: CompetitionPokerstars): Match[] {
  const { competitions = {}, events = {}, markets = {} } = reponse.data ?? {};
  const matchs: Match[] = [];
  for (const marche of Object.values(markets)) {
    const e = events[marche.eventId];
    if (!e || e.isInPlay || marche.inPlay || marche.marketType !== 'WIN-DRAW-WIN' || marche.marketStatus !== 'OPEN') continue;
    const issue = (type: string) => marche.runners.find((r) => r.resultType === type && r.runnerStatus === 'ACTIVE');
    const [r1, rN, r2] = [issue('HOME'), issue('DRAW'), issue('AWAY')];
    const cote = (r: typeof r1) => r?.winRunnerOdds?.decimalDisplayOdds?.decimalOdds;
    const cotes = troisCotes(cote(r1), cote(rN), cote(r2));
    const equipe = (type: string) => e.enrichedParticipants?.find((p) => p.type === type)?.participant;
    const domicile = equipe('HOME') ?? r1?.runnerName;
    const exterieur = equipe('AWAY') ?? r2?.runnerName;
    const competition = competitions[e.competitionId];
    if (!cotes || !domicile || !exterieur) continue;
    matchs.push({
      id: `pokerstars:${e.eventId}`,
      equipeDomicile: domicile,
      equipeExterieur: exterieur,
      competition: competition?.competitionName ?? '',
      debut: Date.parse(e.eventStartTime),
      cotes,
      url: competition
        ? `https://www.pokerstars.fr/sports/football/${FOOTBALL}/${competition.competitionSlug}/${competition.competitionId}/${e.eventSlug}/${e.eventId}/`
        : undefined,
    });
  }
  return matchs;
}

/** La liste « Matchs » s'arrête à 48 h : on lit donc chaque compétition de football. */
export async function chercherPokerstars(progression: Progression): Promise<Match[]> {
  const options = { headers: ENTETES, credentials: 'include' } as const;
  const { allCompetitionIds = [] } = await json<{ allCompetitionIds?: number[] }>(
    'PokerStars',
    `/sports/web/competitions-page/${FOOTBALL}`,
    options,
  );
  const matchs = new Map<string, Match>();
  await enParallele(allCompetitionIds, 4, async (id) => {
    const reponse = await json<CompetitionPokerstars>('PokerStars', `/sports/web/competition-events/${FOOTBALL}/${id}`, options);
    for (const m of lirePokerstars(reponse)) matchs.set(m.id, m);
    progression(matchs.size);
  });
  return [...matchs.values()];
}
