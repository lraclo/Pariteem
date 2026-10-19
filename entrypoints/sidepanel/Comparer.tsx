import type { IdBookmaker } from '@/lib/bookmakers';
import { comparer, type LigneComparaison } from '@/lib/domaine/comparaison';
import { selections, type Lectures } from '@/lib/lectures';
import { CONDITIONS_PAR_DEFAUT, type ConditionsFreebet, type Reglages } from '@/lib/reglages';
import { AgeLecture } from './AgeLecture';
import { ChampsCriteres } from './ChampsCriteres';
import { formatCote, formatNet, texteEcart } from './format';

interface Props {
  criteres: Reglages;
  setCriteres: (c: Reglages) => void;
  conditions: Partial<Record<IdBookmaker, ConditionsFreebet>>;
  lectures: Lectures;
  maintenant: number;
  /** Appelé après l'ouverture du site d'un Bookmaker, pour passer sur Chercher. */
  surOuverture: () => void;
}

/** Les Bookmakers classés par Pire cas de leur Meilleure Paire, d'après leur dernière Lecture. */
export function Comparer({ criteres, setCriteres, conditions, lectures, maintenant, surOuverture }: Props) {
  const lignes = comparer(lectures, { ...criteres, maintenant }, conditions);
  const lus = lignes.filter((l) => l.type !== 'jamais-lu').length;

  /** Ouvre le site du Bookmaker et y coche la Paire, pour afficher tout de suite le Calculateur. */
  async function ouvrir(l: LigneComparaison) {
    if (l.type === 'paire') {
      await selections.setValue({ ...(await selections.getValue()), [l.bookmaker.id]: l.paire.map((m) => m.id) });
    }
    surOuverture();
    await browser.tabs.create({ url: l.bookmaker.urlFootball, active: true });
  }

  return (
    <>
      <section className="reglages" aria-label="Critères de comparaison">
        <ChampsCriteres criteres={criteres} setCriteres={setCriteres} avecTri={false} />
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
          <span>Espérance</span>
        </div>
        <ol>
          {lignes.map((l) => (
            <li key={l.bookmaker.id} className={l.type === 'jamais-lu' ? 'jamais-lu' : ''}>
              <button type="button" onClick={() => ouvrir(l)} title={`Ouvrir ${l.bookmaker.nom}`}>
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
                  <small>{l.type === 'jamais-lu' ? 'Pas encore lu' : <AgeLecture lueA={l.lueA} maintenant={maintenant} />}</small>
                </span>
                <span className="pire-cas">{l.type === 'paire' ? formatCote(l.pireCas) : '–'}</span>
                <span className={l.type === 'paire' ? (l.esperance < 0 ? 'esperance negatif' : 'esperance positif') : 'esperance'}>
                  {l.type === 'paire' ? formatNet(l.esperance) : '–'}
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
