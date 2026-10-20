import type { Match } from '../domaine/match';
import { json, troisCotes } from './commun';

export const URL_FOOTBALL_BWIN = 'https://www.bwin.fr/fr/sports/football-4';

/** Clé publique de bwin.fr, la même pour tous les visiteurs, que le site joint à chaque appel. */
const CLE = 'MmQyZjE4ZjktMjNhZC00ODcxLWJhNTUtODVlNjQ5ZmQzOThh';

const FOOTBALL = 4;

interface Option {
  status: string;
  price?: { odds?: number };
  parameters?: { optionTypes?: string[]; fixtureParticipant?: number };
}

interface RencontresBwin {
  fixtures?: {
    id: string;
    name?: { value: string };
    startDate: string;
    stage: string;
    isOpenForBetting?: boolean;
    competition?: { name?: { value: string } };
    participants?: { id: number; name: { value: string }; properties?: { type?: string } }[];
    optionMarkets?: {
      status: string;
      isMain?: boolean;
      parameters?: { key: string; value: string }[];
      options: Option[];
    }[];
  }[];
}

/** Lit la liste des rencontres de football avant-match de bwin. */
export function lireBwin(liste: RencontresBwin): Match[] {
  const matchs: Match[] = [];
  for (const f of liste.fixtures ?? []) {
    if (f.stage !== 'PreMatch' || f.isOpenForBetting === false) continue;
    const domicile = f.participants?.find((p) => p.properties?.type === 'HomeTeam');
    const exterieur = f.participants?.find((p) => p.properties?.type === 'AwayTeam');
    const marche = f.optionMarkets?.find(
      (m) => m.isMain && m.parameters?.some((p) => p.key === 'MarketType' && p.value === '3way'),
    );
    if (!domicile || !exterieur || marche?.status !== 'Visible') continue;
    const cote = (choisir: (o: Option) => boolean) => {
      const option = marche.options.find(choisir);
      return option?.status === 'Visible' ? option.price?.odds : null;
    };
    const cotes = troisCotes(
      cote((o) => o.parameters?.fixtureParticipant === domicile.id),
      cote((o) => !!o.parameters?.optionTypes?.includes('Draw')),
      cote((o) => o.parameters?.fixtureParticipant === exterieur.id),
    );
    if (!cotes) continue;
    const numero = f.id.split(':').pop()!;
    matchs.push({
      id: `bwin:${numero}`,
      equipeDomicile: domicile.name.value,
      equipeExterieur: exterieur.name.value,
      competition: f.competition?.name?.value ?? '',
      debut: Date.parse(f.startDate),
      cotes,
      url: `https://www.bwin.fr/fr/sports/tournois/${nomEnAdresse(f.name?.value ?? '')}-${f.id}`,
    });
  }
  return matchs;
}

/** bwin garde les accents dans ses adresses de Match. */
function nomEnAdresse(nom: string): string {
  return nom.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
}

/** Une seule requête (même origine) rend tout le football avant-match. */
export async function chercherBwin(): Promise<Match[]> {
  const parametres = new URLSearchParams({
    'x-bwin-accessid': CLE,
    lang: 'fr',
    country: 'FR',
    userCountry: 'FR',
    fixtureTypes: 'Standard',
    state: 'Latest',
    offerMapping: 'Filtered',
    offerCategories: 'Gridable',
    fixtureCategories: 'Gridable,NonGridable,Other',
    sportIds: String(FOOTBALL),
    skip: '0',
    take: '2000',
    sortBy: 'StartDate',
  });
  return lireBwin(await json<RencontresBwin>('Bwin', `/cds-api/bettingoffer/fixtures?${parametres}`));
}
