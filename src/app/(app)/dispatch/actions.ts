"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import { broadcastDispatchUpdate } from "@/lib/realtime";
import {
  callSchema,
  callStatusSchema,
  closeCallSchema,
  callLogSchema,
  unitSchema,
  unitStatusSchema,
  assignUnitSchema,
} from "@/lib/validations/dispatch";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/** Rafraîchit la page et prévient les autres postes. */
function syncDispatch() {
  revalidatePath("/dispatch");
  broadcastDispatchUpdate();
}

function parseTags(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

// ── Appels ─────────────────────────────────────────────────────────────

export async function createCall(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "dispatch.calls.create");

    const parsed = callSchema.safeParse({
      source: formData.get("source"),
      code: formData.get("code") ?? "",
      priority: formData.get("priority") || "3",
      title: formData.get("title"),
      description: formData.get("description") ?? "",
      location: formData.get("location"),
      postal: formData.get("postal") ?? "",
      callerName: formData.get("callerName") ?? "",
      callerPhone: formData.get("callerPhone") ?? "",
      tags: parseTags(formData.get("tags")),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const { id, ...data } = parsed.data;
    void id;
    const call = await prisma.call.create({ data: { ...data, status: "PENDING" } });
    await prisma.callLog.create({
      data: { callId: call.id, authorId: actor.id, message: "Appel créé." },
    });

    await audit(actor, "call.create", {
      entity: "Call",
      entityId: call.id,
      metadata: { number: call.number },
    });
    syncDispatch();
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function updateCallStatus(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "dispatch.calls.edit");

    const parsed = callStatusSchema.safeParse({
      callId: formData.get("callId"),
      status: formData.get("status"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    if (parsed.data.status === "CLOSED") {
      return { error: "Utilisez la clôture d'appel pour fermer un appel." };
    }

    await prisma.call.update({
      where: { id: parsed.data.callId },
      data: { status: parsed.data.status },
    });
    await prisma.callLog.create({
      data: {
        callId: parsed.data.callId,
        authorId: actor.id,
        message: `Statut passé à ${parsed.data.status}.`,
      },
    });

    await audit(actor, "call.status", { entity: "Call", entityId: parsed.data.callId });
    syncDispatch();
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function closeCall(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "dispatch.calls.close");

    const parsed = closeCallSchema.safeParse({
      callId: formData.get("callId"),
      closeNote: formData.get("closeNote") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    await prisma.$transaction(async (tx) => {
      await tx.call.update({
        where: { id: parsed.data.callId },
        data: { status: "CLOSED", closedAt: new Date(), closeNote: parsed.data.closeNote },
      });
      // Les unités engagées redeviennent disponibles.
      const assignments = await tx.callUnit.findMany({
        where: { callId: parsed.data.callId },
        select: { unitId: true },
      });
      if (assignments.length > 0) {
        await tx.unit.updateMany({
          where: { id: { in: assignments.map((a) => a.unitId) }, status: { not: "OFF_DUTY" } },
          data: { status: "AVAILABLE" },
        });
        await tx.callUnit.deleteMany({ where: { callId: parsed.data.callId } });
      }
      await tx.callLog.create({
        data: {
          callId: parsed.data.callId,
          authorId: actor.id,
          message: parsed.data.closeNote ? `Appel clôturé : ${parsed.data.closeNote}` : "Appel clôturé.",
        },
      });
    });

    await audit(actor, "call.close", { entity: "Call", entityId: parsed.data.callId });
    syncDispatch();
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function addCallLog(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "dispatch.view");

    const parsed = callLogSchema.safeParse({
      callId: formData.get("callId"),
      message: formData.get("message"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    await prisma.callLog.create({ data: { ...parsed.data, authorId: actor.id } });
    syncDispatch();
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

// ── Unités ─────────────────────────────────────────────────────────────

export async function createUnit(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "dispatch.units.manage");

    const parsed = unitSchema.safeParse({
      callsign: formData.get("callsign"),
      type: formData.get("type"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const unit = await prisma.unit.create({
      data: { callsign: parsed.data.callsign, type: parsed.data.type, status: "AVAILABLE" },
    });
    await audit(actor, "unit.create", { entity: "Unit", entityId: unit.id });
    syncDispatch();
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function setUnitStatus(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "dispatch.view");

    const parsed = unitStatusSchema.safeParse({
      unitId: formData.get("unitId"),
      status: formData.get("status"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    // Un agent change le statut de sa propre unité ; gérer celle des autres
    // demande dispatch.units.manage.
    const membership = await prisma.unitMember.findUnique({
      where: { unitId_userId: { unitId: parsed.data.unitId, userId: actor.id } },
    });
    if (!membership) assertCan(actor, "dispatch.units.manage");

    await prisma.unit.update({ where: { id: parsed.data.unitId }, data: { status: parsed.data.status } });
    await audit(actor, "unit.status", {
      entity: "Unit",
      entityId: parsed.data.unitId,
      metadata: { status: parsed.data.status },
    });
    syncDispatch();
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function joinUnit(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "dispatch.view");

    const unitId = String(formData.get("unitId"));
    const existing = await prisma.unitMember.findUnique({
      where: { unitId_userId: { unitId, userId: actor.id } },
    });
    if (existing) return { error: "Vous êtes déjà dans cette unité." };

    await prisma.$transaction(async (tx) => {
      // Un agent n'appartient qu'à une unité à la fois.
      await tx.unitMember.deleteMany({ where: { userId: actor.id } });
      const memberCount = await tx.unitMember.count({ where: { unitId } });
      await tx.unitMember.create({
        data: { unitId, userId: actor.id, isLead: memberCount === 0 },
      });
    });

    await audit(actor, "unit.join", { entity: "Unit", entityId: unitId });
    syncDispatch();
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function leaveUnit(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "dispatch.view");

    const unitId = String(formData.get("unitId"));
    await prisma.unitMember.deleteMany({ where: { unitId, userId: actor.id } });
    await audit(actor, "unit.leave", { entity: "Unit", entityId: unitId });
    syncDispatch();
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function deleteUnit(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "dispatch.units.manage");

    const unitId = String(formData.get("unitId"));
    await prisma.unit.delete({ where: { id: unitId } });
    await audit(actor, "unit.delete", { entity: "Unit", entityId: unitId });
    syncDispatch();
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

// ── Affectation ────────────────────────────────────────────────────────

export async function assignUnit(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "dispatch.units.assign");

    const parsed = assignUnitSchema.safeParse({
      callId: formData.get("callId"),
      unitId: formData.get("unitId"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const existing = await prisma.callUnit.findUnique({
      where: { callId_unitId: { callId: parsed.data.callId, unitId: parsed.data.unitId } },
    });
    if (existing) return { error: "Cette unité est déjà engagée sur cet appel." };

    const unit = await prisma.unit.findUnique({ where: { id: parsed.data.unitId } });
    if (!unit) return { error: "Cette unité n'existe plus." };

    await prisma.$transaction(async (tx) => {
      await tx.callUnit.create({ data: { callId: parsed.data.callId, unitId: parsed.data.unitId } });
      await tx.unit.update({ where: { id: parsed.data.unitId }, data: { status: "EN_ROUTE" } });
      await tx.call.update({
        where: { id: parsed.data.callId },
        data: { status: "ASSIGNED" },
      });
      await tx.callLog.create({
        data: {
          callId: parsed.data.callId,
          authorId: actor.id,
          message: `Unité ${unit.callsign} engagée.`,
        },
      });
    });

    await audit(actor, "call.assign", { entity: "Call", entityId: parsed.data.callId });
    syncDispatch();
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function unassignUnit(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "dispatch.units.assign");

    const callId = String(formData.get("callId"));
    const unitId = String(formData.get("unitId"));
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });

    await prisma.$transaction(async (tx) => {
      await tx.callUnit.deleteMany({ where: { callId, unitId } });
      await tx.unit.updateMany({
        where: { id: unitId, status: { not: "OFF_DUTY" } },
        data: { status: "AVAILABLE" },
      });
      await tx.callLog.create({
        data: {
          callId,
          authorId: actor.id,
          message: `Unité ${unit?.callsign ?? ""} désengagée.`.trim(),
        },
      });
    });

    await audit(actor, "call.unassign", { entity: "Call", entityId: callId });
    syncDispatch();
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}
