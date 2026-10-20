import { BOOKMAKERS, type Bookmaker, type IdBookmaker } from '../bookmakers';
import { pireCas } from './calcul';
import { meilleurePaire, type Criteres } from './classement';
import { CONDITIONS_PAR_DEFAUT, ecartsAuxConditions, type ConditionsFreebet, type Ecart } from './conditions';
import { cotePlancher, type Match, type Paire } from './match';

/** Les Matchs d'un Bookmaker lus à un moment donné. */
export interface Lecture {
  /** Heure de la lecture, en millisecondes depuis l'epoch. */
  lueA: number;
  matchs: Match[];
}

export type Lectures = Partial<Record<IdBookmaker, Lecture>>;

/** Une Lecture qui a nettement moins de Matchs à venir que celles des autres Bookmakers : la page a pu mal charger. */
export interface PeuDeMatchs {
  lus: number;
  /** Médiane des Matchs à venir des autres Bookmakers lus. */
  habituel: number;
}

export type LigneComparaison =
  | {
      type: 'paire';
      bookmaker: Bookmaker;
      lueA: number;
      paire: Paire;
      pireCas: number;
      ecarts: Ecart[];
      peuDeMatchs: PeuDeMatchs | null;
    }
  | {
      type: 'sans-paire';
      bookmaker: Bookmaker;
      lueA: number;
      peuDeMatchs: PeuDeMatchs | null;
      /** Seuil le plus haut auquel une Paire existerait dans la Fenêtre ; null s'il y a moins de deux Matchs. */
      seuilPossible: number | null;
    }
  | { type: 'jamais-lu'; bookmaker: Bookmaker };

/** Il faut au moins ce nombre d'autres Bookmakers lus pour juger qu'une Lecture a peu de Matchs. */
const AUTRES_MINIMUM = 3;
/** Part de la médiane des autres Bookmakers en deçà de laquelle une Lecture paraît incomplète. */
const PART_SUSPECTE = 0.25;

function mediane(valeurs: readonly number[]): number {
  const triees = [...valeurs].sort((a, b) => a - b);
  const milieu = triees.length / 2;
  return triees.length % 2 ? triees[Math.floor(milieu)]! : (triees[milieu - 1]! + triees[milieu]!) / 2;
}

/** Le nombre de Matchs qui n'ont pas encore commencé. */
export function matchsAVenir(matchs: readonly Match[], maintenant: number): number {
  return matchs.filter((m) => m.debut > maintenant).length;
}

/**
 * Les Bookmakers dont la Lecture a moins du quart des Matchs à venir habituels, comparée à la médiane
 * des autres : 18 Matchs quand les autres en ont 600, comme Betclic lu dans une page masquée.
 */
export function lecturesAvecPeuDeMatchs(lectures: Lectures, maintenant: number): Partial<Record<IdBookmaker, PeuDeMatchs>> {
  // Une Lecture supprimée reste comme clé sans valeur : elle ne compte pas.
  const aVenir = (Object.entries(lectures) as [IdBookmaker, Lecture | undefined][]).flatMap(([id, l]) =>
    l ? [[id, matchsAVenir(l.matchs, maintenant)] as const] : [],
  );
  const resultat: Partial<Record<IdBookmaker, PeuDeMatchs>> = {};
  for (const [id, lus] of aVenir) {
    const autres = aVenir.filter(([autre]) => autre !== id).map(([, n]) => n);
    if (autres.length < AUTRES_MINIMUM) continue;
    const habituel = mediane(autres);
    if (lus < habituel * PART_SUSPECTE) resultat[id] = { lus, habituel: Math.round(habituel) };
  }
  return resultat;
}

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
  const suspectes = lecturesAvecPeuDeMatchs(lectures, criteres.maintenant);
  const lignes = bookmakers.map((bookmaker): LigneComparaison => {
    const lecture = lectures[bookmaker.id];
    if (!lecture) return { type: 'jamais-lu', bookmaker };
    const peuDeMatchs = suspectes[bookmaker.id] ?? null;
    // Un seul Classement : la Meilleure Paire sans Seuil est celle du Seuil dès que ses deux Cotes planchers
    // l'atteignent, et sinon sa plus faible Cote plancher est le Seuil où une Paire apparaîtrait.
    const sansSeuil = meilleurePaire(lecture.matchs, { ...criteres, seuil: 1 });
    const paire = sansSeuil && cotePlancher(sansSeuil[1]) >= criteres.seuil ? sansSeuil : null;
    if (!paire) {
      const seuilPossible = sansSeuil ? cotePlancher(sansSeuil[1]) : null;
      return { type: 'sans-paire', bookmaker, lueA: lecture.lueA, peuDeMatchs, seuilPossible };
    }
    return {
      type: 'paire',
      bookmaker,
      lueA: lecture.lueA,
      paire,
      pireCas: pireCas(paire),
      ecarts: ecartsAuxConditions(paire, conditions[bookmaker.id] ?? CONDITIONS_PAR_DEFAUT),
      peuDeMatchs,
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
