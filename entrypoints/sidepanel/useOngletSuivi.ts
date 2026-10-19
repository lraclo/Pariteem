import { useEffect, useState } from 'react';
import type { Browser } from 'wxt/browser';

/** L'onglet que regarde l'utilisateur : l'onglet actif de la fenêtre du panneau latéral ; undefined pendant le premier chargement. */
export function useOngletSuivi(): Browser.tabs.Tab | null | undefined {
  const [onglet, setOnglet] = useState<Browser.tabs.Tab | null>();

  useEffect(() => {
    let suivi: number | undefined;
    let maFenetre: number | undefined;

    const lire = async () => {
      if (suivi === undefined) {
        const [actif] = await browser.tabs.query({ active: true, currentWindow: true });
        suivi = actif?.id;
      }
      setOnglet(suivi === undefined ? null : await browser.tabs.get(suivi).catch(() => null));
    };
    const surActivation = ({ tabId, windowId }: Browser.tabs.OnActivatedInfo) => {
      if (windowId !== maFenetre) return;
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
