import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getActor, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { MAX_UPLOAD_BYTES, UPLOAD_DIR, detectImageFormat } from "@/lib/uploads";

/**
 * Upload d'images (photo de citoyen, véhicule, BOLO).
 *
 * C'est l'une des deux seules routes API du projet — les mutations passent
 * partout ailleurs par des server actions.
 *
 * Garde-fous :
 * - session valide obligatoire, et au moins une permission d'écriture sur un
 *   module qui accepte une image ;
 * - taille bornée à 5 Mo, lue depuis les octets réellement reçus et pas
 *   depuis l'en-tête déclaré ;
 * - format déduit des octets d'en-tête, pas du type MIME annoncé ; SVG exclu
 *   (XSS) ;
 * - nom de fichier généré aléatoirement et extension imposée par le format
 *   détecté : aucune partie du nom ne vient du client, donc pas de traversée
 *   de chemin possible ;
 * - stockage hors de `public/`, relu via une route authentifiée.
 */

/** Modules dont un formulaire accepte une image. */
const UPLOAD_PERMISSIONS = [
  "citizens.create",
  "citizens.edit",
  "vehicles.create",
  "vehicles.edit",
  "bolos.manage",
  // Pièces jointes des rapports : un agent qui peut rédiger ou corriger un
  // rapport doit pouvoir y joindre une photo.
  "reports.create",
  "reports.edit",
  "reports.edit_any",
  "medical.reports.create",
];

export async function POST(request: Request) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Vous devez être connecté pour envoyer une image." }, { status: 401 });
  }
  if (!UPLOAD_PERMISSIONS.some((permission) => can(actor, permission))) {
    return NextResponse.json(
      { error: "Votre grade ne vous autorise pas à envoyer une image." },
      { status: 403 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Image trop lourde : 5 Mo maximum. Réduisez-la avant de réessayer." },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Deuxième contrôle de taille : `file.size` est déclaratif, `bytes` est réel.
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Image trop lourde : 5 Mo maximum." }, { status: 413 });
  }

  const format = detectImageFormat(bytes);
  if (!format) {
    return NextResponse.json(
      { error: "Format non reconnu. Utilisez une image PNG, JPEG, GIF ou WebP." },
      { status: 415 },
    );
  }

  const filename = `${randomBytes(16).toString("hex")}.${format.extension}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);

  const url = `/api/uploads/${filename}`;
  await audit(actor, "upload.create", {
    metadata: { url, bytes: bytes.byteLength, mime: format.mime },
  });

  return NextResponse.json({ url });
}
