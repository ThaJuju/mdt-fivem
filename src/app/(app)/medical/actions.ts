"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan } from "@/lib/auth";
import { assertCanEditReport } from "@/lib/reports";
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
  values?: Record<string, string>;
};

/**
 * Une clause `where` étendue (ex. `{ id, isMedicalOnly: true }`) qui ne
 * correspond à rien fait lever P2025 à Prisma. C'est ce qui referme la porte,
 * mais sans ce test l'erreur remonterait en 500 illisible au lieu du message
 * français attendu par le formulaire.
 */
function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

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
    /**
     * `isMedicalOnly: true` fait partie de la clause, ce n'est pas un
     * raccourci de requête : l'identité d'un citoyen n'appartient qu'au
     * service qui tient son fichier. Un patient créé côté EMS est à nous ; la
     * fiche d'un citoyen du fichier police ne l'est pas, et l'EMS n'a pas à
     * réécrire le nom, la date de naissance ou l'adresse d'un suspect sous
     * mandat. Sans cette clause, `medical.edit` suffisait à le faire.
     */
    try {
      await prisma.citizen.update({ where: { id: citizenId, isMedicalOnly: true }, data });
    } catch (err) {
      if (isRecordNotFound(err)) {
        return {
          error:
            "Cette fiche appartient au fichier police : son identité doit être modifiée depuis le module citoyens.",
        };
      }
      throw err;
    }
    await audit(actor, "medical.patient.identity.update", {
      entity: "Citizen",
      entityId: citizenId,
      metadata: { fields: Object.keys(data) },
    });
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
  const values = Object.fromEntries(
    [
      "patientId",
      "title",
      "location",
      "occurredAt",
      "triage",
      "chiefComplaint",
      "injuries",
      "treatment",
      "medications",
      "outcome",
      "hospital",
      "arrivedAt",
      "clearedAt",
    ].map((field) => [field, String(formData.get(field) ?? "")]),
  );

  try {
    const actor = await requireActor();
    assertCan(actor, "medical.reports.create");
    const primary =
      actor.memberships.find((membership) => membership.isPrimary && membership.status === "ACTIVE") ??
      actor.memberships.find((membership) => membership.status === "ACTIVE");
    if (!primary || primary.departmentType !== "EMS") {
      return { error: "Une affectation EMS principale est nécessaire.", values };
    }

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
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, values };

    const { patientId, title, location, occurredAt, ...medical } = parsed.data;
    const patientExists = await prisma.citizen.findUnique({ where: { id: patientId }, select: { id: true } });
    if (!patientExists) return { error: "Ce patient n'existe plus.", values };

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
    if (err instanceof ActionError) return { error: err.message, values };
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
    // Sans ce contrôle, un identifiant inexistant faisait échouer la clé
    // étrangère de l'upsert et remontait en 500 au lieu d'un message lisible.
    const citizen = await prisma.citizen.findUnique({ where: { id: citizenId }, select: { id: true } });
    if (!citizen) return { error: "Ce patient n'existe plus." };

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

    const patient = await prisma.citizen.findUnique({
      where: { id: parsed.data.citizenId },
      select: { id: true },
    });
    if (!patient) return { error: "Ce patient n'existe plus." };

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

    /**
     * Même porte que le module police : le volet médical d'une intervention
     * est une modification de rapport, pas une action à part. Sans ce
     * contrôle, `medical.reports.create` — que porte tout ambulancier
     * autorisé à rédiger — suffisait à réécrire le triage, le traitement et
     * l'issue de l'intervention d'un collègue, sur un rapport auquel on n'a
     * pas participé.
     */
    const report = await assertCanEditReport(actor, parsed.data.reportId);
    if (report.type !== "EMS_INTERVENTION") {
      return { error: "Ce rapport n'est pas une intervention médicale : il n'a pas de volet EMS." };
    }

    const { reportId, ...data } = parsed.data;
    const previous = await prisma.emsDetail.findUnique({
      where: { reportId },
      select: { triage: true, outcome: true },
    });

    await prisma.emsDetail.upsert({
      where: { reportId },
      update: data,
      create: { reportId, ...data },
    });

    // Sur une donnée médicale, savoir *ce qui* a changé vaut mieux que savoir
    // qu'il y a eu changement : le triage et l'issue sont ce qui se conteste.
    await audit(actor, "ems.detail.save", {
      entity: "Report",
      entityId: reportId,
      metadata: {
        triage: { from: previous?.triage ?? null, to: data.triage },
        outcome: { from: previous?.outcome ?? null, to: data.outcome },
      },
    });
    revalidatePath(`/rapports/${reportId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}
