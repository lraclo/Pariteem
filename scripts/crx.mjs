// Empaquetage CRX3 et manifeste de mise à jour pour l'installation par Chrome Enterprise Core.
// Format CRX3 : https://source.chromium.org/chromium/chromium/src/+/main:components/crx_file/crx3.proto
import { createHash, createPublicKey, sign } from 'node:crypto';

export const DEPOT = 'lraclo/Pariteem';
export const URL_MISE_A_JOUR = `https://github.com/${DEPOT}/releases/latest/download/update.xml`;
export const urlCrx = (version) => `https://github.com/${DEPOT}/releases/download/v${version}/pariteem.crx`;

const PREFIXE_SIGNATURE = Buffer.from('CRX3 SignedData\x00', 'binary');

function varint(n) {
  const octets = [];
  while (n > 0x7f) {
    octets.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  octets.push(n);
  return Buffer.from(octets);
}

// Champ protobuf de type « length-delimited » (bytes ou message imbriqué).
function champ(numero, contenu) {
  return Buffer.concat([varint((numero << 3) | 2), varint(contenu.length), contenu]);
}

function uint32le(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n);
  return b;
}

/** Les 16 premiers octets du SHA-256 de la clé publique : l'identité de l'extension. */
function crxId(clePubliqueDer) {
  return createHash('sha256').update(clePubliqueDer).digest().subarray(0, 16);
}

/** L'ID affiché par Chrome : l'empreinte en hexadécimal, chiffres 0-f transposés en lettres a-p. */
export function idExtension(clePriveePem) {
  const der = createPublicKey(clePriveePem).export({ type: 'spki', format: 'der' });
  return [...crxId(der).toString('hex')]
    .map((c) => String.fromCharCode('a'.charCodeAt(0) + parseInt(c, 16)))
    .join('');
}

export function donneesASigner(enTeteSigne, zip) {
  return Buffer.concat([PREFIXE_SIGNATURE, uint32le(enTeteSigne.length), enTeteSigne, zip]);
}

/** Signe le zip de l'extension et renvoie le fichier .crx (CRX3, signature RSA-SHA256). */
export function empaqueterCrx(zip, clePriveePem) {
  const clePubliqueDer = createPublicKey(clePriveePem).export({ type: 'spki', format: 'der' });
  const enTeteSigne = champ(1, crxId(clePubliqueDer)); // SignedData { crx_id }
  const signature = sign('sha256', donneesASigner(enTeteSigne, zip), clePriveePem);
  const enTete = Buffer.concat([
    champ(2, Buffer.concat([champ(1, clePubliqueDer), champ(2, signature)])), // sha256_with_rsa
    champ(10000, enTeteSigne), // signed_header_data
  ]);
  return Buffer.concat([Buffer.from('Cr24'), uint32le(3), uint32le(enTete.length), enTete, zip]);
}

export function manifesteMiseAJour(id, version) {
  return `<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='${id}'>
    <updatecheck codebase='${urlCrx(version)}' version='${version}' />
  </app>
</gupdate>
`;
}
