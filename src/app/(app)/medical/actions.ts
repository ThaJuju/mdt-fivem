"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import { medicalRecordSchema, fitnessSchema, emsDetailSchema } from "@/lib/validations/medical";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function saveMedicalRecord(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "medical.edit");

    const parsed = medicalRecordSchema.safeParse({
      citizenId: formData.get("citizenId"),
      bloodType: formData.get("bloodType") ?? "",
      allergies: formData.get("allergies") ?? "",
      conditions: formData.get("conditions") ?? "",
      medications: formData.get("medications") ?? "",
      notes: formData.get("notes") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const { citizenId, ...data } = parsed.data;
    await prisma.medicalRecord.upsert({
      where: { citizenId },
      update: data,
      create: { citizenId, ...data },
    });

    await audit(actor, "medical.update", { entity: "Citizen", entityId: citizenId });
    revalidatePath(`/medical/${citizenId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

/**
 * Délivrance d'aptitude médicale : c'est ce qui permet au service de police
 * de valider un permis de port d'arme, d'où une permission dédiée
 * (`medical.fitness.certify`) distincte de la simple édition du dossier.
 */
export async function certifyFitness(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "medical.fitness.certify");

    const parsed = fitnessSchema.safeParse({
      citizenId: formData.get("citizenId"),
      fitness: formData.get("fitness"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const isFitForDuty =
      parsed.data.fitness === "yes" ? true : parsed.data.fitness === "no" ? false : null;

    await prisma.medicalRecord.upsert({
      where: { citizenId: parsed.data.citizenId },
      update: { isFitForDuty },
      create: {
        citizenId: parsed.data.citizenId,
        isFitForDuty,
        allergies: [],
        conditions: [],
        medications: [],
      },
    });

    await audit(actor, "medical.fitness", {
      entity: "Citizen",
      entityId: parsed.data.citizenId,
      metadata: { isFitForDuty },
    });
    revalidatePath(`/medical/${parsed.data.citizenId}`);
    revalidatePath(`/citoyens/${parsed.data.citizenId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

/** Détail EMS d'un rapport d'intervention (relation 1-1 avec `Report`). */
export async function saveEmsDetail(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "medical.reports.create");

    const parsed = emsDetailSchema.safeParse({
      reportId: formData.get("reportId"),
      triage: formData.get("triage"),
      chiefComplaint: formData.get("chiefComplaint") ?? "",
      injuries: formData.get("injuries") ?? "",
      treatment: formData.get("treatment") ?? "",
      medications: formData.get("medications") ?? "",
      outcome: formData.get("outcome"),
      hospital: formData.get("hospital") ?? "",
      arrivedAt: formData.get("arrivedAt") ?? "",
      clearedAt: formData.get("clearedAt") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const report = await prisma.report.findUnique({
      where: { id: parsed.data.reportId },
      select: { authorId: true, status: true },
    });
    if (!report) return { error: "Ce rapport n'existe pas ou a été supprimé." };
    if (report.status === "APPROVED" && !actor.isSuperAdmin) {
      return { error: "Ce rapport est validé : son volet médical ne peut plus être modifié." };
    }

    const { reportId, ...data } = parsed.data;
    await prisma.emsDetail.upsert({
      where: { reportId },
      update: data,
      create: { reportId, ...data },
    });

    await audit(actor, "ems.detail.save", { entity: "Report", entityId: reportId });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}
