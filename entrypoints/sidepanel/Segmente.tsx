interface Option<T> {
  valeur: T;
  texte: string;
  titre?: string;
}

interface Props<T> {
  libelle: string;
  options: readonly Option<T>[];
  valeur: T;
  onChange: (valeur: T) => void;
}

/** Boutons côte à côte dont un seul est actif. */
export function Segmente<T extends string | number>({ libelle, options, valeur, onChange }: Props<T>) {
  return (
    <div className="segmente" role="group" aria-label={libelle} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.valeur} type="button" title={o.titre} aria-pressed={o.valeur === valeur} onClick={() => onChange(o.valeur)}>
          {o.texte}
        </button>
      ))}
    </div>
  );
}
