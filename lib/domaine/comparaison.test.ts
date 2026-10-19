import { describe, expect, it } from 'vitest';
import { BOOKMAKERS } from '../bookmakers';
import { phaseDepot, pireCas } from './calcul';
import type { Criteres } from './classement';
import { comparer, type Lectures } from './comparaison';
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

  it('classe les Bookmakers par Pire cas décroissant, pas par Espérance', () => {
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
    expect(lignes.slice(0, 3).map((l) => l.bookmaker.nom)).toEqual(['Betclic', 'bwin', 'Winamax']);
    const jamaisLus = lignes.slice(3).map((l) => l.bookmaker.nom);
    expect(jamaisLus).toEqual([...jamaisLus].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })));
  });

  it("n'a pas de Paire quand un seul Match atteint le Seuil", () => {
    const lectures: Lectures = { winamax: { lueA: LU, matchs: [unMatch('seul', [3, 3, 3]), unMatch('bas', [2, 3, 4])] } };
    expect(comparer(lectures, criteres, {})[0]).toMatchObject({ type: 'sans-paire', lueA: LU });
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

  it("calcule l'Espérance de la Phase dépôt au montant des conditions du Bookmaker", () => {
    const lectures: Lectures = { winamax: lecture([2.6, 2.7]), unibet: lecture([2.8, 2.9]) };
    const conditions = { winamax: { ...CONDITIONS_PAR_DEFAUT, montant: 50 } };
    const lignes = comparer(lectures, criteres, conditions);
    for (const l of lignes.slice(0, 2)) {
      if (l.type !== 'paire') throw new Error('Paire attendue');
      const montant = l.bookmaker.id === 'winamax' ? 50 : CONDITIONS_PAR_DEFAUT.montant;
      expect(l.esperance).toBe(phaseDepot(l.paire, montant).esperance);
    }
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
