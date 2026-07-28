"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import { vehicleSchema } from "@/lib/validations/vehicle";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function readVehicleForm(formData: FormData) {
  return vehicleSchema.safeParse({
    id: formData.get("id") ?? undefined,
    plate: formData.get("plate"),
    make: formData.get("make"),
    model: formData.get("model"),
    color: formData.get("color") ?? "",
    class: formData.get("class") ?? "",
    vin: formData.get("vin") ?? "",
    ownerId: formData.get("ownerId") ?? "",
    registration: formData.get("registration"),
    insurance: formData.get("insurance"),
    isImpounded: formData.get("isImpounded") === "on",
    notes: formData.get("notes") ?? "",
    imageUrl: formData.get("imageUrl") ?? "",
  });
}

export async function createVehicle(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "vehicles.create");

    const parsed = readVehicleForm(formData);
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const existing = await prisma.vehicle.findUnique({ where: { plate: parsed.data.plate } });
    if (existing) return { fieldErrors: { plate: ["Cette plaque est déjà enregistrée."] } };

    const vehicle = await prisma.vehicle.create({ data: parsed.data });
    await audit(actor, "vehicle.create", { entity: "Vehicle", entityId: vehicle.id });
    revalidatePath("/vehicules");
    redirect(`/vehicules/${vehicle.id}`);
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function updateVehicle(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "vehicles.edit");

    const parsed = readVehicleForm(formData);
    if (!parsed.success || !parsed.data.id) return { fieldErrors: parsed.error?.flatten().fieldErrors ?? {} };

    const clash = await prisma.vehicle.findFirst({
      where: { plate: parsed.data.plate, NOT: { id: parsed.data.id } },
    });
    if (clash) return { fieldErrors: { plate: ["Cette plaque est déjà enregistrée."] } };

    await prisma.vehicle.update({ where: { id: parsed.data.id }, data: parsed.data });
    await audit(actor, "vehicle.update", { entity: "Vehicle", entityId: parsed.data.id });
    revalidatePath(`/vehicules/${parsed.data.id}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function setVehicleStolen(_prevState: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "vehicles.flag_stolen");

  const vehicleId = String(formData.get("vehicleId"));
  const isStolen = formData.get("isStolen") === "on";

  await prisma.vehicle.update({ where: { id: vehicleId }, data: { isStolen } });
  await audit(actor, isStolen ? "vehicle.flag_stolen" : "vehicle.unflag_stolen", {
    entity: "Vehicle",
    entityId: vehicleId,
  });
  revalidatePath(`/vehicules/${vehicleId}`);
  return {};
}

export async function deleteVehicle(_prevState: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "vehicles.delete");

  const vehicleId = String(formData.get("vehicleId"));
  await prisma.vehicle.delete({ where: { id: vehicleId } });
  await audit(actor, "vehicle.delete", { entity: "Vehicle", entityId: vehicleId });
  revalidatePath("/vehicules");
  redirect("/vehicules");
}
