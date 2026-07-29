"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import { isSafeUploadName } from "@/lib/uploads";
import {
  medicalRecordSchema,
  fitnessSchema,
  emsDetailSchema,
  emsPatientSchema,
  emsPatientIdentitySchema,
  emsInterventionSchema,
} from "@/lib/validations/medical";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function safePhotoUrls(values: FormDataEntryValue[]): string[] {
  return values
    .filter((value): value is string => typeof value === "string")
    .filter((url) => {
      const filename = url.startsWith("/api/uploads/") ? url.slice("/api/uploads/".length) : "";
      return isSafeUploadName(filename);
    })
    .slice(0, 20);
}

export async function updateEmsPatientIdentity(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "medical.edit");
    const parsed = emsPatientIdentitySchema.safeParse({
      citizenId: formData.get("citizenId"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      dob: formData.get("dob"),
      gender: formData.get("gender"),
      phone: formData.get("phone") ?? "",
      address: formData.get("address") ?? "",
      postal: formData.get("postal") ?? "",
      height: formData.get("height") ?? "",
      weight: formData.get("weight") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const { citizenId, ...data } = parsed.data;
    await prisma.citizen.update({ where: { id: citizenId }, data });
    await audit(actor, "medical.patient.identity.update", { entity: "Citizen", entityId: citizenId });
    revalidatePath(`/medical/${citizenId}`);
    revalidatePath("/medical/patients");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function addMedicalPhotos(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "medical.edit");
    const citizenId = String(formData.get("citizenId"));
    const photos = safePhotoUrls(formData.getAll("photoUrls"));
    if (!citizenId) return { error: "Patient invalide." };
    if (photos.length === 0) return { error: "Ajoutez au moins une photo." };

    const citizen = await prisma.citizen.findUnique({ where: { id: citizenId }, select: { id: true } });
    if (!citizen) return { error: "Ce patient n'existe plus." };

    await prisma.medicalAttachment.createMany({
      data: photos.map((url) => ({ citizenId, url })),
    });
    await audit(actor, "medical.patient.photos.add", {
      entity: "Citizen",
      entityId: citizenId,
      metadata: { count: photos.length },
    });
    revalidatePath(`/medical/${citizenId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function createEmsPatient(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "medical.edit");

    const parsed = emsPatientSchema.safeParse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      dob: formData.get("dob"),
      gender: formData.get("gender"),
      phone: formData.get("phone") ?? "",
      address: formData.get("address") ?? "",
      postal: formData.get("postal") ?? "",
      height: formData.get("height") ?? "",
      weight: formData.get("weight") ?? "",
      hairColor: "",
      eyeColor: "",
      occupation: "",
      imageUrl: "",
      fingerprint: "",
      bloodType: formData.get("bloodType") ?? "",
      allergies: formData.get("allergies") ?? "",
      conditions: formData.get("conditions") ?? "",
      medications: formData.get("medications") ?? "",
      notes: formData.get("notes") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const { bloodType, allergies, conditions, medications, notes, ...citizenData } = parsed.data;
    const photoUrls = safePhotoUrls(formData.getAll("photoUrls"));
    const citizen = await prisma.citizen.create({
      data: {
        ...citizenData,
        isMedicalOnly: true,
        medicalRecord: {
          create: { bloodType, allergies, conditions, medications, notes },
        },
        ...(photoUrls.length > 0
          ? { medicalAttachments: { create: photoUrls.map((url) => ({ url })) } }
          : {}),
      },
    });
    await audit(actor, "medical.patient.create", { entity: "Citizen", entityId: citizen.id });
    revalidatePath("/medical/patients");
    redirect(`/medical/${citizen.id}`);
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function createEmsIntervention(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "medical.reports.create");
    const primary =
      actor.memberships.find((membership) => membership.isPrimary && membership.status === "ACTIVE") ??
      actor.memberships.find((membership) => membership.status === "ACTIVE");
    if (!primary || primary.departmentType !== "EMS") return { error: "Une affectation EMS principale est nécessaire." };

    const parsed = emsInterventionSchema.safeParse({
      patientId: formData.get("patientId"),
      title: formData.get("title"),
      location: formData.get("location"),
      occurredAt: formData.get("occurredAt"),
      triage: formData.get("triage"),
      chiefComplaint: formData.get("chiefComplaint"),
      injuries: formData.get("injuries") ?? "",
      treatment: formData.get("treatment") ?? "",
      medications: formData.get("medications") ?? "",
      outcome: formData.get("outcome"),
      hospital: formData.get("hospital") ?? "",
      arrivedAt: formData.get("arrivedAt") ?? "",
      clearedAt: formData.get("clearedAt") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const { patientId, title, location, occurredAt, ...medical } = parsed.data;
    const patientExists = await prisma.citizen.findUnique({ where: { id: patientId }, select: { id: true } });
    if (!patientExists) return { error: "Ce patient n'existe plus." };

    const photoUrls = safePhotoUrls(formData.getAll("photoUrls"));
    const report = await prisma.report.create({
      data: {
        type: "EMS_INTERVENTION",
        title,
        content: medical.chiefComplaint,
        location,
        occurredAt,
        authorId: actor.id,
        departmentId: primary.departmentId,
        status: "DRAFT",
        officers: { create: { userId: actor.id, isLead: true } },
        involvements: { create: { citizenId: patientId, role: "PATIENT" } },
        emsDetail: { create: medical },
        ...(photoUrls.length > 0
          ? {
              evidence: {
                create: photoUrls.map((url, index) => ({
                  label: `Photo EMS ${index + 1}`,
                  kind: "IMAGE" as const,
                  url,
                })),
              },
            }
          : {}),
      },
    });
    await audit(actor, "ems.intervention.create", {
      entity: "Report",
      entityId: report.id,
      metadata: { number: report.number, triage: medical.triage },
    });
    revalidatePath("/medical");
    revalidatePath("/medical/interventions");
    redirect(`/rapports/${report.id}`);
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

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
