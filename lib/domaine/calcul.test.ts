import { describe, expect, it } from 'vitest';
import { combinaisons, phaseDepot, phaseFreebet, pireCas } from './calcul';
import type { Paire } from './match';
import { unMatch } from './test-utils';

const paire: Paire = [unMatch('A', [2.5, 3, 4]), unMatch('B', [2.6, 3.2, 2.8])];

describe('combinaisons', () => {
  it('compte neuf Combinaisons avec leur Cote combinée', () => {
    const c = combinaisons(paire);
    expect(c).toHaveLength(9);
    expect(c[0]).toEqual({ issues: ['1', '1'], coteCombinee: 2.5 * 2.6 });
    expect(c[8]!.issues).toEqual(['2', '2']);
    expect(c[8]!.coteCombinee).toBeCloseTo(4 * 2.8);
  });
});

describe('pireCas', () => {
  it('est le produit des deux Cotes planchers', () => {
    expect(pireCas(paire)).toBeCloseTo(2.5 * 2.6);
  });
});

describe('phaseDepot', () => {
  const resultat = phaseDepot(paire, 100);

  it('mise de l’argent réel sur les neuf Combinaisons', () => {
    expect(resultat.misesReelles).toBe(900);
    expect(resultat.lignes.every((l) => l.mise === 'depot')).toBe(true);
  });

  it('calcule le gain et le résultat net de chaque Combinaison', () => {
    expect(resultat.lignes[0]!.gain).toBeCloseTo(650);
    expect(resultat.lignes[0]!.net).toBeCloseTo(-250);
  });

  it('donne la perte maximale au Pire cas', () => {
    expect(resultat.perteMax).toBeCloseTo(250);
  });

  it('annonce huit Freebets gagnés', () => {
    expect(resultat.freebetsObtenus).toBe(8);
  });
});

describe('phaseFreebet', () => {
  it('place par défaut le dépôt sur la plus grosse Cote combinée', () => {
    const resultat = phaseFreebet(paire, 100);
    const depots = resultat.lignes.filter((l) => l.mise === 'depot');
    expect(depots).toHaveLength(1);
    expect(depots[0]!.combinaison.issues).toEqual(['2', 'N']);
  });

  it('ne verse que le gain net sur un Freebet gagnant (mise non rendue)', () => {
    const resultat = phaseFreebet(paire, 100);
    const ligne = resultat.lignes[0]!;
    expect(ligne.mise).toBe('freebet');
    expect(ligne.gain).toBeCloseTo(100 * (2.5 * 2.6 - 1));
    expect(ligne.net).toBeCloseTo(100 * (2.5 * 2.6 - 1) - 100);
  });

  it('verse la mise et le gain sur le dépôt gagnant', () => {
    const resultat = phaseFreebet(paire, 100);
    const depot = resultat.lignes.find((l) => l.mise === 'depot')!;
    expect(depot.gain).toBeCloseTo(100 * 4 * 3.2);
    expect(resultat.misesReelles).toBe(100);
  });

  it('accepte un dépôt placé sur une autre Combinaison', () => {
    const resultat = phaseFreebet(paire, 100, { indexDepot: 0 });
    expect(resultat.lignes[0]!.mise).toBe('depot');
    expect(resultat.lignes.filter((l) => l.mise === 'depot')).toHaveLength(1);
  });

  it('rend la mise quand le Bookmaker rembourse en argent retirable', () => {
    const ligne = phaseFreebet(paire, 100, { miseRendue: true }).lignes[0]!;
    expect(ligne.gain).toBeCloseTo(100 * 2.5 * 2.6);
  });

  it("n'a pas de perte quand toutes les Cotes combinées dépassent 2", () => {
    expect(phaseFreebet(paire, 100).perteMax).toBe(0);
  });
});
