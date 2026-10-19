import { describe, expect, it } from 'vitest';
import { BOOKMAKERS, bookmakerPourUrl, estSurPageFootball } from './index';

describe('bookmakerPourUrl', () => {
  it('reconnaît les Bookmakers pris en charge et leurs sous-domaines', () => {
    expect(bookmakerPourUrl('https://www.winamax.fr/paris-sportifs')?.id).toBe('winamax');
    expect(bookmakerPourUrl('https://www.betclic.fr/')?.id).toBe('betclic');
    expect(bookmakerPourUrl('https://sports.olybet.fr/pre-match')?.id).toBe('olybet');
    expect(bookmakerPourUrl('https://betsson.fr/fr')?.id).toBe('betsson');
  });

  it('donne à chaque Bookmaker un domaine distinct, qui porte sa page football', () => {
    const domaines = BOOKMAKERS.map((b) => b.domaine);
    expect(new Set(domaines).size).toBe(domaines.length);
    for (const b of BOOKMAKERS) expect(bookmakerPourUrl(b.urlFootball)?.id).toBe(b.id);
  });

  it('ignore les autres sites, y compris les imitations de domaine', () => {
    expect(bookmakerPourUrl('https://www.google.com')).toBeNull();
    expect(bookmakerPourUrl('https://faux-betclic.fr')).toBeNull();
    expect(bookmakerPourUrl(undefined)).toBeNull();
  });
});

describe('estSurPageFootball', () => {
  const betclic = BOOKMAKERS.find((b) => b.id === 'betclic')!;

  it('accepte la page football, avec ou sans paramètres', () => {
    expect(estSurPageFootball(betclic, 'https://www.betclic.fr/football-sfootball')).toBe(true);
    expect(estSurPageFootball(betclic, 'https://www.betclic.fr/football-sfootball?x=1')).toBe(true);
  });

  it('accepte la page football sans www', () => {
    expect(estSurPageFootball(betclic, 'https://betclic.fr/football-sfootball/')).toBe(true);
  });

  it('refuse le même chemin sur un autre site', () => {
    expect(estSurPageFootball(betclic, 'https://www.winamax.fr/football-sfootball')).toBe(false);
  });

  it('refuse les pages de championnat ou de Match', () => {
    expect(estSurPageFootball(betclic, 'https://www.betclic.fr/football-sfootball/ligue-1-c4')).toBe(false);
  });
});
