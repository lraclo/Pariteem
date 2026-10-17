import { cotePlancher, ISSUES, type Issue, type Paire } from './match';

export interface Combinaison {
  issues: [Issue, Issue];
  coteCombinee: number;
}

export type TypeMise = 'depot' | 'freebet';

export interface Ligne {
  combinaison: Combinaison;
  mise: TypeMise;
  /** Somme versée par le Bookmaker si cette Combinaison gagne. */
  gain: number;
  /** Gain moins tout l'argent réel déposé pendant la Phase. */
  net: number;
}

export interface ResultatPhase {
  lignes: Ligne[];
  misesReelles: number;
  pireCas: number;
  /** Plus grosse perte possible sur la Phase, 0 si aucune Combinaison ne fait perdre. */
  perteMax: number;
}

export function combinaisons([a, b]: Paire): Combinaison[] {
  return ISSUES.flatMap((ia) =>
    ISSUES.map((ib) => ({
      issues: [ia, ib] as [Issue, Issue],
      coteCombinee: a.cotes[ia] * b.cotes[ib],
    })),
  );
}

export function pireCas([a, b]: Paire): number {
  return cotePlancher(a) * cotePlancher(b);
}

function resultat(
  paire: Paire,
  mise: number,
  types: TypeMise[],
  miseRendue = false,
): ResultatPhase {
  const misesReelles = types.filter((t) => t === 'depot').length * mise;
  const lignes = combinaisons(paire).map((combinaison, i): Ligne => {
    const type = types[i] ?? 'depot';
    const gain =
      type === 'depot' || miseRendue
        ? mise * combinaison.coteCombinee
        : mise * (combinaison.coteCombinee - 1);
    return { combinaison, mise: type, gain, net: gain - misesReelles };
  });
  const pireNet = Math.min(...lignes.map((l) => l.net));
  return {
    lignes,
    misesReelles,
    pireCas: pireCas(paire),
    perteMax: Math.max(0, -pireNet),
  };
}

/** Neuf Titulaires misent chacun `mise` d'argent réel, une Combinaison chacun. */
export function phaseDepot(paire: Paire, mise: number): ResultatPhase {
  return resultat(paire, mise, Array(9).fill('depot'));
}

export interface OptionsFreebet {
  /** Combinaison couverte par le dépôt ; par défaut la moins probable. */
  indexDepot?: number;
  /** Vrai si le Bookmaker rembourse en argent retirable plutôt qu'en Freebet. */
  miseRendue?: boolean;
}

/**
 * Huit Freebets et un dépôt d'un nouveau Titulaire. Par défaut le dépôt va sur la
 * Combinaison la moins probable, pour maximiser la chance d'obtenir un nouveau Freebet.
 */
export function phaseFreebet(
  paire: Paire,
  mise: number,
  { indexDepot, miseRendue = false }: OptionsFreebet = {},
): ResultatPhase {
  const cotes = combinaisons(paire).map((c) => c.coteCombinee);
  const depot = indexDepot ?? cotes.indexOf(Math.max(...cotes));
  return resultat(
    paire,
    mise,
    cotes.map((_, i) => (i === depot ? 'depot' : 'freebet')),
    miseRendue,
  );
}
