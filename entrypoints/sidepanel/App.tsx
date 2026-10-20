import { useEffect, useState } from 'react';
import { BOOKMAKERS, bookmakerPourUrl, type IdBookmaker } from '@/lib/bookmakers';
import { selections } from '@/lib/lectures';
import { conditionsFreebet, reglages } from '@/lib/reglages';
import { Chercher } from './Chercher';
import { Comparer } from './Comparer';
import { NouvelleVersion } from './NouvelleVersion';
import { useLectures } from './useLectures';
import { useMaintenant } from './useMaintenant';
import { useOngletSuivi } from './useOngletSuivi';
import { useStockage } from './useStockage';

type Vue = 'chercher' | 'comparer';

const VUES: readonly Vue[] = ['chercher', 'comparer'];

export default function App() {
  const onglet = useOngletSuivi();
  const bookmakerOnglet = bookmakerPourUrl(onglet?.url);
  // Bookmaker choisi dans Comparer : affiché dans Chercher sans ouvrir son site, jusqu'à ce que l'onglet
  // passe sur le site d'un autre Bookmaker. Un onglet hors Bookmaker (ou sans adresse) le garde.
  const [choisi, setChoisi] = useState<IdBookmaker | null>(null);
  const bookmaker = BOOKMAKERS.find((b) => b.id === choisi) ?? bookmakerOnglet;
  const [criteres, setCriteres] = useStockage(reglages);
  const [conditions, setConditions] = useStockage(conditionsFreebet);
  const [choix, setChoix] = useStockage(selections);
  const lectures = useLectures();
  const maintenant = useMaintenant();
  const [vue, setVue] = useState<Vue | null>(null);

  // À l'ouverture, Chercher sur un site de Bookmaker et Comparer ailleurs ; ensuite, seul le Trésorier change de vue.
  useEffect(() => {
    if (onglet !== undefined) setVue((v) => v ?? (bookmakerPourUrl(onglet?.url) ? 'chercher' : 'comparer'));
  }, [onglet]);

  useEffect(() => {
    if (bookmakerOnglet) setChoisi((c) => (c === bookmakerOnglet.id ? c : null));
  }, [bookmakerOnglet?.id]);

  if (!criteres || !conditions || !choix || !lectures || onglet === undefined || !vue) return null;

  return (
    <main>
      <Entete site={bookmaker?.nom} />
      <nav className="onglets" role="tablist" aria-label="Vue">
        {VUES.map((v) => (
          <button
            key={v}
            id={`onglet-${v}`}
            type="button"
            role="tab"
            aria-selected={vue === v}
            aria-controls={`vue-${v}`}
            // Une seule tabulation pour les deux onglets ; les flèches passent de l'un à l'autre.
            tabIndex={vue === v ? 0 : -1}
            onClick={() => setVue(v)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
              const autre = VUES.find((x) => x !== v)!;
              setVue(autre);
              document.getElementById(`onglet-${autre}`)?.focus();
            }}
          >
            {v === 'chercher' ? 'Chercher' : 'Comparer'}
          </button>
        ))}
      </nav>

      {/* Les deux vues restent montées : passer sur Comparer n'interrompt pas une recherche en cours. */}
      <div role="tabpanel" id="vue-chercher" aria-labelledby="onglet-chercher" hidden={vue !== 'chercher'}>
        <Chercher
          onglet={onglet}
          bookmaker={bookmaker}
          criteres={criteres}
          setCriteres={setCriteres}
          conditions={conditions}
          setConditions={setConditions}
          lectures={lectures}
          choix={choix}
          setChoix={setChoix}
          maintenant={maintenant}
        />
      </div>
      <div role="tabpanel" id="vue-comparer" aria-labelledby="onglet-comparer" hidden={vue !== 'comparer'}>
        <Comparer
          criteres={criteres}
          setCriteres={setCriteres}
          conditions={conditions}
          lectures={lectures}
          maintenant={maintenant}
          surChoix={(id) => {
            setChoisi(id);
            setVue('chercher');
          }}
        />
      </div>
      <p className="credit">Créé par Raclo</p>
      <NouvelleVersion />
    </main>
  );
}

function Entete({ site }: { site?: string }) {
  return (
    <header className="entete">
      <span className="marque"><span className="pastille" aria-hidden="true" />Pariteem</span>
      {site && <span className="aide">{site}</span>}
    </header>
  );
}
