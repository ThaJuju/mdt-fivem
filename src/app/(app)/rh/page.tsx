import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { RosterSection, type RosterRow, type DepartmentOption } from "./roster-section";
import {
  CertificationsSection,
  ShiftsSection,
  AnnouncementsSection,
  type CertificationRow,
  type ShiftRow,
  type AnnouncementRow,
} from "./hr-sections";

export const metadata: Metadata = { title: "Ressources humaines — MDT" };

export default async function RhPage() {
  const actor = await requireActor();
  requirePagePermission(actor, "hr.roster.view");

  const canViewAllShifts = can(actor, "hr.shifts.view");
  const actorDepartmentIds = actor.memberships
    .filter((m) => m.status === "ACTIVE")
    .map((m) => m.departmentId);

  // Un responsable ne voit que l'effectif des services dont il est membre,
  // sauf super-admin.
  const rosterWhere: Prisma.MembershipWhereInput = actor.isSuperAdmin
    ? {}
    : { departmentId: { in: actorDepartmentIds } };

  const [memberships, departments, certifications, shifts, announcements, openShift] = await Promise.all([
    prisma.membership.findMany({
      where: rosterWhere,
      orderBy: [{ department: { order: "asc" } }, { grade: { level: "desc" } }],
      take: 200,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            disciplinesHeld: { orderBy: { createdAt: "desc" }, take: 5 },
            certificationsHeld: { include: { certification: { select: { name: true } } } },
          },
        },
        department: { select: { shortName: true } },
        grade: { select: { name: true, level: true } },
      },
    }),
    prisma.department.findMany({
      where: actor.isSuperAdmin ? { isActive: true } : { id: { in: actorDepartmentIds } },
      orderBy: { order: "asc" },
      include: { grades: { select: { id: true, name: true, level: true } } },
    }),
    prisma.certification.findMany({
      where: actor.isSuperAdmin ? {} : { departmentId: { in: actorDepartmentIds } },
      orderBy: { name: "asc" },
      include: {
        department: { select: { shortName: true } },
        holders: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { issuedAt: "desc" },
        },
      },
    }),
    prisma.shift.findMany({
      where: canViewAllShifts ? {} : { userId: actor.id },
      orderBy: { startedAt: "desc" },
      take: 30,
      include: {
        user: { select: { firstName: true, lastName: true } },
        department: { select: { shortName: true } },
      },
    }),
    prisma.announcement.findMany({
      where: actor.isSuperAdmin
        ? {}
        : { OR: [{ departmentId: null }, { departmentId: { in: actorDepartmentIds } }] },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 20,
      include: {
        author: { select: { firstName: true, lastName: true } },
        department: { select: { shortName: true } },
      },
    }),
    prisma.shift.findFirst({
      where: { userId: actor.id, endedAt: null },
      include: { department: { select: { shortName: true } } },
    }),
  ]);

  await audit(actor, "hr.roster.view");

  const roster: RosterRow[] = memberships.map((membership) => ({
    membershipId: membership.id,
    userId: membership.user.id,
    name: `${membership.user.lastName} ${membership.user.firstName}`,
    departmentId: membership.departmentId,
    departmentShortName: membership.department.shortName,
    gradeName: membership.grade.name,
    gradeLevel: membership.grade.level,
    badgeNumber: membership.badgeNumber,
    callsign: membership.callsign,
    status: membership.status,
    hiredAt: membership.hiredAt.toISOString(),
    disciplines: membership.user.disciplinesHeld.map((discipline) => ({
      id: discipline.id,
      type: discipline.type,
      reason: discipline.reason,
      createdAt: discipline.createdAt.toISOString(),
    })),
    certifications: membership.user.certificationsHeld.map((held) => ({
      id: held.id,
      name: held.certification.name,
      expiresAt: held.expiresAt ? held.expiresAt.toISOString() : null,
    })),
  }));

  const departmentOptions: DepartmentOption[] = departments.map((department) => ({
    id: department.id,
    name: department.name,
    shortName: department.shortName,
    grades: department.grades,
  }));

  const certificationRows: CertificationRow[] = certifications.map((certification) => ({
    id: certification.id,
    name: certification.name,
    description: certification.description,
    departmentShortName: certification.department.shortName,
    validMonths: certification.validMonths,
    holders: certification.holders.map((holder) => ({
      id: holder.id,
      name: `${holder.user.lastName} ${holder.user.firstName}`,
      expiresAt: holder.expiresAt ? holder.expiresAt.toISOString() : null,
    })),
  }));

  const shiftRows: ShiftRow[] = shifts.map((shift) => ({
    id: shift.id,
    userName: `${shift.user.lastName} ${shift.user.firstName}`,
    departmentShortName: shift.department.shortName,
    startedAt: shift.startedAt.toISOString(),
    endedAt: shift.endedAt ? shift.endedAt.toISOString() : null,
  }));

  const announcementRows: AnnouncementRow[] = announcements.map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    departmentShortName: announcement.department?.shortName ?? null,
    authorName: `${announcement.author.firstName} ${announcement.author.lastName}`,
    isPinned: announcement.isPinned,
    createdAt: announcement.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Ressources humaines</h1>

      <RosterSection
        roster={roster}
        departments={departmentOptions}
        canHire={can(actor, "hr.hire")}
        canPromote={can(actor, "hr.promote")}
        canTerminate={can(actor, "hr.terminate")}
        canDiscipline={can(actor, "hr.discipline")}
      />

      <CertificationsSection
        certifications={certificationRows}
        departments={departmentOptions}
        canManage={can(actor, "hr.certifications.manage")}
      />

      <ShiftsSection
        shifts={shiftRows}
        openShift={
          openShift
            ? {
                id: openShift.id,
                userName: `${actor.lastName} ${actor.firstName}`,
                departmentShortName: openShift.department.shortName,
                startedAt: openShift.startedAt.toISOString(),
                endedAt: null,
              }
            : null
        }
        departments={departmentOptions}
        canViewAll={canViewAllShifts}
      />

      <AnnouncementsSection
        announcements={announcementRows}
        departments={departmentOptions}
        canManage={can(actor, "hr.announcements.manage")}
      />
    </div>
  );
}
