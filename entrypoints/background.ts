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
import {
  attendreReponse,
  avancer,
  avecDelai,
  finir,
  interrompre,
  lectureIncomplete,
  lireTout,
  toutLire,
  type ToutLire,
} from '@/lib/tout-lire';

/** Délai pour que la page s'ouvre et charge le script de page. */
const CHARGEMENT_MS = 30_000;
/** Taille de la petite fenêtre visible d'un site lu par défilement, posée dans le coin de la fenêtre du Trésorier. */
const PETITE_FENETRE = { largeur: 520, hauteur: 560, marge: 24 };

type Course = { etat: ToutLire; arrete: boolean };

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
  let course: Course | null = null;
  /** Onglets de la fenêtre réduite, pour rattacher leurs messages de progression à leur Bookmaker. */
  const ongletsLus = new Map<number, IdBookmaker>();

  function publier(etat: ToutLire) {
    toutLire.setValue({ ...etat, sites: { ...etat.sites } });
  }

  // Un service worker qui redémarre a perdu la lecture en cours : on ferme sa fenêtre et on le dit.
  toutLire.getValue().then((etat) => {
    if (!etat?.enCours || course) return;
    fermerFenetres(etat);
    publier(interrompre(etat));
  });

  function fermerFenetres(etat: ToutLire) {
    for (const id of [etat.fenetre, etat.fenetreVisible]) if (id != null) browser.windows.remove(id).catch(() => {});
  }

  /**
   * Ouvre la page football du Bookmaker : un onglet de la fenêtre réduite, ou, pour une lecture par défilement,
   * une petite fenêtre non focalisée dans le coin de celle du Trésorier, que Chrome garde visible.
   */
  async function ouvrir(bookmaker: Bookmaker, c: Course): Promise<{ tabId: number; fermer: () => void }> {
    if (!bookmaker.lectureParDefilement) {
      const onglet = await browser.tabs.create({ windowId: c.etat.fenetre!, url: bookmaker.urlFootball, active: false });
      return { tabId: onglet.id!, fermer: () => browser.tabs.remove(onglet.id!).catch(() => {}) };
    }
    const { largeur, hauteur, marge } = PETITE_FENETRE;
    const principale = await browser.windows.getLastFocused().catch(() => null);
    const coin =
      principale?.left !== undefined && principale.top !== undefined && principale.width && principale.height
        ? {
            left: principale.left + Math.max(0, principale.width - largeur - marge),
            top: principale.top + Math.max(0, principale.height - hauteur - marge),
          }
        : {};
    const fenetre = await browser.windows.create({
      url: bookmaker.urlFootball,
      type: 'normal',
      focused: false,
      width: largeur,
      height: hauteur,
      ...coin,
    });
    const tabId = fenetre?.tabs?.[0]?.id;
    if (fenetre?.id === undefined || tabId === undefined) throw new Error("Chrome n'a pas ouvert de fenêtre.");
    c.etat.fenetreVisible = fenetre.id;
    publier(c.etat);
    return {
      tabId,
      fermer: () => {
        browser.windows.remove(fenetre.id!).catch(() => {});
        c.etat.fenetreVisible = null;
      },
    };
  }

  async function lireDansFenetre(bookmaker: Bookmaker, c: Course): Promise<number> {
    const arrete = () => c.arrete;
    const { tabId, fermer } = await ouvrir(bookmaker, c);
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
      // Une page qui a mal chargé ne doit pas effacer une bonne Lecture.
      const incomplete = lectureIncomplete(reponse.matchs, await lireLecture(bookmaker.id));
      if (incomplete) {
        throw new Error(
          `Lecture incomplète : ${incomplete.lus} Matchs au lieu d'environ ${incomplete.attendus}. La Lecture précédente est gardée ; relisez ${bookmaker.nom} sur son site.`,
        );
      }
      return (await enregistrerLecture(bookmaker.id, reponse.matchs)).matchs.length;
    } finally {
      ongletsLus.delete(tabId);
      fermer();
    }
  }

  async function demarrer() {
    if (course) return;
    const etat: ToutLire = { debut: Date.now(), enCours: true, fenetre: null, sites: {} };
    const c: Course = (course = { etat, arrete: false });
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
        lire: (b) => lireDansFenetre(b, c),
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
      fermerFenetres(etat);
      course = null;
      publier({ ...etat, enCours: false, fenetre: null, fenetreVisible: null, sites: finir(etat.sites) });
    }
  }

  function arreter() {
    if (!course) return;
    course.arrete = true;
    // Fermer les fenêtres ferme leurs onglets : les lectures en cours échouent aussitôt et ne sont pas enregistrées.
    fermerFenetres(course.etat);
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
