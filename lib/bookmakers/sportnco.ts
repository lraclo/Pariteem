import type { Match } from '../domaine/match';
import { attendre, avecReprises, json, troisCotes, type Progression } from './commun';

/** Un Bookmaker bâti sur la plateforme Sport&Co (NetBet, Genybet, Feelingbet). */
export interface SiteSportnco {
  id: string;
  nom: string;
  /** API de la plateforme, sur un sous-domaine du Bookmaker. */
  api: string;
  /** Racine des adresses de Match, auxquelles l'API donne un chemin relatif. */
  site: string;
  /** Attente entre deux pages, en ms : certains sites bloquent les requêtes trop rapprochées. */
  pause: number;
}

export const NETBET: SiteSportnco = {
  id: 'netbet',
  nom: 'NetBet',
  api: 'https://ws.netbet.fr',
  site: 'https://www.netbet.fr',
  pause: 300,
};

export const GENYBET: SiteSportnco = {
  id: 'genybet',
  nom: 'Genybet',
  api: 'https://ws.genybet.fr',
  // Le site affiche les paris sportifs dans un cadre sous /sport.
  site: 'https://www.genybet.fr/sport',
  // Son pare-feu anti-robots bloque l'adresse IP quand les pages s'enchaînent vite.
  pause: 1500,
};

export const FEELINGBET: SiteSportnco = {
  id: 'feelingbet',
  nom: 'Feelingbet',
  api: 'https://ws.feelingbet.fr',
  site: 'https://feelingbet.fr',
  pause: 300,
};

interface Selection {
  odds?: number;
}

interface EvenementSportnco {
  id: number;
  type?: string;
  start: string;
  url?: string;
  is_canceled?: boolean;
  competition?: { label?: string };
  actors?: { type: string; label: string }[];
  markets?: {
    selection_order_type?: string;
    main?: number;
    bets?: { label?: string; selections?: Selection[] }[];
  }[];
}

interface ReponseSportnco {
  components?: { data?: { events?: EvenementSportnco[] } | unknown[] }[];
}

/** Lit une page du composant « dernière minute » (prochains Matchs) de la page football. */
export function lireSportnco(reponse: ReponseSportnco, site: SiteSportnco): Match[] {
  const data = reponse.components?.[0]?.data;
  const evenements = (data && !Array.isArray(data) ? data.events : undefined) ?? [];
  const matchs: Match[] = [];
  for (const e of evenements) {
    if (e.type !== 'pm' || e.is_canceled) continue;
    const domicile = e.actors?.find((a) => a.type === 'home')?.label;
    const exterieur = e.actors?.find((a) => a.type === 'away')?.label;
    // Le marché principal « Qui va gagner le match ? » ; une Issue suspendue a une cote de 1.
    const marche = e.markets?.find((m) => m.selection_order_type === '1x2' && m.main === 1);
    const selections = marche?.bets?.[0]?.selections ?? [];
    const [c1, cN, c2] = selections.map((s) => s.odds);
    const cotes = selections.length === 3 ? troisCotes(c1, cN, c2) : null;
    if (!domicile || !exterieur || !cotes) continue;
    matchs.push({
      id: `${site.id}:${e.id}`,
      equipeDomicile: domicile,
      equipeExterieur: exterieur,
      competition: e.competition?.label ?? '',
      debut: Date.parse(e.start),
      cotes,
      url: e.url ? `${site.site}${e.url}` : undefined,
    });
  }
  return matchs;
}

function page(site: SiteSportnco, numero: number): Promise<ReponseSportnco> {
  // Genybet refuse au hasard près d'une requête sur trois (anti-robots) : on relance.
  return avecReprises(() => json<ReponseSportnco>(site.nom, `${site.api}/component/data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: {
        url_key: '/football',
        version: '1.0.1',
        device: 'web_vuejs_desktop',
        lang: 'fr',
        timezone: 'Europe/Paris',
        url_params: {},
      },
      components: [{ tree_compo_key: 'last_minutes', params: { page: numero } }],
    }),
  }), 6);
}

/** Parcourt les pages de 20 prochains Matchs de football jusqu'à la dernière. */
export async function chercherSportnco(site: SiteSportnco, progression: Progression): Promise<Match[]> {
  const matchs = new Map<string, Match>();
  for (let numero = 1; numero <= 60; numero++) {
    const reponse = await page(site, numero);
    const data = reponse.components?.[0]?.data;
    const lus = data && !Array.isArray(data) ? (data.events?.length ?? 0) : 0;
    if (lus === 0) break;
    for (const m of lireSportnco(reponse, site)) matchs.set(m.id, m);
    progression(matchs.size);
    await attendre(site.pause);
  }
  return [...matchs.values()];
}
