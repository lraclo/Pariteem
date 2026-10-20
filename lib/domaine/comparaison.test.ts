import { describe, expect, it } from 'vitest';
import { BOOKMAKERS } from '../bookmakers';
import { pireCas } from './calcul';
import type { Criteres } from './classement';
import { comparer, lecturesAvecPeuDeMatchs, type Lectures } from './comparaison';
import { CONDITIONS_PAR_DEFAUT, ecartsAuxConditions } from './conditions';
import { HEURE, MAINTENANT, unMatch } from './test-utils';

const criteres: Criteres = {
  seuil: 2.5,
  fenetreMs: 21 * 24 * HEURE,
  tri: 'cote-plancher',
  maintenant: MAINTENANT,
};

const LU = MAINTENANT - HEURE;

/** Une Lecture dont la Meilleure Paire a ces deux Cotes planchers. */
function lecture(planchers: [number, number], lueA = LU) {
  return {
    lueA,
    matchs: [unMatch(`a${planchers[0]}`, [planchers[0], 4, 4]), unMatch(`b${planchers[1]}`, [planchers[1], 4, 4])],
  };
}

describe('comparer', () => {
  it('donne une ligne par Bookmaker', () => {
    expect(comparer({}, criteres, {})).toHaveLength(BOOKMAKERS.length);
  });

  it('range les Bookmakers avec Paire, puis lus sans Paire, puis jamais lus', () => {
    const lectures: Lectures = {
      winamax: { lueA: LU, matchs: [unMatch('faible', [1.5, 4, 6])] },
      unibet: lecture([2.6, 2.7]),
    };
    const lignes = comparer(lectures, criteres, {});
    expect(lignes.slice(0, 2).map((l) => [l.bookmaker.id, l.type])).toEqual([
      ['unibet', 'paire'],
      ['winamax', 'sans-paire'],
    ]);
    expect(lignes.slice(2).every((l) => l.type === 'jamais-lu')).toBe(true);
  });

  it('classe les Bookmakers par Pire cas décroissant', () => {
    const lectures: Lectures = {
      winamax: lecture([2.6, 2.6]),
      unibet: lecture([3.2, 3.1]),
      pmu: lecture([2.9, 2.8]),
    };
    const lignes = comparer(lectures, criteres, {});
    expect(lignes.slice(0, 3).map((l) => l.bookmaker.id)).toEqual(['unibet', 'pmu', 'winamax']);
    const premiere = lignes[0]!;
    expect(premiere.type === 'paire' && premiere.pireCas).toBeCloseTo(3.2 * 3.1);
  });

  it('range par ordre alphabétique les Bookmakers sans Paire et ceux jamais lus', () => {
    const sansPaire = { lueA: LU, matchs: [] };
    const lignes = comparer({ winamax: sansPaire, betclic: sansPaire, bwin: sansPaire }, criteres, {});
    expect(lignes.slice(0, 3).map((l) => l.bookmaker.nom)).toEqual(['Betclic', 'Bwin', 'Winamax']);
    const jamaisLus = lignes.slice(3).map((l) => l.bookmaker.nom);
    expect(jamaisLus).toEqual([...jamaisLus].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })));
  });

  it("n'a pas de Paire quand un seul Match atteint le Seuil", () => {
    const lectures: Lectures = { winamax: { lueA: LU, matchs: [unMatch('seul', [3, 3, 3]), unMatch('bas', [2, 3, 4])] } };
    expect(comparer(lectures, criteres, {})[0]).toMatchObject({ type: 'sans-paire', lueA: LU });
  });

  it("donne le Seuil auquel une Paire existerait : la deuxième plus forte Cote plancher de la Fenêtre", () => {
    const matchs = [unMatch('a', [2.44, 3, 3]), unMatch('b', [2.42, 3.1, 2.9]), unMatch('c', [2.3, 3, 3]), unMatch('loin', [2.48, 3, 3], 30 * 24)];
    expect(comparer({ bwin: { lueA: LU, matchs } }, criteres, {})[0]).toMatchObject({ type: 'sans-paire', seuilPossible: 2.42 });
    expect(comparer({ bwin: { lueA: LU, matchs: [matchs[0]!] } }, criteres, {})[0]).toMatchObject({ seuilPossible: null });
  });

  it('suit le Seuil des critères', () => {
    const lectures: Lectures = { winamax: lecture([2.6, 2.7]) };
    expect(comparer(lectures, { ...criteres, seuil: 2.65 }, {})[0]?.type).toBe('sans-paire');
  });

  it('ignore les Matchs déjà commencés', () => {
    const lectures: Lectures = {
      winamax: {
        lueA: LU,
        matchs: [unMatch('commence', [4, 4, 4], -1), unMatch('a', [3, 3, 3]), unMatch('b', [2.8, 3, 3])],
      },
    };
    const [ligne] = comparer(lectures, criteres, {});
    expect(ligne?.type === 'paire' && ligne.paire.map((m) => m.id)).toEqual(['a', 'b']);
  });

  it("prend les conditions par défaut d'un Bookmaker qui n'en a pas", () => {
    const lectures: Lectures = { winamax: lecture([2.6, 2.7]), unibet: lecture([2.8, 2.9]) };
    const conditions = { winamax: { ...CONDITIONS_PAR_DEFAUT, coteMinCombine: 100 } };
    const lignes = comparer(lectures, criteres, conditions);
    expect(lignes.slice(0, 2).map((l) => [l.bookmaker.id, l.type === 'paire' && l.ecarts])).toEqual([
      ['unibet', []],
      ['winamax', ['cote-min-combine']],
    ]);
  });

  it('signale les cotes minimales non respectées sans changer le classement', () => {
    const lectures: Lectures = { winamax: lecture([3.2, 3.1]), unibet: lecture([2.6, 2.7]) };
    const conditions = { winamax: { ...CONDITIONS_PAR_DEFAUT, coteMinSelection: 3.15 } };
    const lignes = comparer(lectures, criteres, conditions);
    expect(lignes.slice(0, 2).map((l) => [l.bookmaker.id, l.type === 'paire' && l.ecarts])).toEqual([
      ['winamax', ['cote-min-selection']],
      ['unibet', []],
    ]);
  });
});

describe('ecartsAuxConditions', () => {
  const paire = [unMatch('a', [2.6, 3, 3]), unMatch('b', [2.8, 3, 3])] as const;

  it('ne signale rien sans cote minimale', () => {
    expect(ecartsAuxConditions(paire, CONDITIONS_PAR_DEFAUT)).toEqual([]);
  });

  it('compare chaque Cote plancher à la cote minimale par sélection, et le Pire cas à celle du combiné', () => {
    const conditions = { ...CONDITIONS_PAR_DEFAUT, coteMinSelection: 2.7, coteMinCombine: pireCas(paire) + 0.01 };
    expect(ecartsAuxConditions(paire, conditions)).toEqual(['cote-min-selection', 'cote-min-combine']);
    expect(ecartsAuxConditions(paire, { ...conditions, coteMinSelection: 2.6, coteMinCombine: pireCas(paire) })).toEqual([]);
  });
});

describe('lecturesAvecPeuDeMatchs', () => {
  /** Une Lecture de `n` Matchs à venir, et `commences` déjà commencés. */
  const lue = (n: number, commences = 0) => ({
    lueA: LU,
    matchs: [
      ...Array.from({ length: n }, (_, i) => unMatch(`m${i}`, [3, 3, 3])),
      ...Array.from({ length: commences }, (_, i) => unMatch(`c${i}`, [3, 3, 3], -1)),
    ],
  });

  it('repère une Lecture qui a moins du quart des Matchs habituels', () => {
    const lectures: Lectures = { betclic: lue(18), winamax: lue(647), olybet: lue(586), betsson: lue(652) };
    expect(lecturesAvecPeuDeMatchs(lectures, MAINTENANT)).toEqual({ betclic: { lus: 18, habituel: 647 } });
  });

  it("ne juge pas sans au moins trois autres Bookmakers lus", () => {
    expect(lecturesAvecPeuDeMatchs({ betclic: lue(18), winamax: lue(647), olybet: lue(586) }, MAINTENANT)).toEqual({});
  });

  it('ne compte que les Matchs à venir', () => {
    const lectures: Lectures = { betclic: lue(18, 600), winamax: lue(600), olybet: lue(600), betsson: lue(600) };
    expect(Object.keys(lecturesAvecPeuDeMatchs(lectures, MAINTENANT))).toEqual(['betclic']);
  });

  it('ignore une Lecture supprimée, restée comme clé sans valeur', () => {
    const lectures: Lectures = { betclic: lue(18), winamax: lue(647), olybet: lue(586), betsson: lue(652), pmu: undefined };
    expect(lecturesAvecPeuDeMatchs(lectures, MAINTENANT)).toEqual({ betclic: { lus: 18, habituel: 647 } });
    expect(() => comparer(lectures, criteres, {})).not.toThrow();
  });

  it('passe le résultat aux lignes de la Comparaison', () => {
    const lectures: Lectures = { betclic: lue(18), winamax: lue(647), olybet: lue(586), betsson: lue(652) };
    const lignes = comparer(lectures, criteres, {});
    const betclic = lignes.find((l) => l.bookmaker.id === 'betclic');
    const winamax = lignes.find((l) => l.bookmaker.id === 'winamax');
    expect(betclic?.type !== 'jamais-lu' && betclic?.peuDeMatchs).toEqual({ lus: 18, habituel: 647 });
    expect(winamax?.type !== 'jamais-lu' && winamax?.peuDeMatchs).toBeNull();
  });
});
