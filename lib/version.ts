import { storage } from '#imports';

/** Le zip de la dernière Release (ADR 0003). */
export const URL_ZIP = 'https://github.com/lraclo/Pariteem/releases/latest/download/pariteem.zip';
const URL_DERNIERE_RELEASE = 'https://api.github.com/repos/lraclo/Pariteem/releases/latest';
const JOUR_MS = 86_400_000;

interface Verification {
  /** Heure de la dernière demande à GitHub, réussie ou non. */
  verifieeA: number;
  version: string | null;
}

const verification = storage.defineItem<Verification | null>('local:derniere-version', { fallback: null });

/** Version dont le Trésorier a fermé le bandeau ; une version plus récente l'affiche de nouveau. */
export const versionMasquee = storage.defineItem<string | null>('local:version-masquee', { fallback: null });

/** Vrai si `a` est une version plus récente que `b` : « 0.2.10 » l'est plus que « 0.2.9 ». */
export function estPlusRecente(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const ecart = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (ecart) return ecart > 0;
  }
  return false;
}

/**
 * Numéro de la dernière Release GitHub, demandé au plus une fois par jour (l'API accepte 60 requêtes
 * par heure sans compte, et sans permission de l'extension) ; null tant qu'il est inconnu.
 */
export async function derniereVersion(maintenant = Date.now()): Promise<string | null> {
  const precedente = await verification.getValue();
  if (precedente && maintenant - precedente.verifieeA < JOUR_MS) return precedente.version;
  let version = precedente?.version ?? null;
  try {
    const reponse = await fetch(URL_DERNIERE_RELEASE, { headers: { Accept: 'application/vnd.github+json' } });
    if (reponse.ok) version = ((await reponse.json()) as { tag_name: string }).tag_name.replace(/^v/, '');
  } catch {
    // Hors ligne : on garde la version connue et on réessaiera demain.
  }
  await verification.setValue({ verifieeA: maintenant, version });
  return version;
}
