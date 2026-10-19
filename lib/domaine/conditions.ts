import { pireCas } from './calcul';
import { cotePlancher, type Paire } from './match';

/** Conditions de l'offre de bienvenue d'un Bookmaker, saisies par le Trésorier. */
export interface ConditionsFreebet {
  montant: number;
  /** Vrai si le premier pari perdant est remboursé en argent retirable. */
  miseRendue: boolean;
  coteMinSelection: number | null;
  coteMinCombine: number | null;
}

export const CONDITIONS_PAR_DEFAUT: ConditionsFreebet = {
  montant: 100,
  miseRendue: false,
  coteMinSelection: null,
  coteMinCombine: null,
};

/** Cote minimale de l'offre de bienvenue que la Paire ne respecte pas. */
export type Ecart = 'cote-min-selection' | 'cote-min-combine';

export function ecartsAuxConditions(paire: Paire, conditions: ConditionsFreebet): Ecart[] {
  const ecarts: Ecart[] = [];
  if (conditions.coteMinSelection && paire.some((m) => cotePlancher(m) < conditions.coteMinSelection!))
    ecarts.push('cote-min-selection');
  if (conditions.coteMinCombine && pireCas(paire) < conditions.coteMinCombine) ecarts.push('cote-min-combine');
  return ecarts;
}
