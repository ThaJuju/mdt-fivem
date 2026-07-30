"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import { propertySchema } from "@/lib/validations/property";

export type FormState = { error?: string; fieldErrors?: Record<string, string[]> };

function readPropertyForm(formData: FormData) {
  return propertySchema.safeParse({
    id: formData.get("id") ?? undefined,
    address: formData.get("address"),
    type: formData.get("type") ?? "",
    citizenId: formData.get("citizenId") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

async function isCivilCitizen(citizenId: string | undefined) {
  if (!citizenId) return true;
  return Boolean(await prisma.citizen.findUnique({
    where: { id: citizenId, isMedicalOnly: false, archivedAt: null },
    select: { id: true },
  }));
}

export async function createProperty(_state: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "properties.create");
    const parsed = readPropertyForm(formData);
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
    if (!(await isCivilCitizen(parsed.data.citizenId))) {
      return { fieldErrors: { citizenId: ["Ce propriétaire n'est pas une fiche citoyenne active."] } };
    }

    const property = await prisma.property.create({ data: parsed.data });
    await audit(actor, "property.create", { entity: "Property", entityId: property.id });
    revalidatePath("/proprietes");
    redirect(`/proprietes/${property.id}`);
  } catch (error) {
    if (error instanceof ActionError) return { error: error.message };
    throw error;
  }
}

export async function updateProperty(_state: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "properties.edit");
    const parsed = readPropertyForm(formData);
    if (!parsed.success || !parsed.data.id) {
      return { fieldErrors: parsed.error?.flatten().fieldErrors ?? {} };
    }
    if (!(await isCivilCitizen(parsed.data.citizenId))) {
      return { fieldErrors: { citizenId: ["Ce propriétaire n'est pas une fiche citoyenne active."] } };
    }

    await prisma.property.update({ where: { id: parsed.data.id }, data: parsed.data });
    await audit(actor, "property.update", { entity: "Property", entityId: parsed.data.id });
    revalidatePath("/proprietes");
    revalidatePath(`/proprietes/${parsed.data.id}`);
    return {};
  } catch (error) {
    if (error instanceof ActionError) return { error: error.message };
    throw error;
  }
}

export async function deleteProperty(_state: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "properties.delete");
    const propertyId = String(formData.get("propertyId"));
    await prisma.property.delete({ where: { id: propertyId } });
    await audit(actor, "property.delete", { entity: "Property", entityId: propertyId });
    revalidatePath("/proprietes");
    redirect("/proprietes");
  } catch (error) {
    if (error instanceof ActionError) return { error: error.message };
    throw error;
  }
}
