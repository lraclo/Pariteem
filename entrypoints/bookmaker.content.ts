import { bookmakerPourUrl } from '@/lib/bookmakers';
import { chercherBetclic } from '@/lib/bookmakers/betclic';
import { chercherWinamax } from '@/lib/bookmakers/winamax';
import type { Match } from '@/lib/domaine/match';
import type { DemandeChercher, NavigateurArc, Progression, ReponseChercher } from '@/lib/messages';

export default defineContentScript({
  matches: ['*://*.winamax.fr/*', '*://*.betclic.fr/*'],
  main() {
    // Arc ajoute ses couleurs (variables --arc-palette-*) aux pages, parfois après le
    // chargement ; il n'affiche pas les panneaux latéraux d'extension.
    const estArc = () => {
      const style = getComputedStyle(document.documentElement);
      return ['--arc-palette-title', '--arc-palette-background', '--arc-palette-foregroundPrimary'].some(
        (v) => style.getPropertyValue(v).trim() !== '',
      );
    };
    for (const delai of [0, 1000, 3000]) {
      setTimeout(() => {
        if (estArc()) browser.runtime.sendMessage({ type: 'navigateur-arc' } satisfies NavigateurArc).catch(() => {});
      }, delai);
    }

    let enCours: Promise<Match[]> | null = null;

    function chercher(): Promise<Match[]> {
      const bookmaker = bookmakerPourUrl(location.href);
      if (bookmaker?.id === 'winamax') return chercherWinamax();
      if (bookmaker?.id === 'betclic')
        return chercherBetclic((cartes) => {
          browser.runtime.sendMessage({ type: 'progression', cartes } satisfies Progression).catch(() => {});
        });
      return Promise.reject(new Error('Site non pris en charge'));
    }

    browser.runtime.onMessage.addListener((message: DemandeChercher, _envoyeur, repondre) => {
      if (message?.type !== 'chercher') return;
      // Une seule lecture à la fois, même si on clique deux fois sur « Chercher ».
      enCours ??= chercher().finally(() => (enCours = null));
      enCours.then(
        (matchs) => repondre({ ok: true, matchs } satisfies ReponseChercher),
        (e: unknown) => repondre({ ok: false, erreur: e instanceof Error ? e.message : String(e) } satisfies ReponseChercher),
      );
      return true;
    });
  },
});
