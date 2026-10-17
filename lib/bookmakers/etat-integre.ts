/**
 * Extrait l'objet JSON affecté à `var <nom> = {...}` dans le HTML d'une page.
 * On cherche la fin de l'objet en comptant les accolades hors chaînes, car le
 * script contient d'autres variables juste après.
 */
export function extraireObjetJson(html: string, nom: string): unknown {
  const marqueur = new RegExp(`\\b${nom}\\s*=\\s*\\{`).exec(html);
  if (!marqueur) throw new Error(`${nom} introuvable dans la page`);
  const debut = marqueur.index + marqueur[0].length - 1;
  let profondeur = 0;
  let dansChaine = false;
  for (let i = debut; i < html.length; i++) {
    const c = html[i];
    if (dansChaine) {
      if (c === '\\') i++;
      else if (c === '"') dansChaine = false;
    } else if (c === '"') dansChaine = true;
    else if (c === '{') profondeur++;
    else if (c === '}' && --profondeur === 0) return JSON.parse(html.slice(debut, i + 1));
  }
  throw new Error(`${nom} incomplet dans la page`);
}
