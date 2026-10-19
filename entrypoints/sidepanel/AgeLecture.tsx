import { formatDepuis } from './format';

/** Au-delà, les Cotes ont pu bouger : mieux vaut relancer une recherche avant de parier. */
const A_RELANCER_MS = 30 * 60_000;
/** Au-delà, la Lecture ne dit plus grand-chose des Cotes actuelles. */
const PERIMEE_MS = 3 * 3_600_000;

/** Classe de couleur de l'âge d'une Lecture : texte normal, puis orange, puis rouge. */
export function classeAge(lueA: number, maintenant: number): string {
  const age = maintenant - lueA;
  return age >= PERIMEE_MS ? 'perimee' : age >= A_RELANCER_MS ? 'a-relancer' : '';
}

/** « Lu il y a 12 min », en orange après 30 min et en rouge après 3 h. */
export function AgeLecture({ lueA, maintenant }: { lueA: number; maintenant: number }) {
  return <span className={`age ${classeAge(lueA, maintenant)}`}>Lu {formatDepuis(lueA, maintenant)}</span>;
}
