import { BOOKMAKERS, bookmakerPourUrl, type Bookmaker, type IdBookmaker } from '@/lib/bookmakers';
import { enregistrerLecture, lireLecture } from '@/lib/lectures';
import type {
  DemandeArreter,
  DemandeChercher,
  DemandePing,
  DemandeToutLire,
  Progression,
  ReponseChercher,
} from '@/lib/messages';
import { attendreReponse, avancer, avecDelai, finir, interrompre, lireTout, toutLire, type ToutLire } from '@/lib/tout-lire';

/** Délai pour que la page s'ouvre et charge le script de page. */
const CHARGEMENT_MS = 30_000;

export default defineBackground(() => {
  browser.action.setBadgeBackgroundColor({ color: '#1a7f37' });
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

  // Les onglets de « Tout lire » se ferment vite : un onglet déjà fermé n'a plus de badge à mettre à jour.
  function majBadge(tabId: number, url: string | undefined) {
    browser.action.setBadgeText({ tabId, text: bookmakerPourUrl(url) ? '✓' : '' }).catch(() => {});
  }

  browser.tabs.onUpdated.addListener((tabId, _changement, onglet) => majBadge(tabId, onglet.url));
  browser.tabs.onActivated.addListener(({ tabId }) => {
    browser.tabs.get(tabId).then((onglet) => majBadge(tabId, onglet.url), () => {});
  });

  // « Tout lire » (ADR 0005) : mené ici plutôt que dans le panneau, pour que fermer le panneau ne l'arrête pas.
  // Le panneau suit l'avancement dans `toutLire` (zone session).
  let course: { etat: ToutLire; arrete: boolean } | null = null;
  /** Onglets de la fenêtre réduite, pour rattacher leurs messages de progression à leur Bookmaker. */
  const ongletsLus = new Map<number, IdBookmaker>();

  function publier(etat: ToutLire) {
    toutLire.setValue({ ...etat, sites: { ...etat.sites } });
  }

  // Un service worker qui redémarre a perdu la lecture en cours : on ferme sa fenêtre et on le dit.
  toutLire.getValue().then((etat) => {
    if (!etat?.enCours || course) return;
    if (etat.fenetre !== null) browser.windows.remove(etat.fenetre).catch(() => {});
    publier(interrompre(etat));
  });

  async function lireDansFenetre(bookmaker: Bookmaker, windowId: number, arrete: () => boolean): Promise<number> {
    const onglet = await browser.tabs.create({ windowId, url: bookmaker.urlFootball, active: false });
    const tabId = onglet.id!;
    ongletsLus.set(tabId, bookmaker.id);
    try {
      await attendreReponse(() => browser.tabs.sendMessage(tabId, { type: 'ping' } satisfies DemandePing), {
        arrete,
        delaiMs: CHARGEMENT_MS,
        message: `La page de ${bookmaker.nom} ne s'est pas chargée en ${CHARGEMENT_MS / 1000} s.`,
      });
      const ms = bookmaker.delaiLectureMs;
      const reponse = await avecDelai<ReponseChercher>(
        browser.tabs.sendMessage(tabId, { type: 'chercher' } satisfies DemandeChercher),
        ms,
        `${bookmaker.nom} n'a pas fini sa lecture en ${ms / 1000} s.`,
      );
      if (!reponse.ok) throw new Error(reponse.erreur);
      return (await enregistrerLecture(bookmaker.id, reponse.matchs)).matchs.length;
    } finally {
      ongletsLus.delete(tabId);
      browser.tabs.remove(tabId).catch(() => {});
    }
  }

  async function demarrer() {
    if (course) return;
    const etat: ToutLire = { debut: Date.now(), enCours: true, fenetre: null, sites: {} };
    const c = (course = { etat, arrete: false });
    const arrete = () => c.arrete;
    publier(etat);
    // Chaque appel d'API garde le service worker en vie, même pendant une longue lecture sans message.
    const garderEnVie = setInterval(() => browser.runtime.getPlatformInfo(), 20_000);
    try {
      // Réduite et non focalisée : la barre d'onglets du Trésorier ne bouge pas.
      const fenetre = await browser.windows.create({ state: 'minimized', focused: false, url: 'about:blank' });
      if (fenetre?.id === undefined) throw new Error("Chrome n'a pas ouvert de fenêtre.");
      const windowId = fenetre.id;
      etat.fenetre = windowId;
      publier(etat);
      await lireTout(BOOKMAKERS, {
        lire: (b) => lireDansFenetre(b, windowId, arrete),
        lueA: async (id) => (await lireLecture(id))?.lueA ?? null,
        maintenant: Date.now,
        signaler: (id, e) => {
          etat.sites[id] = e;
          publier(etat);
        },
        arrete,
      });
    } catch (e) {
      etat.erreur = `Impossible d'ouvrir la fenêtre de lecture : ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      clearInterval(garderEnVie);
      if (etat.fenetre !== null) browser.windows.remove(etat.fenetre).catch(() => {});
      course = null;
      publier({ ...etat, enCours: false, fenetre: null, sites: finir(etat.sites) });
    }
  }

  function arreter() {
    if (!course) return;
    course.arrete = true;
    // Fermer la fenêtre ferme ses onglets : les lectures en cours échouent aussitôt et ne sont pas enregistrées.
    if (course.etat.fenetre !== null) browser.windows.remove(course.etat.fenetre).catch(() => {});
  }

  browser.windows.onRemoved.addListener((windowId) => {
    // Le Trésorier a fermé la fenêtre réduite lui-même.
    if (course && windowId === course.etat.fenetre) arreter();
  });

  browser.runtime.onMessage.addListener((message: DemandeToutLire | DemandeArreter | Progression, envoyeur) => {
    if (message?.type === 'tout-lire') demarrer();
    else if (message?.type === 'arreter') arreter();
    else if (message?.type === 'progression' && course) {
      const id = ongletsLus.get(envoyeur.tab?.id ?? -1);
      if (id && avancer(course.etat, id, message.matchs)) publier(course.etat);
    }
  });
});
