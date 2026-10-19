import type { Issue } from '../domaine/match';

/** Reçoit le nombre de Matchs lus jusqu'ici, pendant une recherche en plusieurs requêtes. */
export type Progression = (matchs: number) => void;

/** Les trois Cotes d'un Match, ou null s'il en manque une ou qu'une Issue est suspendue (cote ≤ 1). */
export function troisCotes(
  c1: number | null | undefined,
  cN: number | null | undefined,
  c2: number | null | undefined,
): Record<Issue, number> | null {
  if (!(c1! > 1 && cN! > 1 && c2! > 1)) return null;
  return { '1': c1!, N: cN!, '2': c2! };
}

/** Segment d'adresse à la façon des sites : minuscules, sans accents, mots séparés par des tirets. */
export function slug(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ø/gi, 'o')
    .replace(/æ/gi, 'ae')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Exécute `tache` sur chaque élément, `simultanees` à la fois, en gardant l'ordre des résultats. */
export async function enParallele<T, R>(
  elements: readonly T[],
  simultanees: number,
  tache: (element: T) => Promise<R>,
): Promise<R[]> {
  const resultats: R[] = new Array(elements.length);
  let suivant = 0;
  async function ouvrier() {
    while (suivant < elements.length) {
      const i = suivant++;
      resultats[i] = await tache(elements[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(simultanees, elements.length) }, ouvrier));
  return resultats;
}

export function attendre(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Relance `tache` en cas d'échec, en attendant un peu plus à chaque fois : certains
 * sites refusent quelques requêtes quand elles s'enchaînent trop vite.
 */
export async function avecReprises<T>(tache: () => Promise<T>, essais = 4): Promise<T> {
  for (let essai = 1; ; essai++) {
    try {
      return await tache();
    } catch (e) {
      if (essai >= essais) throw e;
      await attendre(1000 * essai);
    }
  }
}

/** `fetch` qui échoue avec un message lisible si le site ne répond pas 2xx, et renvoie le JSON. */
export async function json<T>(nom: string, url: string, init?: RequestInit): Promise<T> {
  const reponse = await fetch(url, init);
  if (!reponse.ok) throw new Error(`${nom} a répondu ${reponse.status}`);
  return (await reponse.json()) as T;
}
