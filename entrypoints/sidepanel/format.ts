const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const net = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, signDisplay: 'exceptZero' });
const nombre = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const formatEuros = (v: number) => euros.format(v);
/** Un résultat net, toujours signé : « +476 € », « −224 € ». */
export const formatNet = (v: number) => net.format(v);
export const formatCote = (v: number) => nombre.format(v);
export const formatDate = (ms: number) => date.format(ms);
