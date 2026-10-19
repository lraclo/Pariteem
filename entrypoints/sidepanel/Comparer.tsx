import { useMemo, useState } from 'react';
import type { IdBookmaker } from '@/lib/bookmakers';
import { comparer, type LigneComparaison } from '@/lib/domaine/comparaison';
import { cotePlancher } from '@/lib/domaine/match';
import { selections, type Lectures } from '@/lib/lectures';
import type { DemandeArreter, DemandeToutLire } from '@/lib/messages';
import { CONDITIONS_PAR_DEFAUT, type ConditionsFreebet, type Reglages } from '@/lib/reglages';
import { toutLire, type ToutLire } from '@/lib/tout-lire';
import { AgeLecture } from './AgeLecture';
import { ChampsCriteres } from './ChampsCriteres';
import { formatCote, formatDepuis, texteEcart } from './format';
import { useStockage } from './useStockage';

/** En deçà, relancer « Tout lire » demande une confirmation : enchaîner les lectures ressemble à un robot. */
const TOUT_LU_RECEMMENT_MS = 5 * 60_000;

interface Props {
  criteres: Reglages;
  setCriteres: (c: Reglages) => void;
  conditions: Partial<Record<IdBookmaker, ConditionsFreebet>>;
  lectures: Lectures;
  maintenant: number;
  /** Affiche ce Bookmaker dans Chercher. */
  surChoix: (id: IdBookmaker) => void;
}

/** Les Bookmakers classés par Pire cas de leur Meilleure Paire, d'après leur dernière Lecture. */
export function Comparer({ criteres, setCriteres, conditions, lectures, maintenant, surChoix }: Props) {
  // Recalculé seulement quand les Lectures ou les critères changent, pas à chaque progression de la lecture.
  const lignes = useMemo(() => comparer(lectures, { ...criteres, maintenant }, conditions), [lectures, criteres, conditions, maintenant]);
  const lus = lignes.filter((l) => l.type !== 'jamais-lu').length;
  const [course] = useStockage(toutLire);
  const sites = Object.values(course?.sites ?? {});
  const termines = sites.filter((e) => e.etat !== 'attente' && e.etat !== 'lecture').length;

  // Premier clic peu après une lecture de tous les Bookmakers : on prévient, et un second clic relit quand même.
  // L'avertissement vaut pour cette lecture-là (son heure de lancement) et disparaît avec les 5 minutes.
  const [prevenuPour, setPrevenuPour] = useState<number | null>(null);
  const luRecemment = (a: number) => course !== null && a - course.debut < TOUT_LU_RECEMMENT_MS;
  const avertissement =
    course && !course.enCours && prevenuPour === course.debut && luRecemment(maintenant)
      ? `Attention : Vous avez déjà tout lu ${formatDepuis(course.debut, maintenant)}. Cliquez de nouveau pour relire quand même.`
      : null;

  function envoyer(message: DemandeToutLire | DemandeArreter) {
    browser.runtime.sendMessage(message).catch(() => {});
  }

  function lancer() {
    if (course && luRecemment(Date.now()) && prevenuPour !== course.debut) {
      setPrevenuPour(course.debut);
      return;
    }
    setPrevenuPour(null);
    envoyer({ type: 'tout-lire' });
  }

  /**
   * Affiche le Bookmaker dans Chercher avec sa Paire cochée, pour voir tout de suite le Calculateur. Son site
   * ne s'ouvre pas : « Voir » sur un Match l'ouvre au besoin.
   */
  async function afficher(l: LigneComparaison) {
    if (l.type === 'paire') {
      await selections.setValue({ ...(await selections.getValue()), [l.bookmaker.id]: l.paire.map((m) => m.id) });
    }
    surChoix(l.bookmaker.id);
  }

  return (
    <>
      <section className="reglages" aria-label="Critères de comparaison">
        <ChampsCriteres criteres={criteres} setCriteres={setCriteres} avecTri={false} />

        {course?.enCours ? (
          <button className="principal arreter" onClick={() => envoyer({ type: 'arreter' })}>Arrêter</button>
        ) : (
          <button className="principal" onClick={lancer}>{avertissement ? 'Relire quand même' : 'Lire tous les Bookmakers'}</button>
        )}
        {course?.enCours && <p className="aide">Lecture en cours : {termines} sur {sites.length || lignes.length} Bookmakers terminés.</p>}
        {!course?.enCours && course?.erreur && <p className="erreur">{course.erreur}</p>}
        {avertissement && <p className="attention">{avertissement}</p>}
        <p className="aide">À utiliser avec modération.</p>
      </section>

      <section className="comparaison" aria-label="Comparaison">
        <div className="titre-section">
          <div>
            <h2>Comparaison</h2>
            <span className="aide">{lus} sur {lignes.length} Bookmakers lus</span>
          </div>
        </div>

        <div className="entete-liste" aria-hidden="true">
          <span>Bookmaker · Meilleure Paire</span>
          <span>Pire cas</span>
        </div>
        <ol>
          {lignes.map((l) => (
            <li key={l.bookmaker.id} className={l.type === 'jamais-lu' ? 'jamais-lu' : ''}>
              <button type="button" onClick={() => afficher(l)} title={`Afficher ${l.bookmaker.nom} dans Chercher`}>
                <span className="bookmaker">
                  <strong>
                    {l.bookmaker.nom}
                    {l.type === 'paire' && l.ecarts.length > 0 && (
                      <span
                        className="alerte"
                        title={l.ecarts.map((e) => texteEcart(e, conditions[l.bookmaker.id] ?? CONDITIONS_PAR_DEFAUT)).join('\n')}
                      >
                        {' '}⚠
                      </span>
                    )}
                  </strong>
                  {l.type === 'paire' ? (
                    l.paire.map((m) => <span key={m.id} className="match-court">{m.equipeDomicile} – {m.equipeExterieur}</span>)
                  ) : l.type === 'sans-paire' ? (
                    <span className="match-court">Aucune Paire au Seuil {formatCote(criteres.seuil)}</span>
                  ) : null}
                  <Statut ligne={l} course={course} maintenant={maintenant} />
                </span>
                {/* Le Pire cas, puis la Cote plancher de chaque Match, alignées sur leur ligne : Pire cas = produit des deux. */}
                <span className="cotes-paire">
                  <span className="pire-cas">{l.type === 'paire' ? formatCote(l.pireCas) : '–'}</span>
                  {l.type === 'paire' &&
                    l.paire.map((m) => <span key={m.id} title="Cote plancher du Match">{formatCote(cotePlancher(m))}</span>)}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="aide pied">Les Cotes bougent : relancez une recherche sur le site avant de parier.</p>
      </section>
    </>
  );
}

/**
 * Où en est la lecture du Bookmaker : l'avancement de « Tout lire » pendant qu'il tourne, puis ses échecs
 * (jusqu'à une Lecture plus récente), et sinon l'âge de la dernière Lecture.
 */
function Statut({ ligne, course, maintenant }: { ligne: LigneComparaison; course: ToutLire | null; maintenant: number }) {
  const lueA = ligne.type === 'jamais-lu' ? null : ligne.lueA;
  const etat = course?.sites[ligne.bookmaker.id];
  const aJour = lueA !== null && course !== null && lueA >= course.debut;
  const affiche = course?.enCours ? etat : !aJour && (etat?.etat === 'erreur' || etat?.etat === 'a-la-main') ? etat : undefined;
  switch (affiche?.etat) {
    case 'attente':
      return <small>En attente</small>;
    case 'lecture':
      return <small>{affiche.matchs === null ? 'Lecture…' : `Lecture… ${affiche.matchs} Matchs`}</small>;
    case 'lu':
      return <small className="positif">✓ {affiche.matchs} Matchs</small>;
    case 'erreur':
      return <small className="echec" title={affiche.message}>✗ {affiche.message}</small>;
    case 'lu-recemment':
      return <small>Lu récemment</small>;
    case 'a-la-main':
      return <small className="a-relancer">À lire à la main sur son site</small>;
  }
  return <small>{lueA === null ? 'Pas encore lu' : <AgeLecture lueA={lueA} maintenant={maintenant} />}</small>;
}
