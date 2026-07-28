"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import { penalCategorySchema, offenseSchema } from "@/lib/validations/penalcode";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function saveCategory(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "penalcode.edit");

    const parsed = penalCategorySchema.safeParse({
      id: formData.get("id") ?? undefined,
      name: formData.get("name"),
      order: formData.get("order") ?? "0",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const clash = await prisma.penalCategory.findFirst({
      where: { name: parsed.data.name, ...(parsed.data.id ? { NOT: { id: parsed.data.id } } : {}) },
    });
    if (clash) return { fieldErrors: { name: ["Cette catégorie existe déjà."] } };

    if (parsed.data.id) {
      await prisma.penalCategory.update({
        where: { id: parsed.data.id },
        data: { name: parsed.data.name, order: parsed.data.order },
      });
      await audit(actor, "penalcategory.update", { entity: "PenalCategory", entityId: parsed.data.id });
    } else {
      const created = await prisma.penalCategory.create({
        data: { name: parsed.data.name, order: parsed.data.order },
      });
      await audit(actor, "penalcategory.create", { entity: "PenalCategory", entityId: created.id });
    }

    revalidatePath("/code-penal");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function deleteCategory(_prevState: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "penalcode.edit");

  const id = String(formData.get("id"));
  const offenseCount = await prisma.offense.count({ where: { categoryId: id } });
  if (offenseCount > 0) {
    return { error: "Impossible de supprimer une catégorie qui contient encore des infractions." };
  }

  await prisma.penalCategory.delete({ where: { id } });
  await audit(actor, "penalcategory.delete", { entity: "PenalCategory", entityId: id });
  revalidatePath("/code-penal");
  return {};
}

export async function saveOffense(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "penalcode.edit");

    const parsed = offenseSchema.safeParse({
      id: formData.get("id") ?? undefined,
      code: formData.get("code"),
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      categoryId: formData.get("categoryId"),
      type: formData.get("type"),
      fine: formData.get("fine") || "0",
      jailMinutes: formData.get("jailMinutes") || "0",
      points: formData.get("points") || "0",
      bail: formData.get("bail") ?? "",
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const clash = await prisma.offense.findFirst({
      where: { code: parsed.data.code, ...(parsed.data.id ? { NOT: { id: parsed.data.id } } : {}) },
    });
    if (clash) return { fieldErrors: { code: ["Ce code d'infraction existe déjà."] } };

    const { id, ...data } = parsed.data;
    if (id) {
      await prisma.offense.update({ where: { id }, data });
      await audit(actor, "offense.update", { entity: "Offense", entityId: id, metadata: { code: data.code } });
    } else {
      const created = await prisma.offense.create({ data });
      await audit(actor, "offense.create", {
        entity: "Offense",
        entityId: created.id,
        metadata: { code: data.code },
      });
    }

    revalidatePath("/code-penal");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function deleteOffense(_prevState: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "penalcode.edit");

  const id = String(formData.get("id"));
  const chargeCount = await prisma.charge.count({ where: { offenseId: id } });
  if (chargeCount > 0) {
    return {
      error:
        "Cette infraction est utilisée dans des rapports existants. Désactivez-la plutôt que de la supprimer : les rapports passés conservent leur barème.",
    };
  }

  await prisma.offense.delete({ where: { id } });
  await audit(actor, "offense.delete", { entity: "Offense", entityId: id });
  revalidatePath("/code-penal");
  return {};
}
