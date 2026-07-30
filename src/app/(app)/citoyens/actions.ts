"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import { citizenSchema, citizenNoteSchema, licenseSchema } from "@/lib/validations/citizen";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function readCitizenForm(formData: FormData) {
  return citizenSchema.safeParse({
    id: formData.get("id") ?? undefined,
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dob: formData.get("dob"),
    gender: formData.get("gender"),
    height: formData.get("height") ?? "",
    weight: formData.get("weight") ?? "",
    hairColor: formData.get("hairColor") ?? "",
    eyeColor: formData.get("eyeColor") ?? "",
    address: formData.get("address") ?? "",
    postal: formData.get("postal") ?? "",
    phone: formData.get("phone") ?? "",
    occupation: formData.get("occupation") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
    fingerprint: formData.get("fingerprint") ?? "",
  });
}

export async function createCitizen(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "citizens.create");

    const parsed = readCitizenForm(formData);
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    if (parsed.data.fingerprint) {
      const existing = await prisma.citizen.findUnique({ where: { fingerprint: parsed.data.fingerprint } });
      if (existing) return { fieldErrors: { fingerprint: ["Cette empreinte est déjà associée à un citoyen."] } };
    }

    const citizen = await prisma.citizen.create({ data: parsed.data });
    await audit(actor, "citizen.create", { entity: "Citizen", entityId: citizen.id });
    revalidatePath("/citoyens");
    redirect(`/citoyens/${citizen.id}`);
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function updateCitizen(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "citizens.edit");

    const parsed = readCitizenForm(formData);
    if (!parsed.success || !parsed.data.id) return { fieldErrors: parsed.error?.flatten().fieldErrors ?? {} };

    if (parsed.data.fingerprint) {
      const clash = await prisma.citizen.findFirst({
        where: { fingerprint: parsed.data.fingerprint, NOT: { id: parsed.data.id } },
      });
      if (clash) return { fieldErrors: { fingerprint: ["Cette empreinte est déjà associée à un citoyen."] } };
    }

    await prisma.citizen.update({ where: { id: parsed.data.id }, data: parsed.data });
    await audit(actor, "citizen.update", { entity: "Citizen", entityId: parsed.data.id });
    revalidatePath(`/citoyens/${parsed.data.id}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function setCitizenDeceased(_prevState: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "citizens.edit");

  const citizenId = String(formData.get("citizenId"));
  const isDeceased = formData.get("isDeceased") === "on";

  await prisma.citizen.update({
    where: { id: citizenId },
    data: { isDeceased, deceasedAt: isDeceased ? new Date() : null },
  });
  await audit(actor, isDeceased ? "citizen.mark_deceased" : "citizen.mark_alive", {
    entity: "Citizen",
    entityId: citizenId,
  });
  revalidatePath(`/citoyens/${citizenId}`);
  return {};
}

/**
 * Ce qui rattache une fiche au reste du MDT et interdit de la supprimer.
 *
 * Les notes, licences et le dossier médical portent `onDelete: Cascade` : ils
 * appartiennent à la fiche et partent avec elle. Tout ce qui suit, non — un
 * rapport, une charge ou un mandat sont des dossiers autonomes, et effacer le
 * citoyen qu'ils citent les laisserait sans sujet. PostgreSQL refuserait de
 * toute façon (P2003) ; on compte d'abord pour pouvoir dire *pourquoi*.
 */
const CITIZEN_REFERENCES = [
  { label: "rapport", plural: "rapports", model: "reportInvolvement" },
  { label: "charge retenue", plural: "charges retenues", model: "charge" },
  { label: "mandat", plural: "mandats", model: "warrant" },
  { label: "BOLO", plural: "BOLO", model: "bolo" },
  { label: "véhicule", plural: "véhicules", model: "vehicle" },
  { label: "arme", plural: "armes", model: "weapon" },
  { label: "propriété", plural: "propriétés", model: "property" },
] as const;

async function citizenReferences(citizenId: string): Promise<string[]> {
  const [involvements, charges, warrants, bolos, vehicles, weapons, properties] = await Promise.all([
    prisma.reportInvolvement.count({ where: { citizenId } }),
    prisma.charge.count({ where: { citizenId } }),
    prisma.warrant.count({ where: { citizenId } }),
    prisma.bolo.count({ where: { citizenId } }),
    prisma.vehicle.count({ where: { ownerId: citizenId } }),
    prisma.weapon.count({ where: { ownerId: citizenId } }),
    prisma.property.count({ where: { citizenId } }),
  ]);

  const counts = [involvements, charges, warrants, bolos, vehicles, weapons, properties];
  return CITIZEN_REFERENCES.flatMap((reference, index) => {
    const count = counts[index];
    if (count === 0) return [];
    return [`${count} ${count > 1 ? reference.plural : reference.label}`];
  });
}

/**
 * Suppression définitive d'une fiche citoyen.
 *
 * Volontairement étroite : elle n'aboutit que sur une fiche que rien ne cite,
 * c'est-à-dire, en pratique, une fiche créée par erreur — doublon, faute de
 * frappe sur un nom. Dès qu'un dossier s'y rattache, le refus renvoie vers
 * l'archivage plutôt que de laisser l'agent devant un échec sec.
 */
export async function deleteCitizen(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "citizens.delete");

    const citizenId = String(formData.get("citizenId"));
    const citizen = await prisma.citizen.findUnique({
      where: { id: citizenId, isMedicalOnly: false },
      select: { firstName: true, lastName: true },
    });
    if (!citizen) return { error: "Cette fiche n'existe plus." };

    const references = await citizenReferences(citizenId);
    if (references.length > 0) {
      return {
        error:
          `Cette fiche est citée par ${references.join(", ")} : la supprimer laisserait ces dossiers ` +
          "sans sujet. Archivez-la plutôt — elle sortira des listes et de la recherche tout en restant " +
          "consultable depuis les dossiers qui la citent.",
      };
    }

    await prisma.citizen.delete({ where: { id: citizenId } });
    await audit(actor, "citizen.delete", {
      entity: "Citizen",
      entityId: citizenId,
      // La fiche n'existe plus : sans son nom dans la trace, l'entrée d'audit
      // ne dit rien de ce qui a disparu.
      metadata: { name: `${citizen.firstName} ${citizen.lastName}` },
    });
    revalidatePath("/citoyens");
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
  redirect("/citoyens");
}

/**
 * Archivage : la fiche sort des listes et de la recherche, mais reste
 * atteignable depuis les rapports, charges et mandats qui la citent. C'est la
 * primitive qui manquait — une fiche référencée ne doit jamais disparaître,
 * et un catalogue qui ne propose que « supprimer » ment sur ce qu'on peut
 * réellement faire.
 */
export async function setCitizenArchived(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "citizens.archive");

    const citizenId = String(formData.get("citizenId"));
    const archived = formData.get("archived") === "true";

    const citizen = await prisma.citizen.findUnique({
      where: { id: citizenId, isMedicalOnly: false },
      select: { id: true },
    });
    if (!citizen) return { error: "Cette fiche n'existe plus." };

    await prisma.citizen.update({
      where: { id: citizenId },
      data: { archivedAt: archived ? new Date() : null },
    });
    await audit(actor, archived ? "citizen.archive" : "citizen.unarchive", {
      entity: "Citizen",
      entityId: citizenId,
    });
    revalidatePath("/citoyens");
    revalidatePath(`/citoyens/${citizenId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function addCitizenNote(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "citizens.notes.create");

    const parsed = citizenNoteSchema.safeParse({
      citizenId: formData.get("citizenId"),
      content: formData.get("content"),
      isFlagged: formData.get("isFlagged") === "on",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const note = await prisma.citizenNote.create({
      data: { ...parsed.data, authorId: actor.id },
    });
    await audit(actor, "citizen.note.create", { entity: "CitizenNote", entityId: note.id });
    revalidatePath(`/citoyens/${parsed.data.citizenId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function deleteCitizenNote(_prevState: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "citizens.notes.delete");

  const noteId = String(formData.get("noteId"));
  const citizenId = String(formData.get("citizenId"));

  await prisma.citizenNote.delete({ where: { id: noteId } });
  await audit(actor, "citizen.note.delete", { entity: "CitizenNote", entityId: noteId });
  revalidatePath(`/citoyens/${citizenId}`);
  return {};
}

export async function addLicense(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "citizens.licenses.manage");

    const parsed = licenseSchema.safeParse({
      citizenId: formData.get("citizenId"),
      type: formData.get("type"),
      status: formData.get("status"),
      points: formData.get("points") || "0",
      issuedAt: formData.get("issuedAt"),
      expiresAt: formData.get("expiresAt") || "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const license = await prisma.license.create({ data: parsed.data });
    await audit(actor, "license.create", { entity: "License", entityId: license.id });
    revalidatePath(`/citoyens/${parsed.data.citizenId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function updateLicense(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "citizens.licenses.manage");

    const parsed = licenseSchema.safeParse({
      id: formData.get("id"),
      citizenId: formData.get("citizenId"),
      type: formData.get("type"),
      status: formData.get("status"),
      points: formData.get("points") || "0",
      issuedAt: formData.get("issuedAt"),
      expiresAt: formData.get("expiresAt") || "",
    });
    if (!parsed.success || !parsed.data.id) return { fieldErrors: parsed.error?.flatten().fieldErrors ?? {} };

    await prisma.license.update({
      where: { id: parsed.data.id },
      data: {
        type: parsed.data.type,
        status: parsed.data.status,
        points: parsed.data.points,
        issuedAt: parsed.data.issuedAt,
        expiresAt: parsed.data.expiresAt,
      },
    });
    await audit(actor, "license.update", { entity: "License", entityId: parsed.data.id });
    revalidatePath(`/citoyens/${parsed.data.citizenId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function deleteLicense(_prevState: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "citizens.licenses.manage");

  const licenseId = String(formData.get("licenseId"));
  const citizenId = String(formData.get("citizenId"));

  await prisma.license.delete({ where: { id: licenseId } });
  await audit(actor, "license.delete", { entity: "License", entityId: licenseId });
  revalidatePath(`/citoyens/${citizenId}`);
  return {};
}
