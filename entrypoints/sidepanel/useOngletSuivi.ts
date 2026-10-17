import { useEffect, useState } from 'react';
import type { Browser } from 'wxt/browser';

/**
 * L'onglet que regarde l'utilisateur.
 * - Dans le panneau latéral (Chrome) : l'onglet actif de la même fenêtre.
 * - Dans la fenêtre Pariteem (Arc) : l'onglet d'où l'icône a été cliquée,
 *   puis tout onglet activé dans une autre fenêtre.
 */
export function useOngletSuivi(): Browser.tabs.Tab | null {
  const [onglet, setOnglet] = useState<Browser.tabs.Tab | null>(null);

  useEffect(() => {
    const parametre = new URLSearchParams(location.search).get('tab');
    const dansFenetreSeparee = parametre !== null;
    let suivi: number | undefined = parametre ? Number(parametre) : undefined;
    let maFenetre: number | undefined;

    const lire = async () => {
      if (suivi === undefined) {
        // Fenêtre séparée : l'onglet actif d'une fenêtre de navigation, pas le sien.
        const [actif] = await browser.tabs.query(
          dansFenetreSeparee ? { active: true, windowType: 'normal' } : { active: true, currentWindow: true },
        );
        suivi = actif?.id;
      }
      setOnglet(suivi === undefined ? null : await browser.tabs.get(suivi).catch(() => null));
    };
    const surActivation = ({ tabId, windowId }: Browser.tabs.OnActivatedInfo) => {
      const autreFenetre = windowId !== maFenetre;
      if (dansFenetreSeparee ? !autreFenetre : autreFenetre) return;
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
