import { useEffect, useState } from 'react';
import { derniereVersion, estPlusRecente, URL_ZIP, versionMasquee } from '@/lib/version';

/** Bandeau discret en bas du panneau : sans mise à jour automatique (ADR 0003), un lecteur cassé se répare par le zip. */
export function NouvelleVersion() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const installee = browser.runtime.getManifest().version;
    Promise.all([derniereVersion(), versionMasquee.getValue()]).then(([v, masquee]) =>
      setVersion(v && v !== masquee && estPlusRecente(v, installee) ? v : null),
    );
  }, []);

  function masquer() {
    versionMasquee.setValue(version);
    setVersion(null);
  }

  if (!version) return null;
  return (
    <footer className="nouvelle-version">
      <span><span className="pastille" aria-hidden="true" />Nouvelle version disponible <span className="aide">{version}</span></span>
      <a href={URL_ZIP} title="Remplacez le contenu du dossier pariteem, puis cliquez sur ⟳ dans chrome://extensions.">
        Télécharger
      </a>
      <button type="button" className="fermer" aria-label="Masquer" title="Masquer jusqu'à la prochaine version" onClick={masquer}>
        <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
          <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </footer>
  );
}
