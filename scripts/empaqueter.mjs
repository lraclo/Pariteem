// Produit .output/pariteem.crx et .output/update.xml à partir du zip de `npm run zip`.
// Clé de signature : variable d'environnement CLE_CRX (en CI), sinon ~/.config/pariteem/cle-crx.pem.
// `node scripts/empaqueter.mjs --id` affiche seulement l'ID de l'extension.
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { empaqueterCrx, idExtension, manifesteMiseAJour, URL_MISE_A_JOUR } from './crx.mjs';

const cle = process.env.CLE_CRX || readFileSync(join(homedir(), '.config/pariteem/cle-crx.pem'), 'utf8');
const id = idExtension(cle);

if (process.argv.includes('--id')) {
  console.log(id);
  process.exit(0);
}

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const tag = process.env.GITHUB_REF_NAME;
if (tag && tag !== `v${version}`) {
  console.error(`Le tag ${tag} ne correspond pas à la version ${version} de package.json.`);
  process.exit(1);
}

const zip = readFileSync(`.output/pariteem-${version}-chrome.zip`);
writeFileSync('.output/pariteem.crx', empaqueterCrx(zip, cle));
writeFileSync('.output/update.xml', manifesteMiseAJour(id, version));

console.log(`Pariteem ${version} empaquetée.`);
console.log(`ID de l'extension : ${id}`);
console.log(`URL de mise à jour : ${URL_MISE_A_JOUR}`);
