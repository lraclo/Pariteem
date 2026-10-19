import { useEffect, useRef, useState } from 'react';
import type { Browser } from 'wxt/browser';
import { BOOKMAKERS, bookmakerPourUrl, estSurPageFootball, type IdBookmaker } from '@/lib/bookmakers';
import { classement, meilleurePaire } from '@/lib/domaine/classement';
import { cotePlancher, type Paire } from '@/lib/domaine/match';
import { enregistrerLecture, selections, type Lectures } from '@/lib/lectures';
import type { DemandeChercher, Progression, ReponseChercher } from '@/lib/messages';
import { CONDITIONS_PAR_DEFAUT, type ConditionsFreebet, type Reglages } from '@/lib/reglages';
import { AgeLecture } from './AgeLecture';
import { Calculateur } from './Calculateur';
import { ChampsCriteres } from './ChampsCriteres';
import { formatCote, formatDate } from './format';

type Etat =
  | { type: 'pret' }
  | { type: 'lecture'; matchs: number | null }
  | { type: 'erreur'; message: string };

type Selections = Partial<Record<IdBookmaker, string[]>>;

interface Props {
  onglet: Browser.tabs.Tab | null;
  criteres: Reglages;
  setCriteres: (c: Reglages) => void;
  conditions: Partial<Record<IdBookmaker, ConditionsFreebet>>;
  setConditions: (c: Partial<Record<IdBookmaker, ConditionsFreebet>>) => void;
  lectures: Lectures;
  choix: Selections;
  setChoix: (s: Selections) => void;
  maintenant: number;
}

/** Lecture du Bookmaker de l'onglet, son Classement et le Calculateur de la Paire cochée. */
export function Chercher({ onglet, criteres, setCriteres, conditions, setConditions, lectures, choix, setChoix, maintenant }: Props) {
  const bookmaker = bookmakerPourUrl(onglet?.url);
  const [etat, setEtat] = useState<Etat>({ type: 'pret' });
  // Numéro de la recherche en cours : une réponse d'une recherche abandonnée est ignorée.
  const recherche = useRef(0);

  // Dernier Bookmaker vu : un onglet hors Bookmaker (ou encore sans adresse, comme celui qu'ouvre « Voir »)
  // ne doit pas interrompre la recherche en cours.
  const dernierBookmaker = useRef(bookmaker?.id);

  // Une lecture en cours sur un Bookmaker n'a pas de sens sur un autre ; chacun garde sa dernière Lecture.
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

  if (!bookmaker || !onglet?.id) {
    return (
      <section>
        <p className="aide">Ouvrez le site d'un Bookmaker pris en charge pour chercher des Matchs :</p>
        <p className="aide">{BOOKMAKERS.map((b) => b.nom).join(', ')}.</p>
      </section>
    );
  }

  const tabId = onglet.id;
  const idBookmaker = bookmaker.id;
  const derniere = lectures[idBookmaker];
  const tous = derniere?.matchs ?? [];
  const liste = classement(tous, { ...criteres, maintenant });
  // Seuls les Matchs encore au Classement comptent : un Match commencé, ou sorti par le Seuil ou la Fenêtre,
  // ne doit pas occuper une des deux places de la Paire sans être visible.
  const selection = (choix[idBookmaker] ?? []).filter((id) => liste.some((m) => m.id === id));
  const doitAllerSurFootball = bookmaker.lectureSurPageFootball && !estSurPageFootball(bookmaker, onglet.url);

  /** Remplace la sélection du Bookmaker affiché. */
  function choisir(s: string[], base = choix) {
    setChoix({ ...base, [idBookmaker]: s });
  }

  async function chercher() {
    const numero = ++recherche.current;
    // La Lecture précédente reste affichée : une lecture qui échoue ne doit pas l'effacer.
    setEtat({ type: 'lecture', matchs: null });
    let reponse: ReponseChercher;
    try {
      reponse = await browser.tabs.sendMessage(tabId, { type: 'chercher' } satisfies DemandeChercher);
    } catch {
      reponse = { ok: false, erreur: 'La page ne répond pas. Rechargez-la, puis cliquez de nouveau sur Chercher.' };
    }
    if (numero !== recherche.current) return;
    if (!reponse.ok) return setEtat({ type: 'erreur', message: reponse.erreur });
    await enregistrerLecture(idBookmaker, reponse.matchs);
    // Relu après l'attente : une autre fenêtre a pu entre-temps cocher une Paire sur un autre Bookmaker.
    choisir([], await selections.getValue());
    setEtat({ type: 'pret' });
  }

  function basculer(id: string) {
    choisir(selection.includes(id) ? selection.filter((x) => x !== id) : [...selection, id].slice(-2));
  }

  function choisirMeilleurePaire() {
    const paire = meilleurePaire(tous, { ...criteres, maintenant });
    if (paire) choisir(paire.map((m) => m.id));
  }

  const [a, b] = selection.map((id) => liste.find((m) => m.id === id));
  const paire: Paire | null = a && b ? [a, b] : null;

  return (
    <>
      <section className="reglages" aria-label="Critères de recherche">
        <ChampsCriteres criteres={criteres} setCriteres={setCriteres} />

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
        {etat.type !== 'lecture' && derniere && (
          <p className="aide"><AgeLecture lueA={derniere.lueA} maintenant={maintenant} /></p>
        )}
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
                            <span title={m.competition}>{formatDate(m.debut)}</span>
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
              conditions={conditions[idBookmaker] ?? CONDITIONS_PAR_DEFAUT}
              setConditions={(c) => setConditions({ ...conditions, [idBookmaker]: c })}
            />
          )}
        </>
      )}
    </>
  );
}
