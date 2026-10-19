import { describe, expect, it } from 'vitest';
import { estPlusRecente } from './version';

describe('estPlusRecente', () => {
  it('compare chaque chiffre comme un nombre', () => {
    expect(estPlusRecente('0.2.10', '0.2.9')).toBe(true);
    expect(estPlusRecente('0.3.1', '0.2.40')).toBe(true);
    expect(estPlusRecente('0.2.9', '0.2.10')).toBe(false);
  });

  it("n'annonce pas la version installée elle-même", () => {
    expect(estPlusRecente('0.2.41', '0.2.41')).toBe(false);
  });

  it('ignore un numéro illisible', () => {
    expect(estPlusRecente('nightly', '0.2.41')).toBe(false);
  });
});
