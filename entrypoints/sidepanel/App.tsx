import { useEffect, useRef, useState } from 'react';
import { BOOKMAKERS, bookmakerPourUrl, estSurPageFootball } from '@/lib/bookmakers';
import { classement, meilleurePaire } from '@/lib/domaine/classement';
import { cotePlancher, type Paire } from '@/lib/domaine/match';
import type { DemandeChercher, Progression, ReponseChercher } from '@/lib/messages';
import { recherches, type Recherche } from '@/lib/recherches';
import { CONDITIONS_PAR_DEFAUT, conditionsFreebet, FENETRES, reglages } from '@/lib/reglages';
import { Calculateur } from './Calculateur';
import { formatCote, formatDate, formatDepuis } from './format';
import { NouvelleVersion } from './NouvelleVersion';
import { Segmente } from './Segmente';
import { useMaintenant } from './useMaintenant';
import { useOngletSuivi } from './useOngletSuivi';
import { useStockage } from './useStockage';

type Etat =
  | { type: 'pret' }
  | { type: 'lecture'; matchs: number | null }
  | { type: 'erreur'; message: string };

/** Au-delà, les Cotes lues ont pu bouger : mieux vaut relancer une recherche avant de parier. */
const COTES_PERIMEES_MS = 15 * 60_000;

export default function App() {
  const onglet = useOngletSuivi();
  const bookmaker = bookmakerPourUrl(onglet?.url);
  const [criteres, setCriteres] = useStockage(reglages);
  const [conditions, setConditions] = useStockage(conditionsFreebet);
  const [sauvegardes, setSauvegardes] = useStockage(recherches);
  const [etat, setEtat] = useState<Etat>({ type: 'pret' });
  const maintenant = useMaintenant();
  // Numéro de la recherche en cours : une réponse d'une recherche abandonnée est ignorée.
  const recherche = useRef(0);

  // Dernier Bookmaker vu : un onglet hors Bookmaker (ou encore sans adresse, comme celui qu'ouvre « Voir »)
  // ne doit pas effacer les résultats.
  const dernierBookmaker = useRef(bookmaker?.id);

  // Une lecture en cours sur un Bookmaker n'a pas de sens sur un autre ; chacun garde sa dernière recherche.
  useEffect(() => {
    if (!bookmaker || bookmaker.id === dernierBookmaker.current) return;
    const avait = dernierBookmaker.current;
    dernierBookmaker.current = bookmaker.id;
    if (avait === undefined) return;
    recherche.current++;
    setEtat({ type: 'pret' });
  }, [bookmaker?.id]);

  useEffect(() => {
    const surMessage = (m: Progression, envoyeur: { tab?: { id?: number } }) => {
      if (m?.type !== 'progression' || envoyeur.tab?.id !== onglet?.id) return;
      setEtat((e) => (e.type === 'lecture' ? { ...e, matchs: m.matchs } : e));
    };
    browser.runtime.onMessage.addListener(surMessage);
    return () => browser.runtime.onMessage.removeListener(surMessage);
  }, [onglet?.id]);

  if (!criteres || !conditions || !sauvegardes) return null;

  const derniere = bookmaker ? sauvegardes[bookmaker.id] : undefined;
  const tous = derniere?.matchs ?? [];
  const liste = classement(tous, { ...criteres, maintenant });
  // Seuls les Matchs encore au Classement comptent : un Match commencé, ou sorti par le Seuil ou la Fenêtre,
  // ne doit pas occuper une des deux places de la Paire sans être visible.
  const selection = (derniere?.selection ?? []).filter((id) => liste.some((m) => m.id === id));

  if (!bookmaker || !onglet?.id) {
    return (
      <main>
        <Entete />
        <section>
          <p className="aide">Ouvrez le site d'un Bookmaker pris en charge pour chercher des Matchs :</p>
          <p className="aide">{BOOKMAKERS.map((b) => b.nom).join(', ')}.</p>
        </section>
        <NouvelleVersion />
      </main>
    );
  }

  const tabId = onglet.id;
  const idBookmaker = bookmaker.id;
  const doitAllerSurFootball = bookmaker.lectureSurPageFootball && !estSurPageFootball(bookmaker, onglet.url);

  /** Remplace la dernière recherche du Bookmaker affiché. */
  function enregistrer(r: Recherche, base = sauvegardes!) {
    setSauvegardes({ ...base, [idBookmaker]: r });
  }

  async function chercher() {
    const numero = ++recherche.current;
    // Les résultats précédents restent affichés : une lecture qui échoue ne doit pas les effacer.
    setEtat({ type: 'lecture', matchs: null });
    let reponse: ReponseChercher;
    try {
      reponse = await browser.tabs.sendMessage(tabId, { type: 'chercher' } satisfies DemandeChercher);
    } catch {
      reponse = { ok: false, erreur: 'La page ne répond pas. Rechargez-la, puis cliquez de nouveau sur Chercher.' };
    }
    if (numero !== recherche.current) return;
    if (!reponse.ok) return setEtat({ type: 'erreur', message: reponse.erreur });
    // Relu après l'attente : une autre fenêtre a pu enregistrer entre-temps la recherche d'un autre Bookmaker.
    enregistrer({ matchs: reponse.matchs, luA: Date.now(), selection: [] }, await recherches.getValue());
    setEtat({ type: 'pret' });
  }

  function choisir(selection: string[]) {
    if (derniere) enregistrer({ ...derniere, selection });
  }

  function basculer(id: string) {
    choisir(selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id].slice(-2));
  }

  function changerSeuil(seuil: number) {
    if (seuil >= 1) setCriteres({ ...criteres!, seuil: Math.round(seuil * 100) / 100 });
  }

  function choisirMeilleurePaire() {
    const paire = meilleurePaire(tous, { ...criteres!, maintenant });
    if (paire) choisir(paire.map((m) => m.id));
  }

  const [a, b] = selection.map((id) => liste.find((m) => m.id === id));
  const paire: Paire | null = a && b ? [a, b] : null;

  return (
    <main>
      <Entete site={bookmaker.nom} />

      <section className="reglages" aria-label="Critères de recherche">
        <div className="ligne">
          <label htmlFor="seuil">Seuil</label>
          <div className="pas">
            <button type="button" aria-label="Baisser le Seuil" onClick={() => changerSeuil(criteres.seuil - 0.05)}>−</button>
            <input
              id="seuil"
              type="number"
              min={1}
              step={0.05}
              value={criteres.seuil}
              onChange={(e) => changerSeuil(e.target.valueAsNumber)}
            />
            <button type="button" aria-label="Monter le Seuil" onClick={() => changerSeuil(criteres.seuil + 0.05)}>+</button>
          </div>
        </div>
        <div className="ligne">
          <span>Fenêtre</span>
          <Segmente
            libelle="Fenêtre"
            options={FENETRES.map((f) => ({ valeur: f.ms, texte: f.court, titre: f.libelle }))}
            valeur={criteres.fenetreMs}
            onChange={(fenetreMs) => setCriteres({ ...criteres, fenetreMs })}
          />
        </div>
        <div className="ligne">
          <span>Tri</span>
          <Segmente<typeof criteres.tri>
            libelle="Tri"
            options={[
              { valeur: 'cote-plancher', texte: 'Cote plancher' },
              { valeur: 'chronologique', texte: 'Chronologique' },
            ]}
            valeur={criteres.tri}
            onChange={(tri) => setCriteres({ ...criteres, tri })}
          />
        </div>

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
          <p className="aide">{etat.matchs === null ? 'Lecture des Matchs…' : `${etat.matchs} Matchs chargés…`}</p>
        )}
        {etat.type === 'erreur' && <p className="erreur">{etat.message}</p>}
        {etat.type !== 'lecture' && derniere && <Fraicheur luA={derniere.luA} maintenant={maintenant} />}
      </section>

      {derniere && (
        <>
          <section className="classement" aria-label="Classement">
            <div className="titre-section">
              <div>
                <h2>Classement</h2>
                <span className="aide">{liste.length} sur {tous.length} Matchs lus</span>
              </div>
              {liste.length >= 2 && (
                <button className="secondaire" onClick={choisirMeilleurePaire}>Meilleure Paire</button>
              )}
            </div>

            {liste.length === 0 ? (
              <p className="aide vide">Aucun Match avec une Cote plancher ≥ {formatCote(criteres.seuil)} dans la Fenêtre.</p>
            ) : (
              <>
                <div className="entete-liste" aria-hidden="true">
                  <span />
                  <span>Match</span>
                  <span className="cotes"><span>1</span><span>N</span><span>2</span></span>
                </div>
                <ol>
                  {liste.map((m, index) => {
                    const id = `match-${index}`;
                    const choisi = selection.includes(m.id);
                    return (
                      <li key={m.id} className={choisi ? 'choisi' : ''}>
                        <input id={id} type="checkbox" checked={choisi} onChange={() => basculer(m.id)} />
                        <div className="match">
                          <label htmlFor={id}>
                            <strong>{m.equipeDomicile}</strong>
                            <strong>{m.equipeExterieur}</strong>
                          </label>
                          <small>
                            <span>{m.competition} · {formatDate(m.debut)}</span>
                            {m.url && <a href={m.url} target="_blank" rel="noreferrer">Voir</a>}
                          </small>
                        </div>
                        <label htmlFor={id} className="cotes">
                          {(['1', 'N', '2'] as const).map((i) => (
                            <span key={i}>
                              <span className={m.cotes[i] === cotePlancher(m) ? 'plancher' : ''}>{formatCote(m.cotes[i])}</span>
                            </span>
                          ))}
                        </label>
                      </li>
                    );
                  })}
                </ol>
                {!paire && <p className="aide pied">Cochez deux Matchs pour former une Paire.</p>}
              </>
            )}
          </section>

          {paire && (
            <Calculateur
              paire={paire}
              conditions={conditions[bookmaker.id] ?? CONDITIONS_PAR_DEFAUT}
              setConditions={(c) => setConditions({ ...conditions, [bookmaker.id]: c })}
            />
          )}
        </>
      )}
      <NouvelleVersion />
    </main>
  );
}

/** Quand les Cotes affichées ont été lues ; en orange quand il faut relancer une recherche avant de parier. */
function Fraicheur({ luA, maintenant }: { luA: number; maintenant: number }) {
  const perimees = maintenant - luA >= COTES_PERIMEES_MS;
  return <p className={perimees ? 'aide perimees' : 'aide'}>Dernière synchronisation {formatDepuis(luA, maintenant)}</p>;
}

function Entete({ site }: { site?: string }) {
  return (
    <header className="entete">
      <span className="marque"><span className="pastille" aria-hidden="true" />Pariteem</span>
      {site && <span className="aide">{site}</span>}
    </header>
  );
}
