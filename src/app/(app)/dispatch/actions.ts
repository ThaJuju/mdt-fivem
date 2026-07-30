"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import { broadcastDispatchUpdate, broadcastPanic } from "@/lib/realtime";
import {
  callSchema,
  callStatusSchema,
  closeCallSchema,
  callLogSchema,
  unitSchema,
  unitStatusSchema,
  assignUnitSchema,
  unitTypeSchema,
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

function actorDepartment(actor: Awaited<ReturnType<typeof requireActor>>) {
  const active = actor.memberships.filter((membership) => membership.status === "ACTIVE");
  return active.find((membership) => membership.isPrimary) ?? active[0];
}

// ── Appels ─────────────────────────────────────────────────────────────

export async function createCall(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "dispatch.calls.create");
    const current = actorDepartment(actor);
    if (!current) return { error: "Aucun service principal actif." };

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
      // Le service vient exclusivement de la session : le client ne peut ni
      // choisir ni falsifier le service responsable de l'appel.
      departmentIds: [current.departmentId],
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const allowedDepartment = await prisma.department.findFirst({
      where: { id: current.departmentId, isActive: true, type: { in: ["POLICE", "EMS"] } },
      select: { id: true },
    });
    if (!allowedDepartment) return { error: "Votre service ne peut pas recevoir d'appels dispatch." };

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

    // Clôturer un appel remet ses unités en disponible : si l'une d'elles
    // était en 10-99, l'alerte tombe et les autres postes doivent le savoir.
    const clearedPanics: string[] = [];

    await prisma.$transaction(async (tx) => {
      await tx.call.update({
        where: { id: parsed.data.callId },
        data: { status: "CLOSED", closedAt: new Date(), closeNote: parsed.data.closeNote },
      });
      // Les unités engagées redeviennent disponibles.
      const assignments = await tx.callUnit.findMany({
        where: { callId: parsed.data.callId },
        select: { unitId: true, unit: { select: { status: true } } },
      });
      for (const assignment of assignments) {
        if (assignment.unit.status === "PANIC") clearedPanics.push(assignment.unitId);
      }
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
    for (const unitId of clearedPanics) broadcastPanic(unitId);
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
      typeId: formData.get("typeId"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const membership = actorDepartment(actor);
    if (!membership) return { error: "Aucun service principal actif." };
    const type = await prisma.unitType.findFirst({
      where: { id: parsed.data.typeId, departmentId: membership.departmentId, isActive: true },
    });
    if (!type) return { fieldErrors: { typeId: ["Ce type n'appartient pas à votre service."] } };
    const duplicate = await prisma.unit.findUnique({
      where: { departmentId_callsign: { departmentId: membership.departmentId, callsign: parsed.data.callsign } },
    });
    if (duplicate) return { fieldErrors: { callsign: ["Cet indicatif existe déjà dans votre service."] } };

    const unit = await prisma.unit.create({
      data: {
        callsign: parsed.data.callsign,
        typeId: type.id,
        departmentId: membership.departmentId,
        status: "AVAILABLE",
      },
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

    const before = await prisma.unit.findUnique({
      where: { id: parsed.data.unitId },
      select: { status: true, departmentId: true },
    });
    if (!before) return { error: "Cette unité n'existe plus." };
    const current = actorDepartment(actor);
    if (!actor.isSuperAdmin && before.departmentId !== current?.departmentId) {
      return { error: "Vous ne pouvez pas commander une unité d'un autre service." };
    }

    await prisma.unit.update({ where: { id: parsed.data.unitId }, data: { status: parsed.data.status } });
    await audit(actor, "unit.status", {
      entity: "Unit",
      entityId: parsed.data.unitId,
      // L'ancien statut est ce qui permet de relire un 10-99 après coup : sa
      // levée est aussi datée que son déclenchement.
      metadata: { from: before.status, status: parsed.data.status },
    });
    syncDispatch();
    // Déclenchement comme levée : dans les deux cas, les postes qui ne
    // regardent pas le dispatch doivent voir le bandeau apparaître ou partir.
    if (parsed.data.status === "PANIC" || before.status === "PANIC") {
      broadcastPanic(parsed.data.unitId);
    }
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
    const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { departmentId: true } });
    if (!unit) return { error: "Cette unité n'existe plus." };
    const membership = actorDepartment(actor);
    if (!membership || unit.departmentId !== membership.departmentId) {
      return { error: "Vous ne pouvez rejoindre qu'une unité de votre service principal." };
    }
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
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      select: { status: true, departmentId: true },
    });
    const current = actorDepartment(actor);
    if (!unit) return { error: "Cette unité n'existe plus." };
    if (!actor.isSuperAdmin && unit.departmentId !== current?.departmentId) {
      return { error: "Vous ne pouvez pas supprimer une unité d'un autre service." };
    }
    await prisma.unit.delete({ where: { id: unitId } });
    await audit(actor, "unit.delete", { entity: "Unit", entityId: unitId });
    syncDispatch();
    // Supprimer une unité en 10-99 lève l'alerte : sans ce signal, le bandeau
    // resterait affiché sur les postes jusqu'à leur prochaine navigation.
    if (unit?.status === "PANIC") broadcastPanic(unitId);
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
    const call = await prisma.call.findUnique({
      where: { id: parsed.data.callId },
      select: { departmentIds: true },
    });
    if (!call) return { error: "Cet appel n'existe plus." };
    const current = actorDepartment(actor);
    if (!call.departmentIds.includes(unit.departmentId)) {
      return { error: "Le service de cette unité n'est pas concerné par cet appel." };
    }
    if (!actor.isSuperAdmin && current && !call.departmentIds.includes(current.departmentId)) {
      return { error: "Votre service n'est pas concerné par cet appel." };
    }

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

export async function createUnitType(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "dispatch.units.manage");
    const parsed = unitTypeSchema.safeParse({ name: formData.get("name") });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
    const membership = actorDepartment(actor);
    if (!membership) return { error: "Aucun service principal actif." };
    const existing = await prisma.unitType.findUnique({
      where: { departmentId_name: { departmentId: membership.departmentId, name: parsed.data.name } },
    });
    if (existing) return { fieldErrors: { name: ["Ce type existe déjà dans votre service."] } };
    const type = await prisma.unitType.create({
      data: { name: parsed.data.name, departmentId: membership.departmentId },
    });
    await audit(actor, "unittype.create", { entity: "UnitType", entityId: type.id });
    syncDispatch();
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function deleteUnitType(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "dispatch.units.manage");
    const id = String(formData.get("typeId"));
    const membership = actorDepartment(actor);
    const type = await prisma.unitType.findUnique({
      where: { id },
      include: { _count: { select: { units: true } } },
    });
    if (!type || (!actor.isSuperAdmin && type.departmentId !== membership?.departmentId)) {
      return { error: "Ce type n'appartient pas à votre service." };
    }
    if (type._count.units > 0) return { error: "Ce type est encore utilisé par une unité." };
    await prisma.unitType.delete({ where: { id } });
    await audit(actor, "unittype.delete", { entity: "UnitType", entityId: id });
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
    const call = await prisma.call.findUnique({ where: { id: callId }, select: { departmentIds: true } });
    const current = actorDepartment(actor);
    if (!unit || !call) return { error: "L'appel ou l'unité n'existe plus." };
    if (!actor.isSuperAdmin && unit.departmentId !== current?.departmentId) {
      return { error: "Vous ne pouvez pas désengager une unité d'un autre service." };
    }
    if (!call.departmentIds.includes(unit.departmentId)) {
      return { error: "Le service de cette unité n'est pas concerné par cet appel." };
    }

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
