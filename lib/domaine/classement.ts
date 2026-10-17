import { cotePlancher, type Match, type Paire } from './match';

export type Tri = 'cote-plancher' | 'chronologique';

export interface Criteres {
  seuil: number;
  /** Durée de la Fenêtre, à partir de maintenant. */
  fenetreMs: number;
  tri: Tri;
  maintenant: number;
}

export const TAILLE_CLASSEMENT = 10;

function parCotePlancher(a: Match, b: Match): number {
  return cotePlancher(b) - cotePlancher(a) || a.debut - b.debut;
}

/** Les dix Matchs de la Fenêtre ayant les plus grosses Cotes planchers au-dessus du Seuil. */
export function classement(matchs: readonly Match[], criteres: Criteres): Match[] {
  const fin = criteres.maintenant + criteres.fenetreMs;
  const meilleurs = matchs
    .filter(
      (m) =>
        m.debut > criteres.maintenant && m.debut <= fin && cotePlancher(m) >= criteres.seuil,
    )
    .sort(parCotePlancher)
    .slice(0, TAILLE_CLASSEMENT);
  return criteres.tri === 'chronologique'
    ? meilleurs.sort((a, b) => a.debut - b.debut)
    : meilleurs;
}

/** Les deux premiers Matchs du Classement par Cote plancher, quel que soit le tri affiché. */
export function meilleurePaire(matchs: readonly Match[], criteres: Criteres): Paire | null {
  const [a, b] = classement(matchs, { ...criteres, tri: 'cote-plancher' });
  return a && b ? [a, b] : null;
}
