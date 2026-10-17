import { useEffect, useState } from 'react';
import type { Browser } from 'wxt/browser';

/** L'onglet actif de la fenêtre du panneau, mis à jour quand on navigue ou change d'onglet. */
export function useOngletActif(): Browser.tabs.Tab | null {
  const [onglet, setOnglet] = useState<Browser.tabs.Tab | null>(null);

  useEffect(() => {
    const lire = async () => {
      const [actif] = await browser.tabs.query({ active: true, currentWindow: true });
      setOnglet(actif ?? null);
    };
    const surMaj = (_id: number, changement: Browser.tabs.OnUpdatedInfo) => {
      if (changement.url || changement.status === 'complete') lire();
    };
    lire();
    browser.tabs.onActivated.addListener(lire);
    browser.tabs.onUpdated.addListener(surMaj);
    return () => {
      browser.tabs.onActivated.removeListener(lire);
      browser.tabs.onUpdated.removeListener(surMaj);
    };
  }, []);

  return onglet;
}
