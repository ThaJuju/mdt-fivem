"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import { warrantRequestSchema, warrantDecisionSchema } from "@/lib/validations/warrant";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function requestWarrant(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "warrants.request");

    const parsed = warrantRequestSchema.safeParse({
      type: formData.get("type"),
      citizenId: formData.get("citizenId"),
      reason: formData.get("reason"),
      address: formData.get("address") ?? "",
      propertyId: formData.get("propertyId") ?? "",
      expiresAt: formData.get("expiresAt") ?? "",
      reportId: formData.get("reportId") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const property = parsed.data.type === "SEARCH" && parsed.data.propertyId
      ? await prisma.property.findUnique({
          where: { id: parsed.data.propertyId },
          select: { address: true, citizenId: true },
        })
      : null;
    if (parsed.data.type === "SEARCH" && parsed.data.propertyId && !property) {
      return { fieldErrors: { propertyId: ["Cette propriété n'existe plus."] } };
    }
    if (property?.citizenId && property.citizenId !== parsed.data.citizenId) {
      return { fieldErrors: { propertyId: ["Cette propriété appartient à un autre citoyen."] } };
    }

    const warrant = await prisma.warrant.create({
      data: {
        ...parsed.data,
        propertyId: parsed.data.type === "SEARCH" ? parsed.data.propertyId : undefined,
        address: parsed.data.type === "SEARCH" ? (property?.address ?? parsed.data.address) : undefined,
        requestedById: actor.id,
        status: "PENDING",
      },
    });
    await audit(actor, "warrant.request", {
      entity: "Warrant",
      entityId: warrant.id,
      metadata: { type: warrant.type },
    });
    revalidatePath("/mandats");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function approveWarrant(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "warrants.approve");

    const parsed = warrantDecisionSchema.safeParse({
      warrantId: formData.get("warrantId"),
      expiresAt: formData.get("expiresAt") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const warrant = await prisma.warrant.findUnique({
      where: { id: parsed.data.warrantId },
      select: { status: true, requestedById: true, expiresAt: true },
    });
    if (!warrant) return { error: "Ce mandat n'existe pas ou a été supprimé." };
    if (warrant.status !== "PENDING") {
      return { error: "Seul un mandat en attente peut être approuvé." };
    }
    if (warrant.requestedById === actor.id && !actor.isSuperAdmin) {
      return { error: "Vous ne pouvez pas approuver votre propre demande de mandat." };
    }

    await prisma.warrant.update({
      where: { id: parsed.data.warrantId },
      data: {
        status: "ACTIVE",
        approvedById: actor.id,
        approvedAt: new Date(),
        ...(parsed.data.expiresAt ? { expiresAt: parsed.data.expiresAt } : {}),
      },
    });
    await audit(actor, "warrant.approve", { entity: "Warrant", entityId: parsed.data.warrantId });
    revalidatePath("/mandats");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function denyWarrant(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "warrants.approve");

    const warrantId = String(formData.get("warrantId"));
    const warrant = await prisma.warrant.findUnique({
      where: { id: warrantId },
      select: { status: true, requestedById: true },
    });
    if (!warrant) return { error: "Ce mandat n'existe pas ou a été supprimé." };
    if (warrant.status !== "PENDING") return { error: "Seul un mandat en attente peut être refusé." };
    if (warrant.requestedById === actor.id && !actor.isSuperAdmin) {
      return { error: "Vous ne pouvez pas refuser votre propre demande de mandat." };
    }

    await prisma.warrant.update({
      where: { id: warrantId },
      data: { status: "DENIED", approvedById: actor.id, approvedAt: new Date() },
    });
    await audit(actor, "warrant.deny", { entity: "Warrant", entityId: warrantId });
    revalidatePath("/mandats");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function executeWarrant(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "warrants.execute");

    const warrantId = String(formData.get("warrantId"));
    const warrant = await prisma.warrant.findUnique({ where: { id: warrantId }, select: { status: true } });
    if (!warrant) return { error: "Ce mandat n'existe pas ou a été supprimé." };
    if (warrant.status !== "ACTIVE") {
      return { error: "Seul un mandat actif peut être exécuté." };
    }

    await prisma.warrant.update({ where: { id: warrantId }, data: { status: "EXECUTED" } });
    await audit(actor, "warrant.execute", { entity: "Warrant", entityId: warrantId });
    revalidatePath("/mandats");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}
