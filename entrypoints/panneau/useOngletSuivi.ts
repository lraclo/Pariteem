import { useEffect, useState } from 'react';
import type { Browser } from 'wxt/browser';

/**
 * L'onglet que regarde l'utilisateur dans le navigateur, hors de la fenêtre
 * Pariteem : d'abord celui d'où l'icône a été cliquée, puis tout onglet activé
 * dans une autre fenêtre.
 */
export function useOngletSuivi(): Browser.tabs.Tab | null {
  const [onglet, setOnglet] = useState<Browser.tabs.Tab | null>(null);

  useEffect(() => {
    let suivi = Number(new URLSearchParams(location.search).get('tab'));
    let maFenetre: number | undefined;

    const lire = async () => {
      setOnglet(await browser.tabs.get(suivi).catch(() => null));
    };
    const surActivation = ({ tabId, windowId }: Browser.tabs.OnActivatedInfo) => {
      if (windowId === maFenetre) return;
      suivi = tabId;
      lire();
    };
    const surMaj = (tabId: number, changement: Browser.tabs.OnUpdatedInfo) => {
      if (tabId === suivi && (changement.url || changement.status === 'complete')) lire();
    };

    browser.windows.getCurrent().then((f) => (maFenetre = f.id));
    lire();
    browser.tabs.onActivated.addListener(surActivation);
    browser.tabs.onUpdated.addListener(surMaj);
    return () => {
      browser.tabs.onActivated.removeListener(surActivation);
      browser.tabs.onUpdated.removeListener(surMaj);
    };
  }, []);

  return onglet;
}
