import { describe, expect, it } from 'vitest';
import { combinaisons, phaseDepot, phaseFreebet, pireCas } from './calcul';
import { probabilites, type Paire } from './match';
import { unMatch } from './test-utils';

const paire: Paire = [unMatch('A', [2.5, 3, 4]), unMatch('B', [2.6, 3.2, 2.8])];

describe('probabilites', () => {
  it('retire la marge du Bookmaker : proportionnelles à 1 / Cote, de somme 1', () => {
    const p = probabilites(unMatch('M', [2, 4, 8]));
    const total = 1 / 2 + 1 / 4 + 1 / 8;
    expect(p['1']).toBeCloseTo(0.5 / total);
    expect(p.N).toBeCloseTo(0.25 / total);
    expect(p['1'] + p.N + p['2']).toBeCloseTo(1);
  });
});

describe('esperance', () => {
  it('est nulle en Phase dépôt quand les Cotes sont sans marge', () => {
    const juste: Paire = [unMatch('A', [2, 4, 4]), unMatch('B', [2, 4, 4])];
    expect(phaseDepot(juste, 100).esperance).toBeCloseTo(0);
  });

  it('pondère le net de chaque Combinaison par sa probabilité', () => {
    const resultat = phaseFreebet(paire, 100);
    const [pa, pb] = [probabilites(paire[0]), probabilites(paire[1])];
    const attendu = resultat.lignes.reduce(
      (s, l) => s + l.net * pa[l.combinaison.issues[0]] * pb[l.combinaison.issues[1]],
      0,
    );
    expect(resultat.esperance).toBeCloseTo(attendu);
  });
});

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

  it('donne le pire résultat net au Pire cas', () => {
    expect(resultat.pireNet).toBeCloseTo(-250);
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

  it('traite un remboursement en argent retirable comme de l’argent réel', () => {
    const resultat = phaseFreebet(paire, 100, { miseRendue: true });
    expect(resultat.lignes[0]!.gain).toBeCloseTo(100 * 2.5 * 2.6);
    expect(resultat.misesReelles).toBe(900);
    expect(resultat.pireNet).toBeCloseTo(phaseDepot(paire, 100).pireNet);
  });

  it("n'a pas de perte quand toutes les Cotes combinées dépassent 2", () => {
    expect(phaseFreebet(paire, 100).pireNet).toBeGreaterThan(0);
  });
});
