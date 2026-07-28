"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan, can, type Actor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import {
  reportSchema,
  involvementSchema,
  reportOfficerSchema,
  reportVehicleSchema,
  evidenceSchema,
  chargeSchema,
  chargeAmountsSchema,
  rejectReportSchema,
} from "@/lib/validations/report";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Un rapport n'est modifiable que par son auteur (`reports.edit`) ou par
 * quelqu'un disposant de `reports.edit_any`. Un rapport validé est verrouillé
 * pour tout le monde sauf `reports.edit_any`.
 */
async function assertCanEditReport(actor: Actor, reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { authorId: true, status: true },
  });
  if (!report) throw new ActionError("Ce rapport n'existe pas ou a été supprimé.");

  const isAuthor = report.authorId === actor.id;
  const canEditAny = can(actor, "reports.edit_any");

  if (!canEditAny) {
    if (!isAuthor || !can(actor, "reports.edit")) {
      throw new ActionError("Vous ne pouvez modifier que vos propres rapports.");
    }
    if (report.status === "APPROVED") {
      throw new ActionError("Ce rapport est validé : il ne peut plus être modifié.");
    }
  }
  return report;
}

export async function createReport(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "reports.create");

    const parsed = reportSchema.safeParse({
      type: formData.get("type"),
      title: formData.get("title"),
      content: formData.get("content"),
      location: formData.get("location") ?? "",
      occurredAt: formData.get("occurredAt"),
      departmentId: formData.get("departmentId"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const isMember = actor.memberships.some(
      (m) => m.departmentId === parsed.data.departmentId && m.status === "ACTIVE",
    );
    if (!isMember && !actor.isSuperAdmin) {
      return { error: "Vous ne pouvez rédiger un rapport que pour un département dont vous êtes membre." };
    }

    const report = await prisma.report.create({
      data: { ...parsed.data, authorId: actor.id, status: "DRAFT" },
    });
    // L'auteur est d'office l'agent principal du rapport.
    await prisma.reportOfficer.create({
      data: { reportId: report.id, userId: actor.id, isLead: true },
    });

    await audit(actor, "report.create", {
      entity: "Report",
      entityId: report.id,
      metadata: { number: report.number, type: report.type },
    });
    revalidatePath("/rapports");
    redirect(`/rapports/${report.id}`);
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function updateReport(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    const reportId = String(formData.get("id"));
    await assertCanEditReport(actor, reportId);

    const parsed = reportSchema.safeParse({
      id: reportId,
      type: formData.get("type"),
      title: formData.get("title"),
      content: formData.get("content"),
      location: formData.get("location") ?? "",
      occurredAt: formData.get("occurredAt"),
      departmentId: formData.get("departmentId"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const { id, ...data } = parsed.data;
    void id;
    await prisma.report.update({ where: { id: reportId }, data });
    await audit(actor, "report.update", { entity: "Report", entityId: reportId });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function deleteReport(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    const reportId = String(formData.get("reportId"));

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { authorId: true, number: true },
    });
    if (!report) return { error: "Ce rapport n'existe pas ou a déjà été supprimé." };

    const canDeleteAny = can(actor, "reports.delete_any");
    const canDeleteOwn = can(actor, "reports.delete") && report.authorId === actor.id;
    if (!canDeleteAny && !canDeleteOwn) {
      return { error: "Vous n'avez pas la permission de supprimer ce rapport." };
    }

    await prisma.report.delete({ where: { id: reportId } });
    await audit(actor, "report.delete", {
      entity: "Report",
      entityId: reportId,
      metadata: { number: report.number },
    });
    revalidatePath("/rapports");
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
  redirect("/rapports");
}

// ── Workflow de validation ─────────────────────────────────────────────

export async function submitReport(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    const reportId = String(formData.get("reportId"));
    await assertCanEditReport(actor, reportId);

    await prisma.report.update({
      where: { id: reportId },
      data: { status: "SUBMITTED", rejectReason: null },
    });
    await audit(actor, "report.submit", { entity: "Report", entityId: reportId });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function approveReport(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "reports.approve");

    const reportId = String(formData.get("reportId"));
    const report = await prisma.report.findUnique({ where: { id: reportId }, select: { authorId: true } });
    if (!report) return { error: "Ce rapport n'existe pas ou a été supprimé." };
    if (report.authorId === actor.id && !actor.isSuperAdmin) {
      return { error: "Vous ne pouvez pas valider votre propre rapport." };
    }

    await prisma.report.update({
      where: { id: reportId },
      data: { status: "APPROVED", approvedById: actor.id, approvedAt: new Date(), rejectReason: null },
    });
    await audit(actor, "report.approve", { entity: "Report", entityId: reportId });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function rejectReport(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "reports.approve");

    const parsed = rejectReportSchema.safeParse({
      reportId: formData.get("reportId"),
      rejectReason: formData.get("rejectReason"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const report = await prisma.report.findUnique({
      where: { id: parsed.data.reportId },
      select: { authorId: true },
    });
    if (!report) return { error: "Ce rapport n'existe pas ou a été supprimé." };
    if (report.authorId === actor.id && !actor.isSuperAdmin) {
      return { error: "Vous ne pouvez pas refuser votre propre rapport." };
    }

    await prisma.report.update({
      where: { id: parsed.data.reportId },
      data: {
        status: "REJECTED",
        rejectReason: parsed.data.rejectReason,
        approvedById: actor.id,
        approvedAt: new Date(),
      },
    });
    await audit(actor, "report.reject", {
      entity: "Report",
      entityId: parsed.data.reportId,
      metadata: { reason: parsed.data.rejectReason },
    });
    revalidatePath(`/rapports/${parsed.data.reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

// ── Personnes impliquées ───────────────────────────────────────────────

export async function addInvolvement(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    const reportId = String(formData.get("reportId"));
    await assertCanEditReport(actor, reportId);

    const parsed = involvementSchema.safeParse({
      reportId,
      citizenId: formData.get("citizenId"),
      role: formData.get("role"),
      statement: formData.get("statement") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    await prisma.reportInvolvement.create({ data: parsed.data });
    await audit(actor, "report.involvement.add", { entity: "Report", entityId: reportId });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function removeInvolvement(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    const reportId = String(formData.get("reportId"));
    await assertCanEditReport(actor, reportId);

    await prisma.reportInvolvement.delete({ where: { id: String(formData.get("involvementId")) } });
    await audit(actor, "report.involvement.remove", { entity: "Report", entityId: reportId });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

// ── Agents ─────────────────────────────────────────────────────────────

export async function addOfficer(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    const reportId = String(formData.get("reportId"));
    await assertCanEditReport(actor, reportId);

    const parsed = reportOfficerSchema.safeParse({
      reportId,
      userId: formData.get("userId"),
      isLead: formData.get("isLead") === "on",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const existing = await prisma.reportOfficer.findUnique({
      where: { reportId_userId: { reportId, userId: parsed.data.userId } },
    });
    if (existing) return { error: "Cet agent figure déjà sur le rapport." };

    await prisma.$transaction(async (tx) => {
      if (parsed.data.isLead) {
        await tx.reportOfficer.updateMany({ where: { reportId }, data: { isLead: false } });
      }
      await tx.reportOfficer.create({ data: parsed.data });
    });

    await audit(actor, "report.officer.add", { entity: "Report", entityId: reportId });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function removeOfficer(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    const reportId = String(formData.get("reportId"));
    await assertCanEditReport(actor, reportId);

    await prisma.reportOfficer.delete({ where: { id: String(formData.get("officerId")) } });
    await audit(actor, "report.officer.remove", { entity: "Report", entityId: reportId });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

// ── Véhicules ──────────────────────────────────────────────────────────

export async function addReportVehicle(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    const reportId = String(formData.get("reportId"));
    await assertCanEditReport(actor, reportId);

    const parsed = reportVehicleSchema.safeParse({
      reportId,
      vehicleId: formData.get("vehicleId"),
      role: formData.get("role") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    await prisma.reportVehicle.create({ data: parsed.data });
    await audit(actor, "report.vehicle.add", { entity: "Report", entityId: reportId });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function removeReportVehicle(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    const reportId = String(formData.get("reportId"));
    await assertCanEditReport(actor, reportId);

    await prisma.reportVehicle.delete({ where: { id: String(formData.get("reportVehicleId")) } });
    await audit(actor, "report.vehicle.remove", { entity: "Report", entityId: reportId });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

// ── Pièces jointes ─────────────────────────────────────────────────────

export async function addEvidence(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    const reportId = String(formData.get("reportId"));
    await assertCanEditReport(actor, reportId);

    const parsed = evidenceSchema.safeParse({
      reportId,
      label: formData.get("label"),
      description: formData.get("description") ?? "",
      kind: formData.get("kind"),
      url: formData.get("url") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const { id, ...data } = parsed.data;
    void id;
    await prisma.evidence.create({ data });
    await audit(actor, "report.evidence.add", { entity: "Report", entityId: reportId });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function removeEvidence(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    const reportId = String(formData.get("reportId"));
    await assertCanEditReport(actor, reportId);

    await prisma.evidence.delete({ where: { id: String(formData.get("evidenceId")) } });
    await audit(actor, "report.evidence.remove", { entity: "Report", entityId: reportId });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

// ── Charges ────────────────────────────────────────────────────────────

export async function addCharge(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "charges.manage");
    const reportId = String(formData.get("reportId"));
    await assertCanEditReport(actor, reportId);

    const parsed = chargeSchema.safeParse({
      reportId,
      citizenId: formData.get("citizenId"),
      offenseId: formData.get("offenseId"),
      count: formData.get("count") || "1",
      isGuilty: formData.get("isGuilty") !== "off",
      isPaid: false,
      notes: formData.get("notes") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const offense = await prisma.offense.findUnique({ where: { id: parsed.data.offenseId } });
    if (!offense) return { error: "Cette infraction n'existe plus dans le code pénal." };

    // Le barème est figé ici : copié depuis l'infraction, jamais relu ensuite.
    await prisma.charge.create({
      data: {
        reportId,
        citizenId: parsed.data.citizenId,
        offenseId: offense.id,
        count: parsed.data.count,
        fine: offense.fine,
        jailMinutes: offense.jailMinutes,
        points: offense.points,
        isGuilty: parsed.data.isGuilty,
        isPaid: false,
        notes: parsed.data.notes,
      },
    });

    await audit(actor, "charge.add", {
      entity: "Report",
      entityId: reportId,
      metadata: { offenseCode: offense.code, count: parsed.data.count },
    });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function updateCharge(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "charges.manage");
    const reportId = String(formData.get("reportId"));
    await assertCanEditReport(actor, reportId);

    const parsed = chargeAmountsSchema.safeParse({
      id: formData.get("id"),
      reportId,
      fine: formData.get("fine") || "0",
      jailMinutes: formData.get("jailMinutes") || "0",
      points: formData.get("points") || "0",
      count: formData.get("count") || "1",
      isGuilty: formData.get("isGuilty") === "on",
      isPaid: formData.get("isPaid") === "on",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const data: Prisma.ChargeUpdateInput = {
      fine: parsed.data.fine,
      jailMinutes: parsed.data.jailMinutes,
      points: parsed.data.points,
      count: parsed.data.count,
      isGuilty: parsed.data.isGuilty,
      isPaid: parsed.data.isPaid,
    };
    await prisma.charge.update({ where: { id: parsed.data.id }, data });
    await audit(actor, "charge.update", { entity: "Charge", entityId: parsed.data.id });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function removeCharge(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "charges.manage");
    const reportId = String(formData.get("reportId"));
    await assertCanEditReport(actor, reportId);

    await prisma.charge.delete({ where: { id: String(formData.get("chargeId")) } });
    await audit(actor, "charge.remove", { entity: "Report", entityId: reportId });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}
