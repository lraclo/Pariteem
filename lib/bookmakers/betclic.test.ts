// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lireBetclic } from './betclic';

const html = readFileSync(join(import.meta.dirname, 'fixtures/betclic-football.html'), 'utf8');
// Samedi 17 octobre 2026, 16 h, heure locale.
const maintenant = new Date(2026, 9, 17, 16, 0);

function lire() {
  document.body.innerHTML = html;
  return lireBetclic(document, maintenant);
}

describe('lireBetclic', () => {
  it('lit équipes, Compétition, Cotes et lien de chaque Match', () => {
    expect(lire()[0]).toEqual({
      id: 'betclic:1230958336438272',
      equipeDomicile: 'Strasbourg',
      equipeExterieur: 'Paris SG',
      competition: 'Ligue 1 McDonald’s®',
      debut: new Date(2026, 9, 17, 17, 15).getTime(),
      cotes: { '1': 5.75, N: 5.25, '2': 1.38 },
      url: 'https://www.betclic.fr/football-sfootball/ligue-1-mcdonald-s-c4/strasbourg-paris-sg-m1230958336438272',
    });
  });

  it('écarte les Matchs en direct et ceux sans Cotes 1/N/2', () => {
    const ids = lire().map((m) => m.equipeDomicile);
    expect(ids).not.toContain('Brentford');
    expect(ids).not.toContain('Velez Mostar');
    expect(ids).toHaveLength(6);
  });

  it('déduit la date de début des en-têtes de groupe', () => {
    const debut = Object.fromEntries(lire().map((m) => [m.equipeDomicile, m.debut]));
    expect(debut['Olimpia Asuncion']).toBe(new Date(2026, 9, 18, 0, 20).getTime());
    expect(debut['Cruz Azul']).toBe(new Date(2026, 9, 18, 5, 10).getTime());
    expect(debut['Sportivo Luqueño']).toBe(new Date(2026, 9, 19, 0, 20).getTime());
  });

  it("passe à l'année suivante pour une date déjà passée dans l'année", () => {
    const lens = lire().find((m) => m.equipeDomicile === 'Lens');
    expect(lens?.debut).toBe(new Date(2027, 0, 27, 21, 0).getTime());
  });
});
