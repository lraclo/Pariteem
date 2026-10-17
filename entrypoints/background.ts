import { bookmakerPourUrl } from '@/lib/bookmakers';
import type { NavigateurArc } from '@/lib/messages';

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

  browser.action.onClicked.addListener(async (onglet) => {
    const existante = await fenetrePariteem.getValue();
    if (existante !== null) {
      const ok = await browser.windows.update(existante, { focused: true }).then(() => true, () => false);
      if (ok) return;
    }
    const parent = onglet.windowId !== undefined ? await browser.windows.get(onglet.windowId) : undefined;
    const fenetre = await browser.windows.create({
      url: browser.runtime.getURL(`/sidepanel.html?tab=${onglet.id}`),
      type: 'popup',
      width: LARGEUR,
      height: HAUTEUR,
      left: parent?.left !== undefined && parent.width ? parent.left + parent.width - LARGEUR - 16 : undefined,
      top: parent?.top !== undefined ? parent.top + 80 : undefined,
    });
    await fenetrePariteem.setValue(fenetre?.id ?? null);
  });

  browser.windows.onRemoved.addListener(async (id) => {
    if (id === (await fenetrePariteem.getValue())) await fenetrePariteem.setValue(null);
  });
});
