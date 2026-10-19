import { useEffect, useState } from 'react';
import { bookmakerPourUrl } from '@/lib/bookmakers';
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

export default function App() {
  const onglet = useOngletSuivi();
  const bookmaker = bookmakerPourUrl(onglet?.url);
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

  if (!criteres || !conditions || !choix || !lectures || onglet === undefined || !vue) return null;

  return (
    <main>
      <Entete site={bookmaker?.nom} />
      <nav className="onglets" role="tablist" aria-label="Vue">
        {(['chercher', 'comparer'] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={vue === v} onClick={() => setVue(v)}>
            {v === 'chercher' ? 'Chercher' : 'Comparer'}
          </button>
        ))}
      </nav>

      {/* Les deux vues restent montées : passer sur Comparer n'interrompt pas une recherche en cours. */}
      <div role="tabpanel" hidden={vue !== 'chercher'}>
        <Chercher
          onglet={onglet}
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
      <div role="tabpanel" hidden={vue !== 'comparer'}>
        <Comparer
          criteres={criteres}
          setCriteres={setCriteres}
          conditions={conditions}
          lectures={lectures}
          maintenant={maintenant}
          surOuverture={() => setVue('chercher')}
        />
      </div>
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
