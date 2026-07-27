"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import { statusCodeSchema } from "@/lib/validations/admin";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createStatusCode(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "admin.codes.manage");

    const parsed = statusCodeSchema.safeParse({
      code: formData.get("code"),
      label: formData.get("label"),
      color: formData.get("color"),
      type: formData.get("type") ?? "",
      order: formData.get("order") ?? "0",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const existing = await prisma.statusCode.findUnique({ where: { code: parsed.data.code } });
    if (existing) return { fieldErrors: { code: ["Ce code existe déjà."] } };

    const statusCode = await prisma.statusCode.create({ data: parsed.data });
    await audit(actor, "statuscode.create", { entity: "StatusCode", entityId: statusCode.id });
    revalidatePath("/admin/codes");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function updateStatusCode(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "admin.codes.manage");

    const parsed = statusCodeSchema.safeParse({
      id: formData.get("id"),
      code: formData.get("code"),
      label: formData.get("label"),
      color: formData.get("color"),
      type: formData.get("type") ?? "",
      order: formData.get("order") ?? "0",
    });
    if (!parsed.success || !parsed.data.id) return { fieldErrors: parsed.error?.flatten().fieldErrors ?? {} };

    const clash = await prisma.statusCode.findFirst({
      where: { code: parsed.data.code, NOT: { id: parsed.data.id } },
    });
    if (clash) return { fieldErrors: { code: ["Ce code existe déjà."] } };

    await prisma.statusCode.update({
      where: { id: parsed.data.id },
      data: {
        code: parsed.data.code,
        label: parsed.data.label,
        color: parsed.data.color,
        type: parsed.data.type,
        order: parsed.data.order,
      },
    });

    await audit(actor, "statuscode.update", { entity: "StatusCode", entityId: parsed.data.id });
    revalidatePath("/admin/codes");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function deleteStatusCode(_prevState: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "admin.codes.manage");

  const id = String(formData.get("id"));
  await prisma.statusCode.delete({ where: { id } });
  await audit(actor, "statuscode.delete", { entity: "StatusCode", entityId: id });
  revalidatePath("/admin/codes");
  return {};
}
