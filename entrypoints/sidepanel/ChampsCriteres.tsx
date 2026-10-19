import { useId } from 'react';
import type { Reglages } from '@/lib/reglages';
import { FENETRES } from '@/lib/reglages';
import { Segmente } from './Segmente';

interface Props {
  criteres: Reglages;
  setCriteres: (c: Reglages) => void;
  /** Faux dans Comparer, où le Tri ne s'applique pas. */
  avecTri?: boolean;
}

/** Seuil, Fenêtre et Tri : les mêmes valeurs mémorisées pour Chercher et Comparer. */
export function ChampsCriteres({ criteres, setCriteres, avecTri = true }: Props) {
  // Chercher et Comparer restent tous deux montés : chaque champ Seuil a son propre identifiant.
  const idSeuil = useId();

  function changerSeuil(seuil: number) {
    if (seuil >= 1) setCriteres({ ...criteres, seuil: Math.round(seuil * 100) / 100 });
  }

  return (
    <>
      <div className="ligne">
        <label htmlFor={idSeuil}>Seuil</label>
        <div className="pas">
          <button type="button" aria-label="Baisser le Seuil" onClick={() => changerSeuil(criteres.seuil - 0.05)}>−</button>
          <input
            id={idSeuil}
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
      {avecTri && (
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
      )}
    </>
  );
}
