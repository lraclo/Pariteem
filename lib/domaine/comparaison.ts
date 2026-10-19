import { BOOKMAKERS, type Bookmaker, type IdBookmaker } from '../bookmakers';
import { phaseDepot, pireCas } from './calcul';
import { meilleurePaire, type Criteres } from './classement';
import { CONDITIONS_PAR_DEFAUT, ecartsAuxConditions, type ConditionsFreebet, type Ecart } from './conditions';
import type { Match, Paire } from './match';

/** Les Matchs d'un Bookmaker lus à un moment donné. */
export interface Lecture {
  /** Heure de la lecture, en millisecondes depuis l'epoch. */
  lueA: number;
  matchs: Match[];
}

export type Lectures = Partial<Record<IdBookmaker, Lecture>>;

export type LigneComparaison =
  | {
      type: 'paire';
      bookmaker: Bookmaker;
      lueA: number;
      paire: Paire;
      pireCas: number;
      /** Espérance de la Phase dépôt, au montant des conditions de ce Bookmaker. */
      esperance: number;
      ecarts: Ecart[];
    }
  | { type: 'sans-paire'; bookmaker: Bookmaker; lueA: number }
  | { type: 'jamais-lu'; bookmaker: Bookmaker };

const parNom = (a: { bookmaker: Bookmaker }, b: { bookmaker: Bookmaker }) =>
  a.bookmaker.nom.localeCompare(b.bookmaker.nom, 'fr', { sensitivity: 'base' });

/**
 * Une ligne par Bookmaker : d'abord ceux qui ont une Meilleure Paire, par Pire cas décroissant, puis ceux
 * lus sans Paire au Seuil, puis ceux jamais lus, ces deux groupes par ordre alphabétique.
 */
export function comparer(
  lectures: Lectures,
  criteres: Criteres,
  conditions: Partial<Record<IdBookmaker, ConditionsFreebet>>,
  bookmakers: readonly Bookmaker[] = BOOKMAKERS,
): LigneComparaison[] {
  const lignes = bookmakers.map((bookmaker): LigneComparaison => {
    const lecture = lectures[bookmaker.id];
    if (!lecture) return { type: 'jamais-lu', bookmaker };
    const paire = meilleurePaire(lecture.matchs, criteres);
    if (!paire) return { type: 'sans-paire', bookmaker, lueA: lecture.lueA };
    const c = conditions[bookmaker.id] ?? CONDITIONS_PAR_DEFAUT;
    return {
      type: 'paire',
      bookmaker,
      lueA: lecture.lueA,
      paire,
      pireCas: pireCas(paire),
      esperance: phaseDepot(paire, c.montant).esperance,
      ecarts: ecartsAuxConditions(paire, c),
    };
  });
  const groupe = (type: LigneComparaison['type']) => lignes.filter((l) => l.type === type);
  const avecPaire = groupe('paire') as Extract<LigneComparaison, { type: 'paire' }>[];
  return [
    ...avecPaire.sort((a, b) => b.pireCas - a.pireCas || parNom(a, b)),
    ...groupe('sans-paire').sort(parNom),
    ...groupe('jamais-lu').sort(parNom),
  ];
}
