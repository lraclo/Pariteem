import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lireWinamax } from './winamax';

const html = readFileSync(new URL('./fixtures/winamax-football.html', import.meta.url), 'utf8');

describe('lireWinamax', () => {
  const matchs = lireWinamax(html);

  it('lit les Matchs avant-match avec leurs trois Cotes', () => {
    expect(matchs[0]).toEqual({
      id: 'winamax:66299670',
      equipeDomicile: 'Philadelphia Union',
      equipeExterieur: 'Charlotte FC',
      competition: 'Major League Soccer',
      debut: 1792261800 * 1000,
      cotes: { '1': 1.38, N: 5, '2': 5.2 },
      url: 'https://www.winamax.fr/paris-sportifs/match/66299670',
    });
  });

  it('écarte les Matchs en direct, terminés, sans marché 1/N/2 ou avec une Issue suspendue', () => {
    expect(matchs.map((m) => m.id)).toEqual([
      'winamax:66299670',
      'winamax:66299672',
      'winamax:66299674',
    ]);
  });

  it("échoue clairement si la page n'a pas d'état intégré", () => {
    expect(() => lireWinamax('<html></html>')).toThrow(/PRELOADED_STATE/);
  });
});
