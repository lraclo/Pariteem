import { useEffect, useState } from 'react';
import { phaseDepot, phaseFreebet } from '@/lib/domaine/calcul';
import { cotePlancher, type Paire } from '@/lib/domaine/match';
import type { ConditionsFreebet } from '@/lib/reglages';
import { formatCote, formatEuros } from './format';

interface Props {
  paire: Paire;
  conditions: ConditionsFreebet;
  setConditions: (c: ConditionsFreebet) => void;
}

function nombreOuNull(v: number): number | null {
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function Calculateur({ paire, conditions, setConditions }: Props) {
  const [phase, setPhase] = useState<'depot' | 'freebet'>('depot');
  const [indexDepot, setIndexDepot] = useState<number | undefined>();
  useEffect(() => setIndexDepot(undefined), [paire[0].id, paire[1].id]);

  const mise = conditions.montant;
  const resultat =
    phase === 'depot'
      ? phaseDepot(paire, mise)
      : phaseFreebet(paire, mise, { indexDepot, miseRendue: conditions.miseRendue });

  const alertes: string[] = [];
  if (conditions.coteMinSelection && paire.some((m) => cotePlancher(m) < conditions.coteMinSelection!))
    alertes.push(`Une Issue est sous la cote minimale par sélection (${formatCote(conditions.coteMinSelection)}).`);
  if (conditions.coteMinCombine && resultat.pireCas < conditions.coteMinCombine)
    alertes.push(`Le Pire cas est sous la cote minimale du combiné (${formatCote(conditions.coteMinCombine)}).`);

  const pireNet = Math.min(...resultat.lignes.map((l) => l.net));

  return (
    <section className="calculateur">
      <h2>Paire : {paire[0].equipeDomicile} / {paire[1].equipeDomicile}</h2>
      <div className="onglets">
        <button className={phase === 'depot' ? 'actif' : ''} onClick={() => setPhase('depot')}>Phase dépôt</button>
        <button className={phase === 'freebet' ? 'actif' : ''} onClick={() => setPhase('freebet')}>Phase freebet</button>
      </div>

      <dl className="resume">
        <div><dt>Pire cas</dt><dd>{formatCote(resultat.pireCas)}</dd></div>
        <div><dt>Argent réel</dt><dd>{formatEuros(resultat.misesReelles)}</dd></div>
        <div>
          <dt>{pireNet < 0 ? 'Perte max' : 'Gain min'}</dt>
          <dd className={pireNet < 0 ? 'negatif' : 'positif'}>{formatEuros(Math.abs(pireNet))}</dd>
        </div>
      </dl>
      {alertes.map((a) => <p key={a} className="erreur">{a}</p>)}

      <table>
        <thead>
          <tr><th>Combinaison</th><th>Cote</th><th>Mise</th><th>Gain</th><th>Net</th></tr>
        </thead>
        <tbody>
          {resultat.lignes.map((l, i) => (
            <tr key={l.combinaison.issues.join('')}>
              <td>{l.combinaison.issues.join(' / ')}</td>
              <td>{formatCote(l.combinaison.coteCombinee)}</td>
              <td>
                {phase === 'freebet' ? (
                  <label className="depot" title="Combinaison couverte par le dépôt du nouveau Titulaire">
                    <input type="radio" name="depot" checked={l.mise === 'depot'} onChange={() => setIndexDepot(i)} />
                    {l.mise === 'depot' ? 'Dépôt' : 'Freebet'}
                  </label>
                ) : 'Dépôt'}
              </td>
              <td>{formatEuros(l.gain)}</td>
              <td className={l.net < 0 ? 'negatif' : 'positif'}>{formatEuros(l.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <details className="conditions">
        <summary>Conditions de l'offre de bienvenue</summary>
        <label>
          Montant ({'€'})
          <input type="number" min={1} value={conditions.montant}
            onChange={(e) => e.target.valueAsNumber > 0 && setConditions({ ...conditions, montant: e.target.valueAsNumber })} />
        </label>
        <label>
          Cote min. par sélection
          <input type="number" min={1} step={0.05} value={conditions.coteMinSelection ?? ''}
            onChange={(e) => setConditions({ ...conditions, coteMinSelection: nombreOuNull(e.target.valueAsNumber) })} />
        </label>
        <label>
          Cote min. du combiné
          <input type="number" min={1} step={0.05} value={conditions.coteMinCombine ?? ''}
            onChange={(e) => setConditions({ ...conditions, coteMinCombine: nombreOuNull(e.target.valueAsNumber) })} />
        </label>
        <label className="case">
          <input type="checkbox" checked={conditions.miseRendue}
            onChange={(e) => setConditions({ ...conditions, miseRendue: e.target.checked })} />
          Remboursement en argent retirable (mise rendue)
        </label>
      </details>
    </section>
  );
}
