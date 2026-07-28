import "server-only";

import { prisma } from "./prisma";

/**
 * Expiration paresseuse : plutôt qu'une tâche planifiée, les mandats et BOLO
 * arrivés à échéance sont basculés au moment où on consulte la liste. Un
 * enregistrement périmé n'est donc jamais affiché comme actif.
 */
export async function expireStaleRecords(): Promise<void> {
  const now = new Date();
  await Promise.all([
    prisma.warrant.updateMany({
      where: { status: { in: ["PENDING", "ACTIVE"] }, expiresAt: { not: null, lt: now } },
      data: { status: "EXPIRED" },
    }),
    prisma.bolo.updateMany({
      where: { isActive: true, expiresAt: { not: null, lt: now } },
      data: { isActive: false },
    }),
  ]);
}
