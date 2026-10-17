import type { Match } from './match';

export const MAINTENANT = Date.UTC(2026, 9, 17, 12);
export const HEURE = 3_600_000;

export function unMatch(
  id: string,
  cotes: [number, number, number],
  debutDansHeures = 24,
): Match {
  return {
    id,
    equipeDomicile: `${id} domicile`,
    equipeExterieur: `${id} extérieur`,
    competition: 'Ligue 2',
    debut: MAINTENANT + debutDansHeures * HEURE,
    cotes: { '1': cotes[0], N: cotes[1], '2': cotes[2] },
  };
}
