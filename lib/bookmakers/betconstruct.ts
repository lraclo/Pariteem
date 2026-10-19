import type { Match } from '../domaine/match';
import { troisCotes } from './commun';

/** Un Bookmaker bâti sur BetConstruct, dont l'offre passe par un WebSocket « Swarm ». */
export interface SiteBetconstruct {
  id: string;
  nom: string;
  swarm: string;
  /** Identifiant du Bookmaker auprès de Swarm (« partnerId » dans la configuration du site). */
  partenaire: number;
  /** Racine des pages de Match, suivie de /Soccer/<région>/<compétition>/<Match>. */
  pagesMatch: string;
}

export const VBET: SiteBetconstruct = {
  id: 'vbet',
  nom: 'Vbet',
  swarm: 'wss://swarm-2.vbet.fr/',
  partenaire: 277,
  pagesMatch: 'https://www.vbet.fr/paris-sportifs/match',
};

export const CIRCUSBET: SiteBetconstruct = {
  id: 'circusbet',
  nom: 'CircusBet',
  swarm: 'wss://swarm-2.vbet.fr/',
  partenaire: 1869622,
  pagesMatch: 'https://www.circusbet.fr/paris-sportifs/match',
};

export const DAZNBET: SiteBetconstruct = {
  id: 'daznbet',
  nom: 'DAZN Bet',
  swarm: 'wss://swarm-2.vbet.fr/',
  partenaire: 18766873,
  pagesMatch: 'https://www.daznbet.fr/sports/match',
};

export const OLYBET: SiteBetconstruct = {
  id: 'olybet',
  nom: 'Olybet',
  swarm: 'wss://eu-swarm-reverse.betconstruct.com',
  partenaire: 18769041,
  pagesMatch: 'https://sports.olybet.fr/pre-match/match',
};

/** Ce que Swarm renvoie pour la requête de `chercherBetconstruct`. */
export interface OffreBetconstruct {
  region?: Record<string, {
    alias: string;
    competition?: Record<string, {
      id: number;
      name: string;
      game?: Record<string, {
        id: number;
        team1_name?: string;
        team2_name?: string;
        start_ts: number;
        /** 0 : avant-match ; 1 : en direct ; 2 : avant-match, proposé aussi en direct. */
        type: number;
        is_blocked?: number;
        market?: Record<string, { type: string; event?: Record<string, { type: string; price: number }> }>;
      }>;
    }>;
  }>;
}

const REQUETE = {
  source: 'betting',
  what: {
    region: ['alias'],
    competition: ['id', 'name'],
    game: ['id', 'team1_name', 'team2_name', 'start_ts', 'type', 'is_blocked'],
    market: ['type'],
    event: ['type', 'price'],
  },
  where: {
    sport: { alias: 'Soccer' },
    game: { type: { '@in': [0, 2] } },
    market: { type: 'P1XP2' },
  },
  subscribe: false,
};

export function lireBetconstruct(offre: OffreBetconstruct, site: SiteBetconstruct): Match[] {
  const matchs: Match[] = [];
  for (const region of Object.values(offre.region ?? {})) {
    for (const competition of Object.values(region.competition ?? {})) {
      for (const g of Object.values(competition.game ?? {})) {
        if (g.type === 1 || g.is_blocked || !g.team1_name || !g.team2_name) continue;
        const marche = Object.values(g.market ?? {}).find((m) => m.type === 'P1XP2');
        const issues = Object.values(marche?.event ?? {});
        const cote = (type: string) => issues.find((i) => i.type === type)?.price;
        const cotes = troisCotes(cote('P1'), cote('X'), cote('P2'));
        if (!cotes) continue;
        matchs.push({
          id: `${site.id}:${g.id}`,
          equipeDomicile: g.team1_name.trim(),
          equipeExterieur: g.team2_name.trim(),
          competition: competition.name.trim(),
          debut: g.start_ts * 1000,
          cotes,
          url: `${site.pagesMatch}/Soccer/${region.alias}/${competition.id}/${g.id}`,
        });
      }
    }
  }
  return matchs;
}

/** Ouvre une session Swarm anonyme, demande tout le football avant-match en une fois, puis ferme. */
export function chercherBetconstruct(site: SiteBetconstruct): Promise<Match[]> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(site.swarm);
    const minuterie = setTimeout(() => echouer(`${site.nom} ne répond pas.`), 30_000);
    function echouer(message: string) {
      clearTimeout(minuterie);
      ws.close();
      reject(new Error(message));
    }
    ws.onerror = () => echouer(`Connexion à ${site.nom} impossible.`);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        command: 'request_session',
        params: { language: 'fra', site_id: site.partenaire, source: 42 },
        rid: 'session',
      }));
    };
    ws.onmessage = (message) => {
      const reponse = JSON.parse(String(message.data)) as { rid?: string; code?: number; data?: { data?: OffreBetconstruct } };
      if (reponse.rid !== 'session' && reponse.rid !== 'offre') return;
      if (reponse.code !== 0) return echouer(`${site.nom} a refusé la demande (code ${reponse.code}).`);
      if (reponse.rid === 'session') {
        ws.send(JSON.stringify({ command: 'get', params: REQUETE, rid: 'offre' }));
      } else if (reponse.rid === 'offre') {
        clearTimeout(minuterie);
        ws.close();
        resolve(lireBetconstruct(reponse.data?.data ?? {}, site));
      }
    };
  });
}
