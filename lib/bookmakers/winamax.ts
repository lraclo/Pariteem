import type { Issue, Match } from '../domaine/match';
import { extraireObjetJson } from './etat-integre';

export const URL_FOOTBALL_WINAMAX = 'https://www.winamax.fr/paris-sportifs/sports/1';

const FOOTBALL = 1;
const CODES: Record<string, Issue> = { '1': '1', x: 'N', '2': '2' };

interface EtatWinamax {
  matches: Record<string, {
    matchId: number;
    sportId: number;
    status: string;
    mainBetId?: number;
    competitor1Name: string;
    competitor2Name: string;
    tournamentId: number;
    matchStart: number;
  }>;
  bets: Record<string, { outcomes: number[]; template?: string; available: boolean }>;
  outcomes: Record<string, { code: string; available: boolean }>;
  odds: Record<string, number>;
  tournaments: Record<string, { tournamentName: string }>;
}

/** Lit les Matchs avant-match de la page football de Winamax, depuis son état intégré. */
export function lireWinamax(html: string): Match[] {
  const etat = extraireObjetJson(html, 'PRELOADED_STATE') as EtatWinamax;
  const matchs: Match[] = [];
  for (const m of Object.values(etat.matches)) {
    if (m.sportId !== FOOTBALL || m.status !== 'PREMATCH') continue;
    const pari = etat.bets[String(m.mainBetId)];
    if (!pari?.available || pari.template !== '3way') continue;
    const cotes: Partial<Record<Issue, number>> = {};
    for (const id of pari.outcomes) {
      const issue = etat.outcomes[id];
      const code = issue && CODES[issue.code];
      const cote = etat.odds[id];
      if (code && issue.available && cote && cote > 1) cotes[code] = cote;
    }
    if (!cotes['1'] || !cotes.N || !cotes['2']) continue;
    matchs.push({
      id: `winamax:${m.matchId}`,
      equipeDomicile: m.competitor1Name,
      equipeExterieur: m.competitor2Name,
      competition: etat.tournaments[m.tournamentId]?.tournamentName ?? '',
      debut: m.matchStart * 1000,
      cotes: cotes as Record<Issue, number>,
      url: `https://www.winamax.fr/paris-sportifs/match/${m.matchId}`,
    });
  }
  return matchs;
}

/** Charge la page football depuis le site (même origine) et la lit. */
export async function chercherWinamax(): Promise<Match[]> {
  const reponse = await fetch(URL_FOOTBALL_WINAMAX, { credentials: 'include' });
  if (!reponse.ok) throw new Error(`Winamax a répondu ${reponse.status}`);
  return lireWinamax(await reponse.text());
}
