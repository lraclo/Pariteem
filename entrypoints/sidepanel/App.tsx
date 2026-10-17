import { useEffect, useRef, useState } from 'react';
import { bookmakerPourUrl, estSurPageFootball } from '@/lib/bookmakers';
import { classement, meilleurePaire } from '@/lib/domaine/classement';
import { cotePlancher, type Match, type Paire } from '@/lib/domaine/match';
import type { DemandeChercher, Progression, ReponseChercher } from '@/lib/messages';
import { conditionsFreebet, FENETRES, reglages } from '@/lib/reglages';
import { Calculateur } from './Calculateur';
import { formatCote, formatDate } from './format';
import { useMaintenant } from './useMaintenant';
import { useOngletSuivi } from './useOngletSuivi';
import { useStockage } from './useStockage';

type Etat =
  | { type: 'pret' }
  | { type: 'lecture'; cartes: number | null }
  | { type: 'erreur'; message: string }
  | { type: 'resultats'; matchs: Match[] };

export default function App() {
  const onglet = useOngletSuivi();
  const bookmaker = bookmakerPourUrl(onglet?.url);
  const [criteres, setCriteres] = useStockage(reglages);
  const [conditions, setConditions] = useStockage(conditionsFreebet);
  const [etat, setEtat] = useState<Etat>({ type: 'pret' });
  const [selection, setSelection] = useState<string[]>([]);
  const maintenant = useMaintenant();
  // Numéro de la recherche en cours : une réponse d'une recherche abandonnée est ignorée.
  const recherche = useRef(0);

  // Les résultats d'un Bookmaker n'ont pas de sens sur un autre.
  useEffect(() => {
    recherche.current++;
    setEtat({ type: 'pret' });
    setSelection([]);
  }, [bookmaker?.id]);

  useEffect(() => {
    const surMessage = (m: Progression, envoyeur: { tab?: { id?: number } }) => {
      if (m?.type !== 'progression' || envoyeur.tab?.id !== onglet?.id) return;
      setEtat((e) => (e.type === 'lecture' ? { ...e, cartes: m.cartes } : e));
    };
    browser.runtime.onMessage.addListener(surMessage);
    return () => browser.runtime.onMessage.removeListener(surMessage);
  }, [onglet?.id]);

  if (!criteres || !conditions) return null;

  const tous = etat.type === 'resultats' ? etat.matchs : [];
  const liste = classement(tous, { ...criteres, maintenant });

  if (!bookmaker || !onglet?.id) {
    return (
      <main>
        <h1>Pariteem</h1>
        <p className="aide">Ouvrez Winamax ou Betclic dans le navigateur pour chercher des Matchs.</p>
      </main>
    );
  }

  const tabId = onglet.id;
  const doitAllerSurFootball = bookmaker.lectureSurPageFootball && !estSurPageFootball(bookmaker, onglet.url);

  async function chercher() {
    const numero = ++recherche.current;
    setEtat({ type: 'lecture', cartes: null });
    setSelection([]);
    let suite: Etat;
    try {
      const reponse: ReponseChercher = await browser.tabs.sendMessage(tabId, { type: 'chercher' } satisfies DemandeChercher);
      suite = reponse.ok ? { type: 'resultats', matchs: reponse.matchs } : { type: 'erreur', message: reponse.erreur };
    } catch {
      suite = { type: 'erreur', message: 'La page ne répond pas. Rechargez-la, puis cliquez de nouveau sur Chercher.' };
    }
    if (numero === recherche.current) setEtat(suite);
  }

  function basculer(id: string) {
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-2)));
  }

  function choisirMeilleurePaire() {
    const paire = meilleurePaire(tous, { ...criteres!, maintenant });
    if (paire) setSelection(paire.map((m) => m.id));
  }

  // Seuls les Matchs encore au Classement comptent : un Match commencé en sort.
  const [a, b] = selection.map((id) => liste.find((m) => m.id === id));
  const paire: Paire | null = a && b ? [a, b] : null;

  return (
    <main>
      <h1>
        Pariteem <span className="site">{bookmaker.nom}</span>
      </h1>

      <section className="reglages">
        <label>
          Seuil
          <input
            type="number"
            min={1}
            step={0.05}
            value={criteres.seuil}
            onChange={(e) => e.target.valueAsNumber > 0 && setCriteres({ ...criteres, seuil: e.target.valueAsNumber })}
          />
        </label>
        <label>
          Fenêtre
          <select
            value={criteres.fenetreMs}
            onChange={(e) => setCriteres({ ...criteres, fenetreMs: Number(e.target.value) })}
          >
            {FENETRES.map((f) => (
              <option key={f.ms} value={f.ms}>{f.libelle}</option>
            ))}
          </select>
        </label>
        <label>
          Tri
          <select
            value={criteres.tri}
            onChange={(e) => setCriteres({ ...criteres, tri: e.target.value as typeof criteres.tri })}
          >
            <option value="cote-plancher">Cote plancher</option>
            <option value="chronologique">Chronologique</option>
          </select>
        </label>
      </section>

      {doitAllerSurFootball ? (
        <button className="principal" onClick={() => browser.tabs.update(tabId, { url: bookmaker.urlFootball })}>
          Aller sur la page Football
        </button>
      ) : (
        <button className="principal" onClick={chercher} disabled={etat.type === 'lecture'}>
          {etat.type === 'lecture' ? 'Lecture…' : 'Chercher'}
        </button>
      )}

      {etat.type === 'lecture' && (
        <p className="aide">{etat.cartes === null ? 'Lecture des Matchs…' : `${etat.cartes} Matchs chargés…`}</p>
      )}
      {etat.type === 'erreur' && <p className="erreur">{etat.message}</p>}

      {etat.type === 'resultats' && (
        <>
          <p className="aide">
            {tous.length} Matchs lus, {liste.length} retenus (Cote plancher ≥ {formatCote(criteres.seuil)}).
            {liste.length > 0 && ' Cochez deux Matchs pour former une Paire.'}
          </p>
          {liste.length >= 2 && (
            <button onClick={choisirMeilleurePaire}>Meilleure Paire</button>
          )}
          <ol className="classement">
            {liste.map((m) => (
              <li key={m.id} className={selection.includes(m.id) ? 'choisi' : ''}>
                <label>
                  <input type="checkbox" checked={selection.includes(m.id)} onChange={() => basculer(m.id)} />
                  <span className="match">
                    <strong>{m.equipeDomicile} – {m.equipeExterieur}</strong>
                    <small>{m.competition} · {formatDate(m.debut)}</small>
                  </span>
                  <span className="cotes">
                    {(['1', 'N', '2'] as const).map((i) => (
                      <span key={i} className={m.cotes[i] === cotePlancher(m) ? 'plancher' : ''}>
                        {formatCote(m.cotes[i])}
                      </span>
                    ))}
                  </span>
                </label>
                {m.url && <a href={m.url} target="_blank" rel="noreferrer">Voir</a>}
              </li>
            ))}
          </ol>
          {paire && (
            <Calculateur
              paire={paire}
              conditions={conditions[bookmaker.id]}
              setConditions={(c) => setConditions({ ...conditions, [bookmaker.id]: c })}
            />
          )}
        </>
      )}
    </main>
  );
}
