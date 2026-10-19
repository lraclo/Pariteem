import type { Match } from '../domaine/match';
import { chercherBetclic } from './betclic';
import { chercherBetconstruct, CIRCUSBET, DAZNBET, OLYBET, VBET } from './betconstruct';
import { chercherBetsson } from './betsson';
import { chercherBwin } from './bwin';
import type { Progression } from './commun';
import type { IdBookmaker } from './index';
import { chercherKambi, PMU } from './kambi';
import { chercherPokerstars } from './pokerstars';
import { chercherSportnco, FEELINGBET, GENYBET, NETBET } from './sportnco';
import { chercherUnibet } from './unibet';
import { chercherWinamax } from './winamax';

/** Lecture du football de chaque Bookmaker, lancée depuis un onglet de son site. */
export const LECTEURS: Record<IdBookmaker, (progression: Progression) => Promise<Match[]>> = {
  winamax: () => chercherWinamax(),
  betclic: (progression) => chercherBetclic(progression),
  unibet: (progression) => chercherUnibet(progression),
  pmu: (progression) => chercherKambi(PMU, progression),
  netbet: (progression) => chercherSportnco(NETBET, progression),
  genybet: (progression) => chercherSportnco(GENYBET, progression),
  feelingbet: (progression) => chercherSportnco(FEELINGBET, progression),
  vbet: () => chercherBetconstruct(VBET),
  circusbet: () => chercherBetconstruct(CIRCUSBET),
  daznbet: () => chercherBetconstruct(DAZNBET),
  olybet: () => chercherBetconstruct(OLYBET),
  bwin: () => chercherBwin(),
  pokerstars: (progression) => chercherPokerstars(progression),
  betsson: () => chercherBetsson(),
};
