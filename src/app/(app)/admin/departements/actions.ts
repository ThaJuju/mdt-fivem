"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import { departmentSchema, gradeSchema } from "@/lib/validations/admin";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createDepartment(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "admin.departments.manage");

    const parsed = departmentSchema.safeParse({
      name: formData.get("name"),
      shortName: formData.get("shortName"),
      type: formData.get("type"),
      color: formData.get("color"),
      order: formData.get("order") ?? "0",
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const existing = await prisma.department.findUnique({ where: { shortName: parsed.data.shortName } });
    if (existing) return { fieldErrors: { shortName: ["Ce sigle est déjà utilisé."] } };

    const department = await prisma.department.create({ data: parsed.data });
    await audit(actor, "department.create", { entity: "Department", entityId: department.id });
    revalidatePath("/admin/departements");
    redirect(`/admin/departements/${department.id}`);
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function updateDepartment(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "admin.departments.manage");

    const parsed = departmentSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      shortName: formData.get("shortName"),
      type: formData.get("type"),
      color: formData.get("color"),
      order: formData.get("order") ?? "0",
      isActive: formData.get("isActive") === "on",
    });
    if (!parsed.success || !parsed.data.id) return { fieldErrors: parsed.error?.flatten().fieldErrors ?? {} };

    const clash = await prisma.department.findFirst({
      where: { shortName: parsed.data.shortName, NOT: { id: parsed.data.id } },
    });
    if (clash) return { fieldErrors: { shortName: ["Ce sigle est déjà utilisé."] } };

    await prisma.department.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        shortName: parsed.data.shortName,
        type: parsed.data.type,
        color: parsed.data.color,
        order: parsed.data.order,
        isActive: parsed.data.isActive,
      },
    });

    await audit(actor, "department.update", { entity: "Department", entityId: parsed.data.id });
    revalidatePath(`/admin/departements/${parsed.data.id}`);
    revalidatePath("/admin/departements");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function deleteDepartment(_prevState: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "admin.departments.manage");

  const departmentId = String(formData.get("departmentId"));
  const membershipCount = await prisma.membership.count({ where: { departmentId } });
  if (membershipCount > 0) {
    return { error: "Impossible de supprimer un département auquel des comptes sont rattachés." };
  }

  await prisma.department.delete({ where: { id: departmentId } });
  await audit(actor, "department.delete", { entity: "Department", entityId: departmentId });
  revalidatePath("/admin/departements");
  redirect("/admin/departements");
}

export async function createGrade(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "admin.grades.manage");

    const parsed = gradeSchema.safeParse({
      departmentId: formData.get("departmentId"),
      name: formData.get("name"),
      level: formData.get("level"),
      salary: formData.get("salary") || undefined,
      isDefault: formData.get("isDefault") === "on",
      permissions: formData.getAll("permissions"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const clash = await prisma.grade.findUnique({
      where: { departmentId_level: { departmentId: parsed.data.departmentId, level: parsed.data.level } },
    });
    if (clash) return { fieldErrors: { level: ["Ce niveau est déjà utilisé dans ce département."] } };

    await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.grade.updateMany({
          where: { departmentId: parsed.data.departmentId },
          data: { isDefault: false },
        });
      }
      await tx.grade.create({ data: parsed.data });
    });

    await audit(actor, "grade.create", { entity: "Department", entityId: parsed.data.departmentId });
    revalidatePath(`/admin/departements/${parsed.data.departmentId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function updateGrade(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "admin.grades.manage");

    const parsed = gradeSchema.safeParse({
      id: formData.get("id"),
      departmentId: formData.get("departmentId"),
      name: formData.get("name"),
      level: formData.get("level"),
      salary: formData.get("salary") || undefined,
      isDefault: formData.get("isDefault") === "on",
      permissions: formData.getAll("permissions"),
    });
    if (!parsed.success || !parsed.data.id) return { fieldErrors: parsed.error?.flatten().fieldErrors ?? {} };

    const clash = await prisma.grade.findUnique({
      where: { departmentId_level: { departmentId: parsed.data.departmentId, level: parsed.data.level } },
    });
    if (clash && clash.id !== parsed.data.id) {
      return { fieldErrors: { level: ["Ce niveau est déjà utilisé dans ce département."] } };
    }

    await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.grade.updateMany({
          where: { departmentId: parsed.data.departmentId, NOT: { id: parsed.data.id } },
          data: { isDefault: false },
        });
      }
      await tx.grade.update({
        where: { id: parsed.data.id },
        data: {
          name: parsed.data.name,
          level: parsed.data.level,
          salary: parsed.data.salary,
          isDefault: parsed.data.isDefault,
          permissions: parsed.data.permissions,
        },
      });
    });

    await audit(actor, "grade.update", { entity: "Grade", entityId: parsed.data.id });
    revalidatePath(`/admin/departements/${parsed.data.departmentId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function deleteGrade(_prevState: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "admin.grades.manage");

  const gradeId = String(formData.get("gradeId"));
  const departmentId = String(formData.get("departmentId"));

  const membershipCount = await prisma.membership.count({ where: { gradeId } });
  if (membershipCount > 0) {
    return { error: "Impossible de supprimer un grade auquel des comptes sont rattachés." };
  }

  await prisma.grade.delete({ where: { id: gradeId } });
  await audit(actor, "grade.delete", { entity: "Grade", entityId: gradeId });
  revalidatePath(`/admin/departements/${departmentId}`);
  return {};
}
