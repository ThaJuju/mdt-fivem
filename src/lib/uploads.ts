/**
 * Règles de sécurité de l'upload d'images.
 *
 * Ce module ne porte volontairement pas le marqueur `server-only` : il ne
 * contient ni secret ni accès base, uniquement de la reconnaissance de format
 * et un chemin. Le marqueur lèverait une erreur à l'import depuis `server.ts`,
 * qui tourne en Node simple et a besoin des mêmes règles pour le ménage des
 * fichiers orphelins. Une seule définition des noms valides, partagée par le
 * runtime Next et par la tâche d'entretien.
 *
 * Le SVG est volontairement exclu : un SVG est un document XML capable de
 * porter du script, donc servi depuis notre propre origine il ouvre une
 * faille XSS. Seuls les formats matriciels sont acceptés.
 */

import path from "node:path";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 Mo

/**
 * Les fichiers envoyés sont stockés HORS de `public/`, pour deux raisons :
 * `next start` fige la liste des fichiers statiques au build et ne servirait
 * jamais un fichier ajouté ensuite ; et du contenu déposé par un utilisateur
 * n'a rien à faire dans un répertoire servi tel quel. Ils transitent donc par
 * une route authentifiée (`/api/uploads/[filename]`).
 */
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

/**
 * Un nom de fichier valide est intégralement généré par le serveur :
 * 32 caractères hexadécimaux et une extension connue. Tout écart est rejeté,
 * ce qui rend impossible la traversée de chemin (`../`).
 */
const FILENAME_PATTERN = /^[0-9a-f]{32}\.(png|jpg|gif|webp)$/;

export function isSafeUploadName(filename: string): boolean {
  return FILENAME_PATTERN.test(filename);
}

export function mimeForExtension(filename: string): string {
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".jpg")) return "image/jpeg";
  if (filename.endsWith(".gif")) return "image/gif";
  return "image/webp";
}

type ImageFormat = { mime: string; extension: string; matches: (bytes: Uint8Array) => boolean };

/**
 * On ne fait pas confiance au type déclaré par le client : il est trivial de
 * renvoyer `image/png` en envoyant tout autre chose. Le format est déduit des
 * octets d'en-tête du fichier.
 */
const FORMATS: ImageFormat[] = [
  {
    mime: "image/png",
    extension: "png",
    matches: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a,
  },
  {
    mime: "image/jpeg",
    extension: "jpg",
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/gif",
    extension: "gif",
    matches: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  },
  {
    // RIFF....WEBP
    mime: "image/webp",
    extension: "webp",
    matches: (b) =>
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
];

export const ACCEPTED_MIME = FORMATS.map((format) => format.mime);

/** Retourne le format réel du fichier, ou null s'il n'est pas une image acceptée. */
export function detectImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length < 12) return null;
  return FORMATS.find((format) => format.matches(bytes)) ?? null;
}
