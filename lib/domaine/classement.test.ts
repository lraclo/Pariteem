import { describe, expect, it } from 'vitest';
import { classement, meilleurePaire, type Criteres } from './classement';
import { cotePlancher } from './match';
import { HEURE, MAINTENANT, unMatch } from './test-utils';

const criteres: Criteres = {
  seuil: 2.5,
  fenetreMs: 21 * 24 * HEURE,
  tri: 'cote-plancher',
  maintenant: MAINTENANT,
};

describe('cotePlancher', () => {
  it('est la plus faible des trois Cotes', () => {
    expect(cotePlancher(unMatch('a', [3.1, 2.7, 2.9]))).toBe(2.7);
  });
});

describe('classement', () => {
  it('écarte les Matchs dont la Cote plancher est sous le Seuil', () => {
    const matchs = [unMatch('ok', [2.6, 3, 2.8]), unMatch('ko', [1.5, 4, 6])];
    expect(classement(matchs, criteres).map((m) => m.id)).toEqual(['ok']);
  });

  it('garde un Match dont la Cote plancher est égale au Seuil', () => {
    expect(classement([unMatch('pile', [2.5, 3, 3])], criteres)).toHaveLength(1);
  });

  it('écarte les Matchs déjà commencés ou hors Fenêtre', () => {
    const matchs = [
      unMatch('commence', [3, 3, 3], -1),
      unMatch('dans-2j', [3, 3, 3], 48),
      unMatch('dans-3j', [3, 3, 3], 72),
    ];
    const ids = classement(matchs, { ...criteres, fenetreMs: 48 * HEURE }).map((m) => m.id);
    expect(ids).toEqual(['dans-2j']);
  });

  it('trie par Cote plancher décroissante, puis par début', () => {
    const matchs = [
      unMatch('b', [2.6, 3, 3], 10),
      unMatch('a', [3.2, 3.3, 3.4], 50),
      unMatch('c', [2.6, 3, 3], 5),
    ];
    expect(classement(matchs, criteres).map((m) => m.id)).toEqual(['a', 'c', 'b']);
  });

  it('garde les dix meilleures Cotes planchers', () => {
    const matchs = Array.from({ length: 15 }, (_, i) =>
      unMatch(`m${i}`, [2.5 + i / 10, 4, 4]),
    );
    const ids = classement(matchs, criteres).map((m) => m.id);
    expect(ids).toHaveLength(10);
    expect(ids[0]).toBe('m14');
    expect(ids).not.toContain('m4');
  });

  it('en tri chronologique, réordonne les dix meilleurs par début', () => {
    const matchs = [
      ...Array.from({ length: 10 }, (_, i) => unMatch(`bon${i}`, [3, 3, 3], 100 - i)),
      unMatch('proche-mais-faible', [2.6, 3, 3], 1),
    ];
    const ids = classement(matchs, { ...criteres, tri: 'chronologique' }).map((m) => m.id);
    expect(ids).not.toContain('proche-mais-faible');
    expect(ids[0]).toBe('bon9');
    expect(ids[9]).toBe('bon0');
  });
});

describe('meilleurePaire', () => {
  it('prend les deux plus grosses Cotes planchers, quel que soit le tri', () => {
    const matchs = [
      unMatch('moyen', [2.8, 3, 3], 1),
      unMatch('top', [3.3, 3.3, 3.3], 90),
      unMatch('second', [3.1, 3.2, 3.5], 60),
    ];
    const paire = meilleurePaire(matchs, { ...criteres, tri: 'chronologique' });
    expect(paire?.map((m) => m.id)).toEqual(['top', 'second']);
  });

  it("n'existe pas avec moins de deux Matchs retenus", () => {
    expect(meilleurePaire([unMatch('seul', [3, 3, 3])], criteres)).toBeNull();
  });
});
