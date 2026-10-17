import type { Match } from '../domaine/match';

export const URL_FOOTBALL_BETCLIC = 'https://www.betclic.fr/football-sfootball';

function texte(el: Element | null | undefined): string {
  return el?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function cote(texteCote: string): number {
  return Number(texteCote.replace(',', '.'));
}

/**
 * Jour (minuit local) désigné par un en-tête de groupe Betclic, ou null pour
 * « Maintenant » (en direct) et les en-têtes inconnus.
 */
function jourDuGroupe(titre: string, heure: number, maintenant: Date): Date | null {
  const aujourdhui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  const demain = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() + 1);
  if (titre === "Aujourd'hui") return aujourdhui;
  if (titre === 'Demain') return demain;
  // « Cette nuit » regroupe les Matchs d'après minuit.
  if (titre === 'Cette nuit') return heure < 12 ? demain : aujourdhui;
  const [, jj, mois] = /(\d{2})\/(\d{2})/.exec(titre) ?? [];
  if (!jj || !mois) return null;
  const jour = new Date(aujourdhui.getFullYear(), Number(mois) - 1, Number(jj));
  if (jour < aujourdhui) jour.setFullYear(jour.getFullYear() + 1);
  return jour;
}

/** Lit les cartes de Match avant-match affichées sur la page football de Betclic. */
export function lireBetclic(racine: ParentNode, maintenant: Date): Match[] {
  const matchs: Match[] = [];
  for (const groupe of racine.querySelectorAll('.groupEvents')) {
    const titre = texte(groupe.querySelector('.groupEvents_headTitle'));
    for (const carte of groupe.querySelectorAll<HTMLAnchorElement>('a.cardEvent:not(.is-live)')) {
      const [, hh, mm] = /(\d{1,2}):(\d{2})/.exec(texte(carte.querySelector('.scoreboard_hour'))) ?? [];
      const cotes = [...carte.querySelectorAll('.market_odds button.is-odd bcdk-bet-button-odds-animated')].map(
        (el) => cote(texte(el)),
      );
      const [, id] = /-m(\d+)$/.exec(carte.getAttribute('href') ?? '') ?? [];
      const [c1, cN, c2] = cotes;
      if (!hh || !mm || !id || cotes.length !== 3 || !c1 || !cN || !c2 || cotes.some((c) => !(c > 1))) continue;
      const jour = jourDuGroupe(titre, Number(hh), maintenant);
      if (!jour) continue;
      jour.setHours(Number(hh), Number(mm));
      matchs.push({
        id: `betclic:${id}`,
        equipeDomicile: texte(carte.querySelector('.scoreboard_contestant-1 .scoreboard_contestantLabel')),
        equipeExterieur: texte(carte.querySelector('.scoreboard_contestant-2 .scoreboard_contestantLabel')),
        competition: texte(carte.querySelector('.breadcrumb_item.is-ellipsis')).split(' • ')[0] ?? '',
        debut: jour.getTime(),
        cotes: { '1': c1, N: cN, '2': c2 },
        url: new URL(carte.getAttribute('href')!, 'https://www.betclic.fr').href,
      });
    }
  }
  return matchs;
}

/** Corps de page qui défile sur Betclic (ce n'est pas `window`). */
function conteneurDefilant(): Element {
  return document.body.scrollHeight > document.body.clientHeight ? document.body : document.documentElement;
}

/**
 * Fait défiler la page jusqu'à ce que plus aucune carte n'arrive, puis la lit.
 * `progression` reçoit le nombre de cartes chargées à chaque étape.
 */
export async function chercherBetclic(progression: (cartes: number) => void): Promise<Match[]> {
  const conteneur = conteneurDefilant();
  const depart = conteneur.scrollTop;
  let precedent = -1;
  let immobile = 0;
  const limite = Date.now() + 120_000;
  while (immobile < 4 && Date.now() < limite) {
    conteneur.scrollTop = conteneur.scrollHeight;
    await new Promise((r) => setTimeout(r, 700));
    const cartes = document.querySelectorAll('a.cardEvent').length;
    immobile = cartes === precedent ? immobile + 1 : 0;
    precedent = cartes;
    progression(cartes);
  }
  conteneur.scrollTop = depart;
  return lireBetclic(document, new Date());
}
