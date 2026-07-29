"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireActor, assertCan, hashPassword, type Actor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import {
  hireNewSchema,
  removeFromDepartmentSchema,
  hireSchema,
  promoteSchema,
  terminateSchema,
  disciplineSchema,
  certificationSchema,
  grantCertificationSchema,
  announcementSchema,
} from "@/lib/validations/hr";

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  /** Mot de passe provisoire d'un compte tout juste créé, affiché une fois. */
  createdPassword?: string;
  createdUsername?: string;
};

// ── Effectif ───────────────────────────────────────────────────────────

/**
 * Un chef n'agit que sur SON service.
 *
 * Les permissions RH (`hr.hire`, `hr.promote`, `hr.terminate`) disent ce
 * qu'un grade peut faire, pas où. Sans ce garde, un chef du LSPD pourrait
 * recruter, promouvoir ou licencier dans l'EMS : l'interface ne lui propose
 * que ses services, mais masquer un choix ne protège rien. Seul un
 * super-admin agit sur l'ensemble des services.
 */
function assertDepartmentScope(actor: Actor, departmentId: string): void {
  if (actor.isSuperAdmin) return;
  const belongs = actor.memberships.some(
    (m) => m.departmentId === departmentId && m.status === "ACTIVE",
  );
  if (!belongs) {
    throw new ActionError("Vous ne pouvez agir que sur un service dont vous êtes membre.");
  }
}

/** Génère un mot de passe provisoire lisible, remis une seule fois au chef. */
function temporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(14);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

/**
 * Recrute une personne qui n'a pas encore de compte : création du compte et
 * de l'affectation d'un seul geste. Sans cela, un chef devait demander à un
 * administrateur de créer le compte avant de pouvoir recruter.
 */
export async function hireNewAgent(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "hr.hire");

    const parsed = hireNewSchema.safeParse({
      username: formData.get("username"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      departmentId: formData.get("departmentId"),
      gradeId: formData.get("gradeId"),
      badgeNumber: formData.get("badgeNumber"),
      callsign: formData.get("callsign") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
    assertDepartmentScope(actor, parsed.data.departmentId);

    const grade = await prisma.grade.findUnique({ where: { id: parsed.data.gradeId } });
    if (!grade || grade.departmentId !== parsed.data.departmentId) {
      return { error: "Ce grade n'appartient pas au service sélectionné." };
    }

    const usernameTaken = await prisma.user.findUnique({ where: { username: parsed.data.username } });
    if (usernameTaken) return { fieldErrors: { username: ["Cet identifiant est déjà utilisé."] } };

    const badgeTaken = await prisma.membership.findUnique({
      where: {
        departmentId_badgeNumber: {
          departmentId: parsed.data.departmentId,
          badgeNumber: parsed.data.badgeNumber,
        },
      },
    });
    if (badgeTaken) {
      return { fieldErrors: { badgeNumber: ["Ce matricule est déjà attribué dans ce service."] } };
    }

    const password = temporaryPassword();
    const passwordHash = await hashPassword(password);

    const created = await prisma.user.create({
      data: {
        username: parsed.data.username,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        passwordHash,
        mustChangePassword: true,
        memberships: {
          create: {
            departmentId: parsed.data.departmentId,
            gradeId: parsed.data.gradeId,
            badgeNumber: parsed.data.badgeNumber,
            callsign: parsed.data.callsign,
            isPrimary: true,
            status: "ACTIVE",
          },
        },
      },
    });

    await audit(actor, "hr.hire_new", {
      entity: "User",
      entityId: created.id,
      metadata: { username: created.username, departmentId: parsed.data.departmentId },
    });
    revalidatePath("/rh");
    // Le mot de passe n'est jamais réaffiché : il n'existe qu'en clair ici.
    return { createdPassword: password, createdUsername: created.username };
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

/**
 * Retire un agent d'un service. Le compte survit : il peut appartenir à un
 * autre service, et ses rapports doivent rester attribuables. S'il ne lui
 * reste aucune affectation, le compte est désactivé — il ne peut plus se
 * connecter, mais son historique demeure.
 */
export async function removeFromDepartment(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "hr.terminate");

    const parsed = removeFromDepartmentSchema.safeParse({
      membershipId: formData.get("membershipId"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const membership = await prisma.membership.findUnique({ where: { id: parsed.data.membershipId } });
    if (!membership) return { error: "Cette affectation n'existe plus." };
    assertDepartmentScope(actor, membership.departmentId);

    if (membership.userId === actor.id && !actor.isSuperAdmin) {
      return { error: "Vous ne pouvez pas vous retirer vous-même du service." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.membership.delete({ where: { id: membership.id } });
      const remaining = await tx.membership.count({ where: { userId: membership.userId } });
      if (remaining === 0) {
        await tx.user.update({ where: { id: membership.userId }, data: { isActive: false } });
      }
      await tx.session.deleteMany({ where: { userId: membership.userId } });
    });

    await audit(actor, "hr.remove_from_department", {
      entity: "User",
      entityId: membership.userId,
      metadata: { departmentId: membership.departmentId },
    });
    revalidatePath("/rh");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}


export async function hireAgent(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "hr.hire");

    const parsed = hireSchema.safeParse({
      userId: formData.get("userId"),
      departmentId: formData.get("departmentId"),
      gradeId: formData.get("gradeId"),
      badgeNumber: formData.get("badgeNumber"),
      callsign: formData.get("callsign") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
    assertDepartmentScope(actor, parsed.data.departmentId);

    const grade = await prisma.grade.findUnique({ where: { id: parsed.data.gradeId } });
    if (!grade || grade.departmentId !== parsed.data.departmentId) {
      return { error: "Ce grade n'appartient pas au département sélectionné." };
    }

    const badgeTaken = await prisma.membership.findUnique({
      where: {
        departmentId_badgeNumber: {
          departmentId: parsed.data.departmentId,
          badgeNumber: parsed.data.badgeNumber,
        },
      },
    });
    if (badgeTaken) {
      return { fieldErrors: { badgeNumber: ["Ce matricule est déjà attribué dans ce département."] } };
    }

    const already = await prisma.membership.findFirst({
      where: { userId: parsed.data.userId, departmentId: parsed.data.departmentId },
    });
    if (already) return { error: "Cet agent appartient déjà à ce département." };

    const hasPrimary = await prisma.membership.findFirst({
      where: { userId: parsed.data.userId, isPrimary: true },
    });

    await prisma.membership.create({
      data: { ...parsed.data, status: "ACTIVE", isPrimary: !hasPrimary },
    });

    await audit(actor, "hr.hire", {
      entity: "User",
      entityId: parsed.data.userId,
      metadata: { departmentId: parsed.data.departmentId, badgeNumber: parsed.data.badgeNumber },
    });
    revalidatePath("/rh");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function promoteAgent(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "hr.promote");

    const parsed = promoteSchema.safeParse({
      membershipId: formData.get("membershipId"),
      gradeId: formData.get("gradeId"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const membership = await prisma.membership.findUnique({
      where: { id: parsed.data.membershipId },
      include: { grade: true },
    });
    if (!membership) return { error: "Cette affectation n'existe plus." };
    assertDepartmentScope(actor, membership.departmentId);

    const grade = await prisma.grade.findUnique({ where: { id: parsed.data.gradeId } });
    if (!grade || grade.departmentId !== membership.departmentId) {
      return { error: "Ce grade n'appartient pas au département de l'agent." };
    }

    await prisma.membership.update({
      where: { id: parsed.data.membershipId },
      data: { gradeId: parsed.data.gradeId },
    });

    await audit(actor, grade.level > membership.grade.level ? "hr.promote" : "hr.demote", {
      entity: "Membership",
      entityId: membership.id,
      metadata: { from: membership.grade.name, to: grade.name },
    });
    revalidatePath("/rh");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function terminateAgent(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "hr.terminate");

    const parsed = terminateSchema.safeParse({ membershipId: formData.get("membershipId") });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const membership = await prisma.membership.findUnique({ where: { id: parsed.data.membershipId } });
    if (!membership) return { error: "Cette affectation n'existe plus." };
    assertDepartmentScope(actor, membership.departmentId);
    if (membership.userId === actor.id && !actor.isSuperAdmin) {
      return { error: "Vous ne pouvez pas mettre fin à votre propre affectation." };
    }

    await prisma.membership.update({
      where: { id: parsed.data.membershipId },
      data: { status: "TERMINATED", leftAt: new Date(), isPrimary: false },
    });

    await audit(actor, "hr.terminate", { entity: "Membership", entityId: membership.id });
    revalidatePath("/rh");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

// ── Discipline ─────────────────────────────────────────────────────────

export async function addDiscipline(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "hr.discipline");

    const parsed = disciplineSchema.safeParse({
      userId: formData.get("userId"),
      type: formData.get("type"),
      reason: formData.get("reason"),
      durationDays: formData.get("durationDays") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    // On ne sanctionne qu'un agent de son propre service.
    if (!actor.isSuperAdmin) {
      const shared = await prisma.membership.findFirst({
        where: {
          userId: parsed.data.userId,
          departmentId: {
            in: actor.memberships.filter((m) => m.status === "ACTIVE").map((m) => m.departmentId),
          },
        },
      });
      if (!shared) return { error: "Cet agent n'appartient à aucun de vos services." };
    }

    await prisma.discipline.create({ data: { ...parsed.data, issuedById: actor.id } });
    await audit(actor, "hr.discipline", {
      entity: "User",
      entityId: parsed.data.userId,
      metadata: { type: parsed.data.type },
    });
    revalidatePath("/rh");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

// ── Certifications ─────────────────────────────────────────────────────

export async function saveCertification(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "hr.certifications.manage");

    const parsed = certificationSchema.safeParse({
      id: formData.get("id") ?? undefined,
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      departmentId: formData.get("departmentId"),
      validMonths: formData.get("validMonths") ?? "",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const { id, ...data } = parsed.data;
    if (id) {
      await prisma.certification.update({ where: { id }, data });
      await audit(actor, "certification.update", { entity: "Certification", entityId: id });
    } else {
      const created = await prisma.certification.create({ data });
      await audit(actor, "certification.create", { entity: "Certification", entityId: created.id });
    }

    revalidatePath("/rh");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function grantCertification(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "hr.certifications.manage");

    const parsed = grantCertificationSchema.safeParse({
      userId: formData.get("userId"),
      certificationId: formData.get("certificationId"),
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const certification = await prisma.certification.findUnique({
      where: { id: parsed.data.certificationId },
    });
    if (!certification) return { error: "Cette formation n'existe plus." };

    // L'échéance découle de la durée de validité définie sur la formation.
    const expiresAt = certification.validMonths
      ? new Date(new Date().setMonth(new Date().getMonth() + certification.validMonths))
      : null;

    await prisma.userCertification.create({
      data: {
        userId: parsed.data.userId,
        certificationId: parsed.data.certificationId,
        issuedById: actor.id,
        expiresAt,
      },
    });

    await audit(actor, "certification.grant", {
      entity: "User",
      entityId: parsed.data.userId,
      metadata: { certification: certification.name },
    });
    revalidatePath("/rh");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function revokeCertification(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "hr.certifications.manage");

    const id = String(formData.get("userCertificationId"));
    await prisma.userCertification.delete({ where: { id } });
    await audit(actor, "certification.revoke", { entity: "UserCertification", entityId: id });
    revalidatePath("/rh");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

// ── Service (pointage) ─────────────────────────────────────────────────

export async function startShift(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    const departmentId = String(formData.get("departmentId"));

    const membership = actor.memberships.find(
      (m) => m.departmentId === departmentId && m.status === "ACTIVE",
    );
    if (!membership && !actor.isSuperAdmin) {
      return { error: "Vous n'êtes pas affecté à ce service." };
    }

    const open = await prisma.shift.findFirst({ where: { userId: actor.id, endedAt: null } });
    if (open) return { error: "Vous avez déjà une prise de service en cours." };

    await prisma.shift.create({ data: { userId: actor.id, departmentId } });
    await audit(actor, "shift.start", { metadata: { departmentId } });
    revalidatePath("/rh");
    revalidatePath("/");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function endShift(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    const shiftId = String(formData.get("shiftId"));

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) return { error: "Cette prise de service n'existe plus." };
    if (shift.userId !== actor.id && !actor.isSuperAdmin) {
      return { error: "Vous ne pouvez clôturer que votre propre service." };
    }
    if (shift.endedAt) return { error: "Ce service est déjà terminé." };

    await prisma.shift.update({ where: { id: shiftId }, data: { endedAt: new Date() } });
    await audit(actor, "shift.end", { entityId: shiftId });
    revalidatePath("/rh");
    revalidatePath("/");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

// ── Annonces ───────────────────────────────────────────────────────────

export async function saveAnnouncement(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "hr.announcements.manage");

    const parsed = announcementSchema.safeParse({
      id: formData.get("id") ?? undefined,
      title: formData.get("title"),
      content: formData.get("content"),
      departmentId: formData.get("departmentId") ?? "",
      isPinned: formData.get("isPinned") === "on",
    });
    if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

    const { id, ...data } = parsed.data;
    if (id) {
      await prisma.announcement.update({ where: { id }, data });
      await audit(actor, "announcement.update", { entity: "Announcement", entityId: id });
    } else {
      const created = await prisma.announcement.create({ data: { ...data, authorId: actor.id } });
      await audit(actor, "announcement.create", { entity: "Announcement", entityId: created.id });
    }

    revalidatePath("/rh");
    revalidatePath("/");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}

export async function deleteAnnouncement(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "hr.announcements.manage");

    const id = String(formData.get("announcementId"));
    await prisma.announcement.delete({ where: { id } });
    await audit(actor, "announcement.delete", { entity: "Announcement", entityId: id });
    revalidatePath("/rh");
    revalidatePath("/");
    return {};
  } catch (err) {
    if (err instanceof ActionError) return { error: err.message };
    throw err;
  }
}
