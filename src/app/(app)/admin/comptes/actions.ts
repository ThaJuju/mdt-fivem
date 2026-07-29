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

    const current = await prisma.membership.findUnique({ where: { id: parsed.data.id } });
    if (!current) return { error: "Cette affectation n'existe plus." };

    const grade = await prisma.grade.findUnique({ where: { id: parsed.data.gradeId } });
    if (!grade || grade.departmentId !== parsed.data.departmentId) {
      return { error: "Ce grade n'appartient pas au service sélectionné." };
    }

    // Mutation d'un service à un autre : l'agent ne peut pas figurer deux fois
    // dans le même service, et le matricule doit être libre à l'arrivée.
    const isTransfer = current.departmentId !== parsed.data.departmentId;
    if (isTransfer) {
      const alreadyThere = await prisma.membership.findFirst({
        where: {
          userId: parsed.data.userId,
          departmentId: parsed.data.departmentId,
          NOT: { id: parsed.data.id },
        },
      });
      if (alreadyThere) {
        return { error: "Cet agent a déjà une affectation dans ce service." };
      }
    }

    const badgeHolder = await prisma.membership.findUnique({
      where: {
        departmentId_badgeNumber: {
          departmentId: parsed.data.departmentId,
          badgeNumber: parsed.data.badgeNumber,
        },
      },
    });
    if (badgeHolder && badgeHolder.id !== parsed.data.id) {
      return { fieldErrors: { badgeNumber: ["Ce matricule est déjà attribué dans ce service."] } };
    }

    await prisma.$transaction(async (tx) => {
      if (parsed.data.isPrimary) {
        await tx.membership.updateMany({ where: { userId: parsed.data.userId }, data: { isPrimary: false } });
      }
      await tx.membership.update({
        where: { id: parsed.data.id },
        data: {
          // Le service fait partie de ce qu'on peut modifier : sans cela, un
          // changement de service laissait l'affectation avec un grade
          // appartenant à un autre service.
          departmentId: parsed.data.departmentId,
          gradeId: parsed.data.gradeId,
          badgeNumber: parsed.data.badgeNumber,
          callsign: parsed.data.callsign,
          isPrimary: parsed.data.isPrimary,
          status: parsed.data.status,
          leftAt: parsed.data.status === "TERMINATED" ? new Date() : null,
        },
      });
    });

    await audit(actor, isTransfer ? "membership.transfer" : "membership.update", {
      entity: "Membership",
      entityId: parsed.data.id,
      metadata: isTransfer
        ? { from: current.departmentId, to: parsed.data.departmentId, grade: grade.name }
        : { grade: grade.name },
    });
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

/**
 * Supprime définitivement un compte — uniquement s'il n'a laissé aucune trace.
 *
 * Un compte qui a rédigé un rapport, signé une note, demandé un mandat ou
 * simplement consulté un dossier ne peut pas être effacé : ces écritures
 * doivent rester attribuables, c'est toute la raison d'être du journal
 * d'audit. Dans ce cas on désactive le compte, ce qui lui retire l'accès sans
 * réécrire l'histoire.
 *
 * La suppression sert donc au cas réel qu'elle couvre : un compte créé par
 * erreur, jamais utilisé.
 */
export async function deleteUser(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "admin.users.manage");

    const userId = String(formData.get("userId"));
    if (userId === actor.id) {
      return { error: "Vous ne pouvez pas supprimer votre propre compte." };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { error: "Ce compte n'existe pas ou a déjà été supprimé." };
    if (user.isSuperAdmin && !actor.isSuperAdmin) {
      return { error: "Seul un super-admin peut supprimer un compte super-admin." };
    }

    // Tout ce qui rattache une écriture à ce compte empêche sa suppression.
    const [
      reports,
      approvals,
      officerOn,
      notes,
      warrantsRequested,
      warrantsApproved,
      bolos,
      callLogs,
      units,
      announcements,
      certificationsIssued,
      disciplinesIssued,
      auditEntries,
    ] = await Promise.all([
      prisma.report.count({ where: { authorId: userId } }),
      prisma.report.count({ where: { approvedById: userId } }),
      prisma.reportOfficer.count({ where: { userId } }),
      prisma.citizenNote.count({ where: { authorId: userId } }),
      prisma.warrant.count({ where: { requestedById: userId } }),
      prisma.warrant.count({ where: { approvedById: userId } }),
      prisma.bolo.count({ where: { createdById: userId } }),
      prisma.callLog.count({ where: { authorId: userId } }),
      prisma.unitMember.count({ where: { userId } }),
      prisma.announcement.count({ where: { authorId: userId } }),
      prisma.userCertification.count({ where: { issuedById: userId } }),
      prisma.discipline.count({ where: { issuedById: userId } }),
      prisma.auditLog.count({ where: { userId } }),
    ]);

    const traces: { label: string; count: number }[] = [
      { label: "rapport", count: reports },
      { label: "validation de rapport", count: approvals },
      { label: "participation à un rapport", count: officerOn },
      { label: "note de dossier", count: notes },
      { label: "demande de mandat", count: warrantsRequested },
      { label: "décision sur un mandat", count: warrantsApproved },
      { label: "BOLO", count: bolos },
      { label: "entrée de journal d'appel", count: callLogs },
      { label: "appartenance à une unité", count: units },
      { label: "annonce", count: announcements },
      { label: "certification délivrée", count: certificationsIssued },
      { label: "sanction prononcée", count: disciplinesIssued },
      { label: "entrée au journal d'audit", count: auditEntries },
    ].filter((trace) => trace.count > 0);

    if (traces.length > 0) {
      const detail = traces
        .map((trace) => `${trace.count} ${trace.label}${trace.count > 1 ? "s" : ""}`)
        .join(", ");
      return {
        error:
          `Ce compte a laissé une trace dans le système (${detail}) : le supprimer rendrait ces écritures ` +
          `inattribuables. Décochez « Compte actif » pour lui retirer l'accès en conservant l'historique.`,
      };
    }

    // Aucune trace : les relations restantes (sessions, affectations) cascadent.
    await prisma.user.delete({ where: { id: userId } });
    await audit(actor, "user.delete", {
      entity: "User",
      entityId: userId,
      metadata: { username: user.username },
    });
    revalidatePath("/admin/comptes");
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
  redirect("/admin/comptes");
}
