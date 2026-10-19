import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CIRCUSBET, lireBetconstruct, VBET, type OffreBetconstruct } from './betconstruct';
import { lireBetsson } from './betsson';
import { lireBwin } from './bwin';
import { slug } from './commun';
import { lireKambi, PMU } from './kambi';
import { lirePokerstars } from './pokerstars';
import { GENYBET, lireSportnco, NETBET } from './sportnco';
import { lireUnibet } from './unibet';

/** Extraits de réponses réelles des sites (octobre 2026), réduits à quelques Matchs. */
function extrait<T>(nom: string): T {
  return JSON.parse(readFileSync(new URL(`./fixtures/${nom}`, import.meta.url), 'utf8')) as T;
}

describe('lireUnibet', () => {
  const matchs = lireUnibet(extrait('unibet-football.json'));

  it('lit équipes, Compétition, début (UTC) et Cotes 1/N/2', () => {
    expect(matchs[0]).toEqual({
      id: 'unibet:3389241',
      equipeDomicile: 'BFC Daugavpils',
      equipeExterieur: 'FK Auda',
      competition: 'D1 Lettonie',
      debut: Date.UTC(2026, 9, 19, 15, 0),
      cotes: { '1': 2.85, N: 3.35, '2': 1.88 },
      url: 'https://www.unibet.fr/paris-football/lettonie/d1-lettonie/3389241/bfc-daugavpils-vs-fk-auda',
    });
  });

  it('écarte les paris tout faits qui ne sont pas des rencontres', () => {
    expect(matchs.map((m) => m.id)).toEqual(['unibet:3389241', 'unibet:3389234']);
  });
});

describe('lireKambi (PMU)', () => {
  const matchs = lireKambi(extrait('kambi-football.json'), PMU);

  it('convertit les cotes en millièmes et lit le Match', () => {
    expect(matchs[0]).toEqual({
      id: 'pmu:1029436520',
      equipeDomicile: 'FC Dila Gori',
      equipeExterieur: 'Iberia 1999',
      competition: 'Erovnuli Liga',
      debut: Date.parse('2026-10-19T15:00:00Z'),
      cotes: { '1': 2.28, N: 3.1, '2': 2.65 },
      url: 'https://www.pmu.fr/sport/event/1029436520',
    });
  });

  it('écarte un Match dont une Issue est suspendue', () => {
    expect(matchs.map((m) => m.equipeDomicile)).toEqual(['FC Dila Gori', 'Pafos FC']);
  });
});

describe('lireSportnco (NetBet, Genybet, Feelingbet)', () => {
  // Le troisième Match de l'extrait a été retouché pour avoir un nul suspendu (cote 1, affichée « - »).
  const reponse = extrait<Parameters<typeof lireSportnco>[0]>('sportnco-football.json');

  it('lit le marché « Qui va gagner le match ? » et l’adresse sur le site du Bookmaker', () => {
    expect(lireSportnco(reponse, NETBET)[0]).toEqual({
      id: 'netbet:12240727',
      equipeDomicile: 'Wolverhampton',
      equipeExterieur: 'Portsmouth',
      competition: 'Championship',
      debut: Date.parse('2026-10-20T20:45:00+02:00'),
      cotes: { '1': 1.48, N: 3.75, '2': 4.8 },
      url: 'https://www.netbet.fr/evenement/12240727-wolverhampton-portsmouth',
    });
    expect(lireSportnco(reponse, GENYBET)[0]?.url).toBe(
      'https://www.genybet.fr/sport/evenement/12240727-wolverhampton-portsmouth',
    );
  });

  it('écarte un Match dont une Issue est suspendue', () => {
    expect(lireSportnco(reponse, NETBET).map((m) => m.equipeDomicile)).toEqual(['Wolverhampton', 'AS Rome']);
  });

  it('accepte une page vide (fin de liste)', () => {
    expect(lireSportnco({ components: [{ data: [] }] }, NETBET)).toEqual([]);
  });
});

describe('lireBetconstruct (Vbet, CircusBet, DAZN Bet, Olybet)', () => {
  const reponse = extrait<{ data: { data: OffreBetconstruct } }>('betconstruct-football.json');

  it('lit les Matchs avant-match, noms nettoyés, avec l’adresse du Bookmaker', () => {
    const matchs = lireBetconstruct(reponse.data.data, VBET);
    expect(matchs).toHaveLength(4);
    expect(matchs[0]).toEqual({
      id: 'vbet:31132022',
      equipeDomicile: 'Stuttgart',
      equipeExterieur: 'Atletico Madrid',
      competition: 'Ligue des Champions',
      debut: 1792522800 * 1000,
      cotes: { '1': 2.77, N: 3.23, '2': 1.89 },
      url: 'https://www.vbet.fr/paris-sportifs/match/Soccer/Europe/566/31132022',
    });
    expect(lireBetconstruct(reponse.data.data, CIRCUSBET)[0]?.id).toBe('circusbet:31132022');
  });

  it('écarte les Matchs bloqués ou en direct', () => {
    const offre = structuredClone(reponse.data.data);
    const jeux = offre.region!['20001']!.competition!['566']!.game!;
    jeux['31132022']!.is_blocked = 1;
    jeux['31132023']!.type = 1;
    expect(lireBetconstruct(offre, VBET).map((m) => m.id)).toEqual(['vbet:31142898', 'vbet:31142899']);
  });
});

describe('lireBwin', () => {
  const matchs = lireBwin(extrait('bwin-football.json'));

  it('associe les Cotes aux équipes, quel que soit l’ordre des participants', () => {
    expect(matchs[1]).toEqual({
      id: 'bwin:7891945',
      equipeDomicile: 'Cucuta Deportivo',
      equipeExterieur: 'Atlético Nacional',
      competition: 'Primera A - Clausura',
      debut: Date.parse('2026-10-20T23:30:00Z'),
      cotes: { '1': 4.33, N: 3.6, '2': 1.46 },
      url: 'https://www.bwin.fr/fr/sports/tournois/cucuta-deportivo-atlético-nacional-2:7891945',
    });
  });

  it('écarte les rencontres en direct et les Issues masquées', () => {
    const liste = extrait<Parameters<typeof lireBwin>[0]>('bwin-football.json');
    liste.fixtures![0]!.stage = 'Live';
    liste.fixtures![1]!.optionMarkets![0]!.options[1]!.status = 'Hidden';
    expect(lireBwin(liste).map((m) => m.id)).toEqual(['bwin:7891267']);
  });
});

describe('lirePokerstars', () => {
  // Dans l'extrait, le marché de Pau - Grenoble a été retouché en « SUSPENDED ».
  const matchs = lirePokerstars(extrait('pokerstars-competition.json'));

  it('lit le marché 1/N/2 de chaque Match de la compétition', () => {
    expect(matchs.find((m) => m.equipeDomicile === 'Rodez')).toEqual({
      id: 'pokerstars:36184056',
      equipeDomicile: 'Rodez',
      equipeExterieur: 'Montpellier',
      competition: 'Ligue 2 BKT ®',
      debut: Date.parse('2026-10-19T18:45:00Z'),
      cotes: { '1': 2.5, N: 3.3, '2': 2.2 },
      url: 'https://www.pokerstars.fr/sports/football/1/ligue-2-bkt-r/57/rodez-montpellier/36184056/',
    });
  });

  it('écarte les marchés suspendus', () => {
    expect(matchs.map((m) => m.equipeDomicile).sort()).toEqual(['Clermont', 'Rodez']);
  });
});

describe('lireBetsson', () => {
  const matchs = lireBetsson(extrait<{ data: Parameters<typeof lireBetsson>[0] }>('betsson-football.json').data);

  it('convertit les cotes fractionnaires et trouve le marché Résultat', () => {
    expect(matchs[0]).toEqual({
      id: 'betsson:4299598.1',
      equipeDomicile: 'CA Sarmiento Junin',
      equipeExterieur: 'CA Barracas Central',
      competition: 'Primera LPF - Argentina',
      debut: Date.parse('2026-10-20T00:00:00+02:00'),
      cotes: { '1': 2.12, N: 2.81, '2': 3.3 },
      url: 'https://betsson.fr/fr/competitions/football/primera-lpf-argentina/ca-sarmiento-junin-vs-ca-barracas-central?competition_id=21150&match_id=4299598.1',
    });
    expect(matchs[1]?.cotes).toEqual({ '1': 1.74, N: 3.1, '2': 4.3 });
  });

  it('nettoie les noms de compétition', () => {
    expect(matchs[2]?.competition).toBe('Brasileiro Serie A - Brésil');
  });

  it('écarte un Match dont une Issue est suspendue', () => {
    const evenements = extrait<{ data: Parameters<typeof lireBetsson>[0] }>('betsson-football.json').data;
    evenements[0]!.markets![0]!.selections![1]!.idfoselectionsuspensiontype = 'MANUAL';
    expect(lireBetsson(evenements)).toHaveLength(2);
  });
});

describe('slug', () => {
  it('retire accents et lettres nordiques comme le font les sites', () => {
    expect(slug('Naples vs Bodø/Glimt')).toBe('naples-vs-bodo-glimt');
    expect(slug('D1 Biélorussie')).toBe('d1-bielorussie');
  });
});
