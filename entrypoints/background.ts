import { bookmakerPourUrl } from '@/lib/bookmakers';
import type { NavigateurArc } from '@/lib/messages';
import type { Browser } from 'wxt/browser';

const LARGEUR = 440;
const HAUTEUR = 760;

/** Fenêtre Pariteem ouverte, pour la réutiliser au lieu d'en ouvrir une autre. */
const fenetrePariteem = storage.defineItem<number | null>('session:fenetre-pariteem', { fallback: null });

/** Vrai dès qu'une page a signalé Arc, qui n'affiche pas les panneaux latéraux d'extension. */
const sansPanneauLateral = storage.defineItem<boolean>('local:sans-panneau-lateral', { fallback: false });

export default defineBackground(() => {
  browser.action.setBadgeBackgroundColor({ color: '#1a7f37' });

  // Panneau latéral par défaut (Chrome) ; sinon le clic arrive dans onClicked et ouvre une fenêtre.
  const appliquerComportement = (sansPanneau: boolean) =>
    browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: !sansPanneau }).catch(() => {});
  sansPanneauLateral.getValue().then(appliquerComportement);

  browser.runtime.onMessage.addListener((message: NavigateurArc) => {
    if (message?.type !== 'navigateur-arc') return;
    sansPanneauLateral.setValue(true);
    appliquerComportement(true);
  });

  function majBadge(tabId: number, url: string | undefined) {
    browser.action.setBadgeText({ tabId, text: bookmakerPourUrl(url) ? '✓' : '' });
  }

  browser.tabs.onUpdated.addListener((tabId, _changement, onglet) => majBadge(tabId, onglet.url));
  browser.tabs.onActivated.addListener(async ({ tabId }) => {
    majBadge(tabId, (await browser.tabs.get(tabId)).url);
  });

  async function ouvrirFenetre(onglet: Browser.tabs.Tab | undefined) {
    const existante = await fenetrePariteem.getValue();
    if (existante !== null) {
      const ok = await browser.windows.update(existante, { focused: true }).then(() => true, () => false);
      if (ok) return;
    }
    const parent = onglet?.windowId !== undefined ? await browser.windows.get(onglet.windowId) : undefined;
    const fenetre = await browser.windows.create({
      // Sans onglet connu, la fenêtre suit l'onglet actif du navigateur.
      url: browser.runtime.getURL(`/sidepanel.html?tab=${onglet?.id ?? ''}`),
      type: 'popup',
      width: LARGEUR,
      height: HAUTEUR,
      left: parent?.left !== undefined && parent.width ? parent.left + parent.width - LARGEUR - 16 : undefined,
      top: parent?.top !== undefined ? parent.top + 80 : undefined,
    });
    await fenetrePariteem.setValue(fenetre?.id ?? null);
  }

  // Ne se déclenche que lorsque le panneau latéral est désactivé (Arc repéré).
  browser.action.onClicked.addListener(ouvrirFenetre);

  // Repérer Arc n'est pas garanti : le raccourci et le clic droit sur l'icône
  // ouvrent toujours la fenêtre, et basculent les clics suivants sur la fenêtre.
  const MENU_FENETRE = 'ouvrir-fenetre';
  const MENU_PANNEAU = 'revenir-panneau';
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({ id: MENU_FENETRE, title: 'Ouvrir dans une fenêtre', contexts: ['action'] });
    browser.contextMenus.create({ id: MENU_PANNEAU, title: 'Revenir au panneau latéral (Chrome)', contexts: ['action'] });
  });
  const forcerFenetre = (onglet: Browser.tabs.Tab | undefined) => {
    sansPanneauLateral.setValue(true);
    appliquerComportement(true);
    ouvrirFenetre(onglet);
  };
  browser.contextMenus.onClicked.addListener((info, onglet) => {
    if (info.menuItemId === MENU_FENETRE) forcerFenetre(onglet);
    if (info.menuItemId === MENU_PANNEAU) {
      sansPanneauLateral.setValue(false);
      appliquerComportement(false);
    }
  });
  browser.commands.onCommand.addListener((commande, onglet) => {
    if (commande === MENU_FENETRE) forcerFenetre(onglet);
  });

  browser.windows.onRemoved.addListener(async (id) => {
    if (id === (await fenetrePariteem.getValue())) await fenetrePariteem.setValue(null);
  });
});
