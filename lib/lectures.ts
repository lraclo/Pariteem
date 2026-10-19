import { storage } from '#imports';
import type { WxtStorageItem } from 'wxt/utils/storage';
import { BOOKMAKERS, type IdBookmaker } from './bookmakers';
import type { Lecture, Lectures } from './domaine/comparaison';
import type { Match } from './domaine/match';

export type { Lecture, Lectures };

/**
 * Une clé par Bookmaker, dans la zone locale qui survit au redémarrage de Chrome : le panneau et « Tout lire »
 * peuvent enregistrer deux Bookmakers en même temps sans que l'un efface l'autre.
 */
const items = Object.fromEntries(
  BOOKMAKERS.map((b) => [b.id, storage.defineItem<Lecture | null>(`local:lecture-${b.id}`, { fallback: null })]),
) as Record<IdBookmaker, WxtStorageItem<Lecture | null, {}>>;

/** Remplace la Lecture du Bookmaker, sans les Matchs déjà commencés qui ne serviraient plus. */
export async function enregistrerLecture(id: IdBookmaker, matchs: readonly Match[], maintenant = Date.now()): Promise<Lecture> {
  const lecture: Lecture = { lueA: maintenant, matchs: matchs.filter((m) => m.debut > maintenant) };
  await items[id].setValue(lecture);
  return lecture;
}

export function lireLecture(id: IdBookmaker): Promise<Lecture | null> {
  return items[id].getValue();
}

export async function lireLectures(): Promise<Lectures> {
  const valeurs = await Promise.all(BOOKMAKERS.map((b) => items[b.id].getValue()));
  return Object.fromEntries(BOOKMAKERS.flatMap((b, i) => (valeurs[i] ? [[b.id, valeurs[i]]] : [])));
}

/** Appelle `surChangement` à chaque Lecture enregistrée, d'où qu'elle vienne ; renvoie de quoi arrêter. */
export function surveillerLectures(surChangement: (id: IdBookmaker, lecture: Lecture | null) => void): () => void {
  const arrets = BOOKMAKERS.map((b) => items[b.id].watch((lecture) => surChangement(b.id, lecture)));
  return () => arrets.forEach((arreter) => arreter());
}

/** Identifiants des Matchs cochés pour former la Paire, par Bookmaker. */
export const selections = storage.defineItem<Partial<Record<IdBookmaker, string[]>>>('local:selections', {
  fallback: {},
});
