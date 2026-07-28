"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import { weaponSchema } from "@/lib/validations/weapon";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function readWeaponForm(formData: FormData) {
  return weaponSchema.safeParse({
    id: formData.get("id") ?? undefined,
    serialNumber: formData.get("serialNumber"),
    model: formData.get("model"),
    type: formData.get("type") ?? "",
    ownerId: formData.get("ownerId") ?? "",
    isStolen: formData.get("isStolen") === "on",
  });
}

export async function createWeapon(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "weapons.manage");

    const parsed = readWeaponForm(formData);
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const existing = await prisma.weapon.findUnique({ where: { serialNumber: parsed.data.serialNumber } });
    if (existing) return { fieldErrors: { serialNumber: ["Ce numéro de série est déjà enregistré."] } };

    const weapon = await prisma.weapon.create({ data: parsed.data });
    await audit(actor, "weapon.create", { entity: "Weapon", entityId: weapon.id });
    revalidatePath("/armes");
    redirect(`/armes/${weapon.id}`);
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function updateWeapon(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "weapons.manage");

    const parsed = readWeaponForm(formData);
    if (!parsed.success || !parsed.data.id) return { fieldErrors: parsed.error?.flatten().fieldErrors ?? {} };

    const clash = await prisma.weapon.findFirst({
      where: { serialNumber: parsed.data.serialNumber, NOT: { id: parsed.data.id } },
    });
    if (clash) return { fieldErrors: { serialNumber: ["Ce numéro de série est déjà enregistré."] } };

    await prisma.weapon.update({ where: { id: parsed.data.id }, data: parsed.data });
    await audit(actor, "weapon.update", { entity: "Weapon", entityId: parsed.data.id });
    revalidatePath(`/armes/${parsed.data.id}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function deleteWeapon(_prevState: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "weapons.manage");

  const weaponId = String(formData.get("weaponId"));
  await prisma.weapon.delete({ where: { id: weaponId } });
  await audit(actor, "weapon.delete", { entity: "Weapon", entityId: weaponId });
  revalidatePath("/armes");
  redirect("/armes");
}
