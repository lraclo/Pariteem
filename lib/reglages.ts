import { storage } from '#imports';
import type { Tri } from './domaine/classement';
import type { IdBookmaker } from './bookmakers';

export const FENETRES = [
  { libelle: '24 h', ms: 24 * 3_600_000 },
  { libelle: '48 h', ms: 48 * 3_600_000 },
  { libelle: '7 jours', ms: 7 * 86_400_000 },
  { libelle: '3 semaines', ms: 21 * 86_400_000 },
] as const;

export interface Reglages {
  seuil: number;
  fenetreMs: number;
  tri: Tri;
}

/** Conditions de l'offre de bienvenue d'un Bookmaker, saisies par le Trésorier. */
export interface ConditionsFreebet {
  montant: number;
  /** Vrai si le premier pari perdant est remboursé en argent retirable. */
  miseRendue: boolean;
  coteMinSelection: number | null;
  coteMinCombine: number | null;
}

const CONDITIONS_PAR_DEFAUT: ConditionsFreebet = {
  montant: 100,
  miseRendue: false,
  coteMinSelection: null,
  coteMinCombine: null,
};

export const reglages = storage.defineItem<Reglages>('local:reglages', {
  fallback: { seuil: 2.5, fenetreMs: FENETRES[3].ms, tri: 'cote-plancher' },
});

export const conditionsFreebet = storage.defineItem<Record<IdBookmaker, ConditionsFreebet>>(
  'local:conditions-freebet',
  { fallback: { winamax: CONDITIONS_PAR_DEFAUT, betclic: CONDITIONS_PAR_DEFAUT } },
);
