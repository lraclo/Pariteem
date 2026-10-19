import { BOOKMAKERS, bookmakerPourUrl } from '@/lib/bookmakers';
import { LECTEURS } from '@/lib/bookmakers/lecteurs';
import type { Match } from '@/lib/domaine/match';
import type { DemandeChercher, Progression, ReponseChercher } from '@/lib/messages';

export default defineContentScript({
  // `*.domaine` couvre aussi le domaine nu.
  matches: BOOKMAKERS.map((b) => `*://*.${b.domaine}/*`),
  main() {
    let enCours: Promise<Match[]> | null = null;

    function chercher(): Promise<Match[]> {
      const bookmaker = bookmakerPourUrl(location.href);
      if (!bookmaker) return Promise.reject(new Error('Site non pris en charge'));
      return LECTEURS[bookmaker.id]((matchs) => {
        browser.runtime.sendMessage({ type: 'progression', matchs } satisfies Progression).catch(() => {});
      }).then((matchs) => {
        if (matchs.length === 0) throw new Error(`${bookmaker.nom} n'a renvoyé aucun Match à venir. Réessayez dans un instant.`);
        return matchs;
      });
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
