import { useState } from 'react';
import { phaseDepot, phaseFreebet, type Ligne } from '@/lib/domaine/calcul';
import { cotePlancher, ISSUES, type Issue, type Match, type Paire } from '@/lib/domaine/match';
import type { ConditionsFreebet } from '@/lib/reglages';
import { formatCote, formatEuros, formatNet } from './format';
import { Segmente } from './Segmente';

interface Props {
  paire: Paire;
  conditions: ConditionsFreebet;
  setConditions: (c: ConditionsFreebet) => void;
}

function nombreOuNull(v: number): number | null {
  return Number.isFinite(v) && v > 0 ? v : null;
}

function nomIssue(m: Match, i: Issue): string {
  if (i === 'N') return 'Match nul';
  return `${i === '1' ? m.equipeDomicile : m.equipeExterieur} gagne`;
}

const signe = (v: number) => (v < 0 ? 'negatif' : 'positif');

export function Calculateur({ paire, conditions, setConditions }: Props) {
  const [phase, setPhase] = useState<'depot' | 'freebet'>('depot');
  const [a, b] = paire;

  const mise = conditions.montant;
  const resultat =
    phase === 'depot' ? phaseDepot(paire, mise) : phaseFreebet(paire, mise, { miseRendue: conditions.miseRendue });

  const alertes: string[] = [];
  if (conditions.coteMinSelection && paire.some((m) => cotePlancher(m) < conditions.coteMinSelection!))
    alertes.push(`Une Issue est sous la cote minimale par sélection (${formatCote(conditions.coteMinSelection)}).`);
  if (conditions.coteMinCombine && resultat.pireCas < conditions.coteMinCombine)
    alertes.push(`Le Pire cas est sous la cote minimale du combiné (${formatCote(conditions.coteMinCombine)}).`);

  const parNet = [...resultat.lignes].sort((x, y) => x.net - y.net);
  const pire = parNet[0]!;
  const meilleur = parNet[parNet.length - 1]!;
  const depot = resultat.lignes.find((l) => l.mise === 'depot');

  const stats = [
    {
      libelle: 'Argent réel',
      valeur: formatEuros(resultat.misesReelles),
      detail: phase === 'depot' ? `9 × ${formatEuros(mise)}` : conditions.miseRendue ? 'mises rendues' : '1 dépôt',
      classe: '',
    },
    { libelle: 'Pire', valeur: formatNet(pire.net), detail: `cote ${formatCote(pire.combinaison.coteCombinee)}`, classe: signe(pire.net) },
    { libelle: 'Meilleur', valeur: formatNet(meilleur.net), detail: `cote ${formatCote(meilleur.combinaison.coteCombinee)}`, classe: signe(meilleur.net) },
    { libelle: 'Espérance', valeur: `≈ ${formatNet(resultat.esperance)}`, detail: 'estimée', classe: signe(resultat.esperance) },
  ];

  const lignesDe = (i: Issue): Ligne[] => resultat.lignes.filter((l) => l.combinaison.issues[0] === i);

  return (
    <section className="calculateur" aria-label="Paire">
      <div className="paire">
        <h2>Paire</h2>
        <p><span className="lettre">A</span>{a.equipeDomicile} – {a.equipeExterieur}</p>
        <p><span className="lettre">B</span>{b.equipeDomicile} – {b.equipeExterieur}</p>
      </div>

      <Segmente
        libelle="Phase"
        options={[
          { valeur: 'depot', texte: 'Phase dépôt' },
          { valeur: 'freebet', texte: 'Phase freebet' },
        ]}
        valeur={phase}
        onChange={setPhase}
      />

      <dl className="stats">
        {stats.map((s) => (
          <div key={s.libelle}>
            <dt>{s.libelle}</dt>
            <dd className={s.classe}>{s.valeur}</dd>
            <dd className="detail">{s.detail}</dd>
          </div>
        ))}
      </dl>
      {alertes.map((x) => <p key={x} className="erreur">{x}</p>)}

      <table className="combinaisons">
        <colgroup>
          <col />
          <col className="col-cote" />
          <col className="col-gain" />
          <col className="col-net" />
        </colgroup>
        <thead>
          <tr><th scope="col">Combinaison</th><th scope="col">Cote</th><th scope="col">Gain</th><th scope="col">Net</th></tr>
        </thead>
        {ISSUES.map((i) => (
          <tbody key={i}>
            <tr className="groupe">
              <th scope="rowgroup" colSpan={2}><span className="lettre">A</span>{nomIssue(a, i)}</th>
              <td colSpan={2}>cote {formatCote(a.cotes[i])}</td>
            </tr>
            {lignesDe(i).map((l) => {
              const estPire = l.net === pire.net;
              return (
                <tr key={l.combinaison.issues.join('')} className={estPire && l.net < 0 ? 'pire' : ''}>
                  <th scope="row"><span className="lettre">B</span>{nomIssue(b, l.combinaison.issues[1])}</th>
                  <td className="cote">{formatCote(l.combinaison.coteCombinee)}</td>
                  <td className="gain">{formatEuros(l.gain)}</td>
                  <td className={`${signe(l.net)}${estPire ? ' fort' : ''}`}>{formatNet(l.net)}</td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
      <p className="aide">
        {phase === 'depot'
          ? `${formatEuros(mise)} de dépôt par Titulaire.`
          : `8 Freebets de ${formatEuros(mise)}, et le dépôt de ${formatEuros(mise)} sur ${depot?.combinaison.issues.join(' / ')}, la Combinaison la moins probable.`}
        {' '}Espérance : net moyen pondéré par les probabilités des Cotes, marge du Bookmaker retirée.
      </p>

      <details className="conditions">
        <summary>Conditions de l'offre de bienvenue</summary>
        <div className="champs">
          <label>
            Montant (€)
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
        </div>
      </details>
    </section>
  );
}
