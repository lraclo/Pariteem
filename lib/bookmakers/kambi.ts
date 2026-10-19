import type { Match } from '../domaine/match';
import { enParallele, json, troisCotes, type Progression } from './commun';

/** Un Bookmaker dont l'offre vient de Kambi, servie par son CDN public. */
export interface SiteKambi {
  id: string;
  nom: string;
  /** Racine de l'API d'offre, propre au Bookmaker. */
  offre: string;
  /** Adresse d'un Match, à partir de son identifiant Kambi. */
  urlMatch: (id: number) => string;
}

export const PMU: SiteKambi = {
  id: 'pmu',
  nom: 'PMU',
  offre: 'https://eu1.offering-api.kambicdn.com/offering/v2018/pmusportsfr',
  urlMatch: (id) => `https://www.pmu.fr/sport/event/${id}`,
};

const PARAMETRES = 'lang=fr_FR&market=FR';

interface ListeKambi {
  events?: {
    event: {
      id: number;
      homeName?: string;
      awayName?: string;
      start: string;
      group?: string;
      state?: string;
      tags?: string[];
    };
    betOffers?: {
      betOfferType?: { englishName?: string };
      outcomes: { type: string; odds?: number; status: string }[];
    }[];
  }[];
}

/** Lit une liste de Matchs Kambi (« listView »). Les cotes y sont en millièmes. */
export function lireKambi(liste: ListeKambi, site: SiteKambi): Match[] {
  const matchs: Match[] = [];
  for (const { event: e, betOffers } of liste.events ?? []) {
    if (e.state !== 'NOT_STARTED' || !e.tags?.includes('MATCH') || !e.homeName || !e.awayName) continue;
    const pari = betOffers?.find((b) => b.betOfferType?.englishName === 'Match' && b.outcomes.length === 3);
    const cote = (type: string) => {
      const issue = pari?.outcomes.find((o) => o.type === type);
      return issue?.status === 'OPEN' && issue.odds ? issue.odds / 1000 : null;
    };
    const cotes = troisCotes(cote('OT_ONE'), cote('OT_CROSS'), cote('OT_TWO'));
    if (!cotes) continue;
    matchs.push({
      id: `${site.id}:${e.id}`,
      equipeDomicile: e.homeName,
      equipeExterieur: e.awayName,
      competition: e.group ?? '',
      debut: Date.parse(e.start),
      cotes,
      url: site.urlMatch(e.id),
    });
  }
  return matchs;
}

/**
 * La liste de tout le football ne couvre que la semaine à venir : on lit en plus
 * chaque pays ou compétition, dont les listes vont plus loin.
 */
export async function chercherKambi(site: SiteKambi, progression: Progression): Promise<Match[]> {
  const arbre = await json<{ group: { groups?: { termKey: string }[] } }>(
    site.nom,
    `${site.offre}/group/1000093190.json?${PARAMETRES}`,
  );
  const listes = ['', ...(arbre.group.groups ?? []).map((g) => `/${g.termKey}`)];
  const matchs = new Map<string, Match>();
  await enParallele(listes, 6, async (chemin) => {
    const liste = await json<ListeKambi>(site.nom, `${site.offre}/listView/football${chemin}.json?${PARAMETRES}`);
    for (const m of lireKambi(liste, site)) matchs.set(m.id, m);
    progression(matchs.size);
  });
  return [...matchs.values()];
}
