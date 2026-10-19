import type { ConditionsFreebet, Ecart } from '@/lib/domaine/conditions';

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const net = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, signDisplay: 'exceptZero' });
const nombre = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const formatEuros = (v: number) => euros.format(v);
/** Un résultat net, toujours signé : « +476 € », « −224 € ». */
export const formatNet = (v: number) => net.format(v);
export const formatCote = (v: number) => nombre.format(v);
export const formatDate = (ms: number) => date.format(ms);

/** « il y a moins d'une minute », « il y a 12 min », « il y a 3 h », « il y a 2 j ». */
export function formatDepuis(ms: number, maintenant: number): string {
  const minutes = Math.floor(Math.max(0, maintenant - ms) / 60_000);
  if (minutes < 1) return "il y a moins d'une minute";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 48 * 60) return `il y a ${Math.floor(minutes / 60)} h`;
  return `il y a ${Math.floor(minutes / 1440)} j`;
}

/** L'alerte affichée quand la Paire ne respecte pas une cote minimale de l'offre de bienvenue. */
export function texteEcart(e: Ecart, c: ConditionsFreebet): string {
  return e === 'cote-min-selection'
    ? `Une Issue est sous la cote minimale par sélection (${formatCote(c.coteMinSelection!)}).`
    : `Le Pire cas est sous la cote minimale du combiné (${formatCote(c.coteMinCombine!)}).`;
}
