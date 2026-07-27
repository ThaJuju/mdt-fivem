import "server-only";

import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { Actor } from "./auth";

type AuditOptions = {
  entity?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Journalise une action, y compris les simples consultations
 * (ex. "citizen.view"). C'est ce qui permet de retrouver qui a consulté
 * quoi et pourquoi en cas de litige. À appeler partout où c'est pertinent,
 * pas seulement sur les mutations.
 */
export async function audit(actor: Actor | null, action: string, options: AuditOptions = {}): Promise<void> {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  await prisma.auditLog.create({
    data: {
      userId: actor?.id ?? null,
      action,
      entity: options.entity,
      entityId: options.entityId,
      metadata: options.metadata,
      ip,
    },
  });
}
