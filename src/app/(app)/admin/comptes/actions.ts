"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan, hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  membershipSchema,
} from "@/lib/validations/admin";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createUser(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "admin.users.manage");

    const parsed = createUserSchema.safeParse({
      username: formData.get("username"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email") ?? "",
      isSuperAdmin: formData.get("isSuperAdmin") === "on",
      password: formData.get("password"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const existing = await prisma.user.findUnique({ where: { username: parsed.data.username } });
    if (existing) return { fieldErrors: { username: ["Cet identifiant est déjà utilisé."] } };

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        username: parsed.data.username,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        isSuperAdmin: parsed.data.isSuperAdmin,
        passwordHash,
        mustChangePassword: true,
      },
    });

    await audit(actor, "user.create", { entity: "User", entityId: user.id, metadata: { username: user.username } });
    revalidatePath("/admin/comptes");
    redirect(`/admin/comptes/${user.id}`);
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function updateUser(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "admin.users.manage");

    const parsed = updateUserSchema.safeParse({
      id: formData.get("id"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email") ?? "",
      isActive: formData.get("isActive") === "on",
      isSuperAdmin: formData.get("isSuperAdmin") === "on",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    if (parsed.data.id === actor.id && !parsed.data.isSuperAdmin && actor.isSuperAdmin) {
      return { error: "Vous ne pouvez pas retirer votre propre statut super-admin." };
    }
    if (parsed.data.id === actor.id && !parsed.data.isActive) {
      return { error: "Vous ne pouvez pas désactiver votre propre compte." };
    }

    await prisma.user.update({
      where: { id: parsed.data.id },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        isActive: parsed.data.isActive,
        isSuperAdmin: parsed.data.isSuperAdmin,
      },
    });

    await audit(actor, "user.update", { entity: "User", entityId: parsed.data.id });
    revalidatePath(`/admin/comptes/${parsed.data.id}`);
    revalidatePath("/admin/comptes");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function resetPassword(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "admin.users.manage");

    const parsed = resetPasswordSchema.safeParse({
      id: formData.get("id"),
      password: formData.get("password"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.update({
      where: { id: parsed.data.id },
      data: { passwordHash, mustChangePassword: true },
    });

    await audit(actor, "user.reset_password", { entity: "User", entityId: parsed.data.id });
    revalidatePath(`/admin/comptes/${parsed.data.id}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function addMembership(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "admin.users.manage");

    const parsed = membershipSchema.safeParse({
      userId: formData.get("userId"),
      departmentId: formData.get("departmentId"),
      gradeId: formData.get("gradeId"),
      badgeNumber: formData.get("badgeNumber"),
      callsign: formData.get("callsign") ?? "",
      isPrimary: formData.get("isPrimary") === "on",
      status: "ACTIVE",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const grade = await prisma.grade.findUnique({ where: { id: parsed.data.gradeId } });
    if (!grade || grade.departmentId !== parsed.data.departmentId) {
      return { error: "Ce grade n'appartient pas au département sélectionné." };
    }

    const existingBadge = await prisma.membership.findUnique({
      where: {
        departmentId_badgeNumber: {
          departmentId: parsed.data.departmentId,
          badgeNumber: parsed.data.badgeNumber,
        },
      },
    });
    if (existingBadge) {
      return { fieldErrors: { badgeNumber: ["Ce matricule est déjà attribué dans ce département."] } };
    }

    await prisma.$transaction(async (tx) => {
      if (parsed.data.isPrimary) {
        await tx.membership.updateMany({ where: { userId: parsed.data.userId }, data: { isPrimary: false } });
      }
      await tx.membership.create({
        data: {
          userId: parsed.data.userId,
          departmentId: parsed.data.departmentId,
          gradeId: parsed.data.gradeId,
          badgeNumber: parsed.data.badgeNumber,
          callsign: parsed.data.callsign,
          isPrimary: parsed.data.isPrimary,
          status: "ACTIVE",
        },
      });
    });

    await audit(actor, "membership.create", { entity: "User", entityId: parsed.data.userId });
    revalidatePath(`/admin/comptes/${parsed.data.userId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function updateMembership(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "admin.users.manage");

    const parsed = membershipSchema.safeParse({
      id: formData.get("id"),
      userId: formData.get("userId"),
      departmentId: formData.get("departmentId"),
      gradeId: formData.get("gradeId"),
      badgeNumber: formData.get("badgeNumber"),
      callsign: formData.get("callsign") ?? "",
      isPrimary: formData.get("isPrimary") === "on",
      status: formData.get("status"),
    });
    if (!parsed.success || !parsed.data.id) return { fieldErrors: parsed.error?.flatten().fieldErrors ?? {} };

    const grade = await prisma.grade.findUnique({ where: { id: parsed.data.gradeId } });
    if (!grade || grade.departmentId !== parsed.data.departmentId) {
      return { error: "Ce grade n'appartient pas au département sélectionné." };
    }

    await prisma.$transaction(async (tx) => {
      if (parsed.data.isPrimary) {
        await tx.membership.updateMany({ where: { userId: parsed.data.userId }, data: { isPrimary: false } });
      }
      await tx.membership.update({
        where: { id: parsed.data.id },
        data: {
          gradeId: parsed.data.gradeId,
          badgeNumber: parsed.data.badgeNumber,
          callsign: parsed.data.callsign,
          isPrimary: parsed.data.isPrimary,
          status: parsed.data.status,
          leftAt: parsed.data.status === "TERMINATED" ? new Date() : null,
        },
      });
    });

    await audit(actor, "membership.update", { entity: "Membership", entityId: parsed.data.id });
    revalidatePath(`/admin/comptes/${parsed.data.userId}`);
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function removeMembership(userId: string, membershipId: string): Promise<void> {
  const actor = await requireActor();
  assertCan(actor, "admin.users.manage");

  await prisma.membership.delete({ where: { id: membershipId } });
  await audit(actor, "membership.delete", { entity: "Membership", entityId: membershipId });
  revalidatePath(`/admin/comptes/${userId}`);
}
