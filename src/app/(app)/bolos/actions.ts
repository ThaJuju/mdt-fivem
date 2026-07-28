"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import { boloSchema } from "@/lib/validations/warrant";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function saveBolo(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "bolos.manage");

    const parsed = boloSchema.safeParse({
      id: formData.get("id") ?? undefined,
      type: formData.get("type"),
      title: formData.get("title"),
      description: formData.get("description"),
      citizenId: formData.get("citizenId") ?? "",
      vehicleId: formData.get("vehicleId") ?? "",
      plate: formData.get("plate") ?? "",
      imageUrl: formData.get("imageUrl") ?? "",
      expiresAt: formData.get("expiresAt") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const { id, ...data } = parsed.data;
    if (id) {
      await prisma.bolo.update({ where: { id }, data });
      await audit(actor, "bolo.update", { entity: "Bolo", entityId: id });
    } else {
      const created = await prisma.bolo.create({ data: { ...data, createdById: actor.id, isActive: true } });
      await audit(actor, "bolo.create", { entity: "Bolo", entityId: created.id });
    }

    revalidatePath("/bolos");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function closeBolo(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "bolos.manage");

    const boloId = String(formData.get("boloId"));
    await prisma.bolo.update({ where: { id: boloId }, data: { isActive: false } });
    await audit(actor, "bolo.close", { entity: "Bolo", entityId: boloId });
    revalidatePath("/bolos");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function reopenBolo(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "bolos.manage");

    const boloId = String(formData.get("boloId"));
    // Rouvrir un BOLO périmé remet aussi son échéance à zéro, sinon
    // l'expiration paresseuse le refermerait aussitôt.
    await prisma.bolo.update({ where: { id: boloId }, data: { isActive: true, expiresAt: null } });
    await audit(actor, "bolo.reopen", { entity: "Bolo", entityId: boloId });
    revalidatePath("/bolos");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function deleteBolo(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "bolos.manage");

    const boloId = String(formData.get("boloId"));
    await prisma.bolo.delete({ where: { id: boloId } });
    await audit(actor, "bolo.delete", { entity: "Bolo", entityId: boloId });
    revalidatePath("/bolos");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}
