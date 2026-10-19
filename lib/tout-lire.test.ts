import { describe, expect, it } from 'vitest';
import { BOOKMAKERS, type Bookmaker, type IdBookmaker } from './bookmakers';
import { finir, lireTout, RECENT_MS, SIMULTANES, type EtatSite, type Outils } from './tout-lire';

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
