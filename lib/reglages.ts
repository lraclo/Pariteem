import { storage } from '#imports';
import type { Tri } from './domaine/classement';
import type { IdBookmaker } from './bookmakers';
import type { ConditionsFreebet } from './domaine/conditions';

export { CONDITIONS_PAR_DEFAUT, type ConditionsFreebet } from './domaine/conditions';

export const FENETRES = [
  { libelle: '24 h', court: '24 h', ms: 24 * 3_600_000 },
  { libelle: '48 h', court: '48 h', ms: 48 * 3_600_000 },
  { libelle: '7 jours', court: '7 j', ms: 7 * 86_400_000 },
  { libelle: '3 semaines', court: '3 sem.', ms: 21 * 86_400_000 },
] as const;

export interface Reglages {
  seuil: number;
  fenetreMs: number;
  tri: Tri;
}

export const reglages = storage.defineItem<Reglages>('local:reglages', {
  fallback: { seuil: 2.5, fenetreMs: FENETRES[3].ms, tri: 'cote-plancher' },
});

/** Par Bookmaker ; un Bookmaker absent (ajouté depuis le dernier réglage) prend CONDITIONS_PAR_DEFAUT. */
export const conditionsFreebet = storage.defineItem<Partial<Record<IdBookmaker, ConditionsFreebet>>>(
  'local:conditions-freebet',
  { fallback: {} },
);
