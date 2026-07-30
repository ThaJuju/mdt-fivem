/**
 * Entretien périodique de la base et du disque.
 *
 * Déclenché par `server.ts` (le serveur maison), pas par une requête : ces
 * balayages parcourent des tables entières et un répertoire, ils n'ont rien à
 * faire dans le chemin d'une page. C'est la même logique que le dispatch
 * temps réel — `next dev` seul n'exécute pas ce ménage, l'application
 * fonctionne quand même, elle accumule simplement.
 *
 * Ce module ne porte pas `server-only` et reçoit son client Prisma en
 * paramètre : il doit rester importable depuis `server.ts`, qui tourne en
 * Node simple, hors runtime React.
 */

import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { UPLOAD_DIR, isSafeUploadName } from "./uploads";

/**
 * Un fichier tout juste envoyé n'est pas encore référencé : le formulaire qui
 * l'a reçu n'est pas soumis. Ce délai de grâce évite de supprimer sous les
 * doigts d'un agent la photo qu'il vient de déposer.
 */
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

export type MaintenanceReport = {
  expiredSessions: number;
  orphanUploads: number;
  expiredDocuments: number;
  oldLoginAttempts: number;
};

/**
 * Rétention des tentatives de connexion : bien plus large que la fenêtre de
 * quinze minutes de la limitation de débit, parce que la table sert aussi
 * d'historique consultable. « 40 échecs sur ce compte la semaine dernière »
 * a une valeur que quinze minutes n'ont pas.
 */
const LOGIN_ATTEMPT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export async function purgeOldLoginAttempts(prisma: PrismaClient): Promise<number> {
  const { count } = await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - LOGIN_ATTEMPT_RETENTION_MS) } },
  });
  return count;
}

/**
 * Bascule les mandats, BOLO et licences arrivés à échéance.
 *
 * Cette fonction est le cœur de l'expiration : `src/lib/expiry.ts` l'appelle
 * au moment où une page affiche un de ces enregistrements comme actif
 * (expiration paresseuse), et `runMaintenance()` la rejoue toutes les six
 * heures pour que la base converge même sans visite. Les deux chemins sont
 * complémentaires : le premier garantit qu'un écran n'affiche jamais une
 * donnée périmée, le second qu'une donnée périmée ne survit pas en base parce
 * que personne n'est passé.
 *
 * Elle prend son client en paramètre, comme le reste du module : `server.ts`
 * tourne hors runtime React et a le sien.
 */
export async function expireStaleRecords(prisma: PrismaClient): Promise<number> {
  const now = new Date();
  const [warrants, bolos, licenses] = await Promise.all([
    prisma.warrant.updateMany({
      where: { status: { in: ["PENDING", "ACTIVE"] }, expiresAt: { not: null, lt: now } },
      data: { status: "EXPIRED" },
    }),
    prisma.bolo.updateMany({
      where: { isActive: true, expiresAt: { not: null, lt: now } },
      data: { isActive: false },
    }),
    prisma.license.updateMany({
      where: { status: "VALID", expiresAt: { not: null, lt: now } },
      data: { status: "EXPIRED" },
    }),
  ]);
  return warrants.count + bolos.count + licenses.count;
}

/**
 * Supprime les sessions arrivées à échéance.
 *
 * `getActor()` refuse déjà une session périmée et supprime celle qu'il
 * rencontre, mais uniquement celle-là : sans balayage, la table ne fait que
 * grossir avec les sessions de gens qui ne reviennent pas se connecter.
 */
export async function purgeExpiredSessions(prisma: PrismaClient): Promise<number> {
  const { count } = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}

/** Toutes les colonnes qui peuvent référencer un fichier envoyé. */
async function referencedUploadNames(prisma: PrismaClient): Promise<Set<string>> {
  const [users, departments, citizens, vehicles, bolos, evidence, medical] = await Promise.all([
    prisma.user.findMany({ where: { avatarUrl: { not: null } }, select: { avatarUrl: true } }),
    prisma.department.findMany({ where: { logoUrl: { not: null } }, select: { logoUrl: true } }),
    prisma.citizen.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } }),
    prisma.vehicle.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } }),
    prisma.bolo.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true } }),
    prisma.evidence.findMany({ where: { url: { not: null } }, select: { url: true } }),
    prisma.medicalAttachment.findMany({ select: { url: true } }),
  ]);

  const names = new Set<string>();
  const collect = (url: string | null) => {
    if (url) names.add(path.basename(url));
  };

  users.forEach((row) => collect(row.avatarUrl));
  departments.forEach((row) => collect(row.logoUrl));
  citizens.forEach((row) => collect(row.imageUrl));
  vehicles.forEach((row) => collect(row.imageUrl));
  bolos.forEach((row) => collect(row.imageUrl));
  evidence.forEach((row) => collect(row.url));
  medical.forEach((row) => collect(row.url));

  return names;
}

/**
 * Supprime les images qu'aucune fiche ne référence plus.
 *
 * Supprimer un citoyen, un véhicule ou un BOLO efface la ligne mais laisse le
 * fichier sur le disque : sans ce balayage, `uploads/` ne fait que croître, y
 * compris avec des photos de dossiers effacés qu'on n'a plus le droit de
 * conserver.
 *
 * Le sens du balayage est important : on part des fichiers présents, et on ne
 * supprime que ceux dont on est sûr qu'aucune ligne ne les cite. Un fichier
 * dont on ne sait rien est gardé.
 */
export async function purgeOrphanUploads(prisma: PrismaClient): Promise<number> {
  let entries: string[];
  try {
    entries = await readdir(UPLOAD_DIR);
  } catch {
    // Répertoire absent : aucun envoi n'a encore eu lieu.
    return 0;
  }

  const referenced = await referencedUploadNames(prisma);
  const now = Date.now();
  let removed = 0;

  for (const entry of entries) {
    // Un fichier au nom non conforme n'a pas été écrit par la route d'envoi.
    // On n'y touche pas : ce n'est pas à une tâche de ménage de décider du
    // sort de quelque chose qu'elle ne reconnaît pas.
    if (!isSafeUploadName(entry)) continue;
    if (referenced.has(entry)) continue;

    const fullPath = path.join(UPLOAD_DIR, entry);
    try {
      const info = await stat(fullPath);
      if (now - info.mtimeMs < ORPHAN_GRACE_MS) continue;
      await unlink(fullPath);
      removed += 1;
    } catch {
      // Fichier disparu entre-temps, ou droits insuffisants : on passe.
    }
  }

  return removed;
}

export async function runMaintenance(prisma: PrismaClient): Promise<MaintenanceReport> {
  const [expiredSessions, orphanUploads, expiredDocuments, oldLoginAttempts] = await Promise.all([
    purgeExpiredSessions(prisma),
    purgeOrphanUploads(prisma),
    expireStaleRecords(prisma),
    purgeOldLoginAttempts(prisma),
  ]);
  return { expiredSessions, orphanUploads, expiredDocuments, oldLoginAttempts };
}
