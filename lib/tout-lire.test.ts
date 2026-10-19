import { describe, expect, it, vi } from 'vitest';
import { BOOKMAKERS, type Bookmaker, type IdBookmaker } from './bookmakers';
import {
  Arret,
  attendreReponse,
  avancer,
  avecDelai,
  finir,
  interrompre,
  lireTout,
  RECENT_MS,
  SIMULTANES,
  type EtatSite,
  type Outils,
  type ToutLire,
} from './tout-lire';

const MAINTENANT = Date.UTC(2026, 9, 19, 12);

/** Des Outils factices : chaque lecture dure un tour de boucle et note ce qui tournait en même temps. */
function outilsFactices(options: Partial<Outils> & { echecs?: IdBookmaker[]; arreterApres?: number } = {}) {
  const ordre: IdBookmaker[] = [];
  const etats: Partial<Record<IdBookmaker, EtatSite>> = {};
  const enCours = new Set<IdBookmaker>();
  const simultanes: IdBookmaker[][] = [];
  let arrete = false;
  const outils: Outils = {
    async lire(b: Bookmaker) {
      ordre.push(b.id);
      enCours.add(b.id);
      simultanes.push([...enCours]);
      await new Promise((r) => setTimeout(r, 1));
      enCours.delete(b.id);
      if (options.arreterApres !== undefined && ordre.length >= options.arreterApres) arrete = true;
      if (options.echecs?.includes(b.id)) throw new Error(`${b.nom} a répondu 503`);
      return 100;
    },
    lueA: async () => null,
    maintenant: () => MAINTENANT,
    signaler: (id, e) => (etats[id] = e),
    arrete: () => arrete,
    ...options,
  };
  return { outils, ordre, etats, simultanes };
}

describe('lireTout', () => {
  it('lit tous les Bookmakers, Genybet en dernier', async () => {
    const { outils, ordre, etats } = outilsFactices();
    await lireTout(BOOKMAKERS, outils);
    expect([...ordre].sort()).toEqual(BOOKMAKERS.map((b) => b.id).sort());
    expect(ordre.at(-1)).toBe('genybet');
    expect(Object.values(etats).every((e) => e.etat === 'lu')).toBe(true);
  });

  it(`ne lit jamais plus de ${SIMULTANES} sites à la fois, et Genybet seul`, async () => {
    const { outils, simultanes } = outilsFactices();
    await lireTout(BOOKMAKERS, outils);
    expect(Math.max(...simultanes.map((s) => s.length))).toBe(SIMULTANES);
    expect(simultanes.filter((s) => s.includes('genybet'))).toEqual([['genybet']]);
  });

  it("continue après l'échec d'un site", async () => {
    const { outils, ordre, etats } = outilsFactices({ echecs: ['winamax'] });
    await lireTout(BOOKMAKERS, outils);
    expect(ordre).toHaveLength(BOOKMAKERS.length);
    expect(etats.winamax).toEqual({ etat: 'erreur', message: 'Winamax a répondu 503' });
    expect(etats.unibet).toEqual({ etat: 'lu', matchs: 100 });
  });

  it('saute Genybet lu il y a moins de 10 minutes', async () => {
    const { outils, ordre, etats } = outilsFactices({
      lueA: async (id) => (id === 'genybet' ? MAINTENANT - RECENT_MS + 1 : MAINTENANT - 1),
    });
    await lireTout(BOOKMAKERS, outils);
    expect(ordre).not.toContain('genybet');
    expect(ordre).toContain('winamax');
    expect(etats.genybet).toEqual({ etat: 'lu-recemment' });
  });

  it('relit Genybet lu il y a plus de 10 minutes', async () => {
    const { outils, ordre } = outilsFactices({ lueA: async () => MAINTENANT - RECENT_MS });
    await lireTout(BOOKMAKERS, outils);
    expect(ordre).toContain('genybet');
  });

  it('ne lit pas les Bookmakers à lire à la main', async () => {
    const { outils, ordre, etats } = outilsFactices({ aLaMain: ['betclic'] });
    await lireTout(BOOKMAKERS, outils);
    expect(ordre).not.toContain('betclic');
    expect(etats.betclic).toEqual({ etat: 'a-la-main' });
  });

  it("ne commence plus aucun site après « Arrêter », sans compter d'erreur", async () => {
    const { outils, ordre, etats } = outilsFactices({ arreterApres: 1, echecs: BOOKMAKERS.map((b) => b.id) });
    await lireTout(BOOKMAKERS, outils);
    expect(ordre).toHaveLength(SIMULTANES);
    expect(Object.values(etats).some((e) => e.etat === 'erreur')).toBe(false);
    expect(etats.genybet).toEqual({ etat: 'attente' });
  });
});

describe('finir', () => {
  const sites: Partial<Record<IdBookmaker, EtatSite>> = {
    winamax: { etat: 'lu', matchs: 700 },
    unibet: { etat: 'lecture', matchs: 40 },
    pmu: { etat: 'attente' },
    bwin: { etat: 'erreur', message: 'bwin a répondu 500' },
  };

  it('oublie les sites inachevés après « Arrêter »', () => {
    expect(Object.keys(finir(sites))).toEqual(['winamax', 'bwin']);
  });

  it('marque les sites inachevés en erreur quand la lecture a été interrompue', () => {
    expect(finir(sites, 'Lecture interrompue')).toMatchObject({
      unibet: { etat: 'erreur', message: 'Lecture interrompue' },
      pmu: { etat: 'erreur', message: 'Lecture interrompue' },
      winamax: { etat: 'lu' },
    });
  });
});

describe('avecDelai', () => {
  it('rend le résultat arrivé à temps', async () => {
    await expect(avecDelai(Promise.resolve(42), 1000, 'trop long')).resolves.toBe(42);
  });

  it('échoue avec le message passé le délai', async () => {
    vi.useFakeTimers();
    const attente = expect(avecDelai(new Promise(() => {}), 90_000, 'Winamax trop long')).rejects.toThrow('Winamax trop long');
    await vi.advanceTimersByTimeAsync(90_000);
    await attente;
    vi.useRealTimers();
  });
});

describe('attendreReponse', () => {
  /** Une horloge factice que chaque pause fait avancer. */
  function horloge() {
    let t = 0;
    return { maintenant: () => t, pause: async (ms: number) => void (t += ms) };
  }

  it("relance chaque seconde jusqu'à la première réponse", async () => {
    const h = horloge();
    let essais = 0;
    const essayer = async () => {
      if (++essais < 3) throw new Error('Receiving end does not exist');
    };
    await attendreReponse(essayer, { arrete: () => false, delaiMs: 30_000, message: 'pas chargée', ...h });
    expect(essais).toBe(3);
    expect(h.maintenant()).toBe(2000);
  });

  it('échoue avec le message après le délai de chargement', async () => {
    const h = horloge();
    const essayer = () => Promise.reject(new Error('Receiving end does not exist'));
    await expect(attendreReponse(essayer, { arrete: () => false, delaiMs: 30_000, message: 'pas chargée', ...h })).rejects.toThrow(
      'pas chargée',
    );
    expect(h.maintenant()).toBeGreaterThan(30_000);
  });

  it('échoue dès « Arrêter », sans attendre la page', async () => {
    let arrete = false;
    const essayer = () => {
      arrete = true;
      return Promise.reject(new Error('Receiving end does not exist'));
    };
    await expect(attendreReponse(essayer, { arrete: () => arrete, delaiMs: 30_000, message: 'pas chargée', ...horloge() })).rejects.toBeInstanceOf(
      Arret,
    );
  });
});

describe('avancer', () => {
  const etat = (site: EtatSite): ToutLire => ({ debut: 0, enCours: true, fenetre: 1, sites: { winamax: site } });

  it('note les Matchs lus par un site en cours de lecture', () => {
    const e = etat({ etat: 'lecture', matchs: null });
    expect(avancer(e, 'winamax', 340)).toBe(true);
    expect(e.sites.winamax).toEqual({ etat: 'lecture', matchs: 340 });
  });

  it('ignore un message arrivé après la fin de la lecture', () => {
    const e = etat({ etat: 'lu', matchs: 718 });
    expect(avancer(e, 'winamax', 340)).toBe(false);
    expect(e.sites.winamax).toEqual({ etat: 'lu', matchs: 718 });
  });
});

describe('interrompre', () => {
  it('termine la lecture, oublie la fenêtre et marque les sites inachevés', () => {
    const e: ToutLire = {
      debut: 0,
      enCours: true,
      fenetre: 7,
      sites: { winamax: { etat: 'lu', matchs: 700 }, unibet: { etat: 'lecture', matchs: 12 } },
    };
    expect(interrompre(e)).toEqual({
      debut: 0,
      enCours: false,
      fenetre: null,
      sites: { winamax: { etat: 'lu', matchs: 700 }, unibet: { etat: 'erreur', message: 'Lecture interrompue' } },
    });
  });
});
