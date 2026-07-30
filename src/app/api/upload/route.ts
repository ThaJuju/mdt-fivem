import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getActor, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  consumeRateLimit,
  formatRetryDelay,
  peekRateLimit,
  type RateLimitRule,
} from "@/lib/rate-limit";
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
 * - stockage hors de `public/`, relu via une route authentifiée ;
 * - quota par compte, pour qu'un agent — ou un compte détourné — ne puisse
 *   pas remplir le disque du serveur 5 Mo par requête.
 */

/**
 * Quota d'envoi, compté en mégaoctets sur une fenêtre glissante : 60 Mo par
 * quart d'heure et par compte. La facturation au poids plutôt qu'au nombre de
 * requêtes est ce qui protège réellement le disque — cent vignettes ne
 * coûtent presque rien, douze photos pleine taille suffisent à saturer.
 *
 * Le compte est nominatif et non lié à l'adresse IP : la session est déjà
 * vérifiée à ce stade, autant s'appuyer sur une identité qu'on ne peut pas
 * falsifier.
 */
const UPLOAD_QUOTA: RateLimitRule = { limit: 60, windowMs: 15 * 60 * 1000 };

/** Modules dont un formulaire accepte une image. */
const UPLOAD_PERMISSIONS = [
  "profile.update",
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

  // Vérifié avant de lire le corps de la requête : au-delà du quota, on ne
  // veut même pas des octets en mémoire.
  const quotaKey = `upload:${actor.id}`;
  const quota = peekRateLimit(quotaKey, UPLOAD_QUOTA);
  if (!quota.ok) {
    return NextResponse.json(
      {
        error: `Quota d'envoi atteint. Réessayez dans ${formatRetryDelay(quota.retryAfterMs)}.`,
      },
      { status: 429 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const purpose = formData?.get("purpose");
  if (
    purpose !== "avatar" &&
    !UPLOAD_PERMISSIONS.filter((permission) => permission !== "profile.update").some((permission) =>
      can(actor, permission),
    )
  ) {
    return NextResponse.json(
      { error: "Votre grade ne vous autorise pas à envoyer une image pour ce module." },
      { status: 403 },
    );
  }
  const maxBytes = purpose === "avatar" ? 1024 * 1024 : MAX_UPLOAD_BYTES;
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `Image trop lourde : ${purpose === "avatar" ? "1 Mo" : "5 Mo"} maximum. Réduisez-la avant de réessayer.` },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Deuxième contrôle de taille : `file.size` est déclaratif, `bytes` est réel.
  if (bytes.byteLength > maxBytes) {
    return NextResponse.json(
      { error: `Image trop lourde : ${purpose === "avatar" ? "1 Mo" : "5 Mo"} maximum.` },
      { status: 413 },
    );
  }

  const format = detectImageFormat(bytes);
  if (!format) {
    return NextResponse.json(
      { error: "Format non reconnu. Utilisez une image PNG, JPEG, GIF ou WebP." },
      { status: 415 },
    );
  }

  // Facturé au mégaoctet entamé, une fois le fichier reconnu comme une image
  // valide : un envoi rejeté pour format n'entame pas le quota de l'agent.
  const megabytes = Math.max(1, Math.ceil(bytes.byteLength / (1024 * 1024)));
  consumeRateLimit(quotaKey, UPLOAD_QUOTA, megabytes);

  const filename = `${randomBytes(16).toString("hex")}.${format.extension}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);

  const url = `/api/uploads/${filename}`;
  await audit(actor, "upload.create", {
    metadata: { url, bytes: bytes.byteLength, mime: format.mime },
  });

  return NextResponse.json({ url });
}
