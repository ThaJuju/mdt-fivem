import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { expireStaleRecords } from "./maintenance";

type UpdateManyCall = { where: Record<string, unknown>; data: Record<string, unknown> };

/**
 * Client Prisma factice : on ne teste pas PostgreSQL, on teste les clauses
 * envoyées. C'est là qu'était le défaut — les licences n'étaient balayées
 * nulle part, et une licence périmée restait affichée « Valide »
 * indéfiniment.
 */
function stubPrisma(counts = { warrant: 0, bolo: 0, license: 0 }) {
  const calls: Record<string, UpdateManyCall> = {};
  const model = (name: keyof typeof counts) => ({
    updateMany: vi.fn(async (args: UpdateManyCall) => {
      calls[name] = args;
      return { count: counts[name] };
    }),
  });
  const prisma = {
    warrant: model("warrant"),
    bolo: model("bolo"),
    license: model("license"),
  } as unknown as PrismaClient;
  return { prisma, calls };
}

describe("expireStaleRecords", () => {
  it("balaye les mandats, les BOLO et les licences", async () => {
    const { prisma, calls } = stubPrisma();
    await expireStaleRecords(prisma);
    expect(Object.keys(calls).sort()).toEqual(["bolo", "license", "warrant"]);
  });

  it("bascule en EXPIRED les mandats en attente comme actifs", async () => {
    const { prisma, calls } = stubPrisma();
    await expireStaleRecords(prisma);
    expect(calls.warrant.where.status).toEqual({ in: ["PENDING", "ACTIVE"] });
    expect(calls.warrant.data).toEqual({ status: "EXPIRED" });
  });

  it("désactive les BOLO échus", async () => {
    const { prisma, calls } = stubPrisma();
    await expireStaleRecords(prisma);
    expect(calls.bolo.where.isActive).toBe(true);
    expect(calls.bolo.data).toEqual({ isActive: false });
  });

  it("expire les licences valides arrivées à échéance", async () => {
    const { prisma, calls } = stubPrisma();
    await expireStaleRecords(prisma);
    expect(calls.license.where.status).toBe("VALID");
    expect(calls.license.data).toEqual({ status: "EXPIRED" });
  });

  /**
   * `expiresAt: { not: null, lt: now }` : sans le `not: null`, tout
   * enregistrement sans date d'échéance serait expiré au premier balayage —
   * un mandat permanent disparaîtrait de la fiche citoyen.
   */
  it("épargne ce qui n'a pas de date d'échéance", async () => {
    const { prisma, calls } = stubPrisma();
    const before = new Date();
    await expireStaleRecords(prisma);
    const after = new Date();

    for (const call of [calls.warrant, calls.bolo, calls.license]) {
      const expiresAt = call.where.expiresAt as { not: null; lt: Date };
      expect(expiresAt.not).toBeNull();
      expect(expiresAt.lt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(expiresAt.lt.getTime()).toBeLessThanOrEqual(after.getTime());
    }
  });

  it("retourne le nombre total d'enregistrements basculés", async () => {
    const { prisma } = stubPrisma({ warrant: 2, bolo: 1, license: 4 });
    expect(await expireStaleRecords(prisma)).toBe(7);
  });
});
