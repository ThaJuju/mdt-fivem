"use server";

import type { Prisma } from "@prisma/client";
import { requireActor, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type GlobalSearchGroup = {
  type: "citizens" | "patients" | "vehicles" | "weapons" | "reports" | "warrants" | "bolos" | "agents";
  label: string;
  allHref: string;
  results: { id: string; href: string; title: string; subtitle: string; isAlert: boolean }[];
};

const result = (
  id: string,
  href: string,
  title: string,
  subtitle: string,
  isAlert = false,
) => ({ id, href, title, subtitle, isAlert });

/**
 * Recherche unifiée. Chaque bloc reprend les permissions et le cloisonnement
 * de son écran cible ; masquer un résultat ici ne remplace jamais les gardes
 * de la page ouverte.
 *
 * Les identifiants uniques (empreinte, VIN, numéro de rapport) restent en
 * égalité exacte. Les recherches humaines utilisent encore `contains` :
 * lorsque les tables dépasseront quelques milliers de lignes, prévoir
 * `pg_trgm` et des index GIN sur les noms/titres plutôt que multiplier les
 * balayages complets.
 */
export async function globalSearch(query: string): Promise<GlobalSearchGroup[]> {
  const actor = await requireActor();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const q = encodeURIComponent(trimmed);
  const now = new Date();
  const primary =
    actor.memberships.find((membership) => membership.isPrimary && membership.status === "ACTIVE") ??
    actor.memberships.find((membership) => membership.status === "ACTIVE");
  const participation: Prisma.ReportWhereInput = {
    OR: [{ authorId: actor.id }, { officers: { some: { userId: actor.id } } }],
  };

  const reportConditions: Prisma.ReportWhereInput[] = [];
  if (!actor.isSuperAdmin) {
    reportConditions.push({
      OR: [
        ...(primary ? [{ departmentId: primary.departmentId }] : []),
        { authorId: actor.id },
        { officers: { some: { userId: actor.id } } },
      ],
    });
  }
  if (!can(actor, "reports.view_all")) reportConditions.push(participation);
  if (!can(actor, "medical.view")) {
    reportConditions.push({
      OR: [
        { AND: [{ type: { not: "EMS_INTERVENTION" } }, { emsDetail: { is: null } }] },
        { authorId: actor.id },
        { officers: { some: { userId: actor.id } } },
      ],
    });
  }

  const reportNumber = /^\d+$/.test(trimmed) ? Number(trimmed) : null;
  const departmentIds = actor.memberships
    .filter((membership) => membership.status === "ACTIVE")
    .map((membership) => membership.departmentId);

  const [citizens, patients, vehicles, weapons, reports, warrants, bolos, agents] = await Promise.all([
    can(actor, "citizens.view")
      ? prisma.citizen.findMany({
          where: {
            isMedicalOnly: false,
            archivedAt: null,
            OR: [
              { fingerprint: trimmed },
              { firstName: { contains: trimmed, mode: "insensitive" } },
              { lastName: { contains: trimmed, mode: "insensitive" } },
              { phone: { contains: trimmed, mode: "insensitive" } },
            ],
          },
          orderBy: { lastName: "asc" },
          take: 5,
          include: { notes: { where: { isFlagged: true }, select: { id: true }, take: 1 } },
        })
      : [],
    can(actor, "medical.view")
      ? prisma.citizen.findMany({
          where: {
            isMedicalOnly: true,
            archivedAt: null,
            OR: [
              { firstName: { contains: trimmed, mode: "insensitive" } },
              { lastName: { contains: trimmed, mode: "insensitive" } },
              { phone: { contains: trimmed, mode: "insensitive" } },
            ],
          },
          orderBy: { lastName: "asc" },
          take: 5,
        })
      : [],
    can(actor, "vehicles.view")
      ? prisma.vehicle.findMany({
          where: {
            OR: [
              { vin: { equals: trimmed, mode: "insensitive" } },
              { plate: { contains: trimmed, mode: "insensitive" } },
              { make: { contains: trimmed, mode: "insensitive" } },
              { model: { contains: trimmed, mode: "insensitive" } },
            ],
          },
          orderBy: { plate: "asc" },
          take: 5,
        })
      : [],
    can(actor, "weapons.view")
      ? prisma.weapon.findMany({
          where: {
            OR: [
              { serialNumber: { contains: trimmed, mode: "insensitive" } },
              { model: { contains: trimmed, mode: "insensitive" } },
            ],
          },
          orderBy: { serialNumber: "asc" },
          take: 5,
        })
      : [],
    can(actor, "reports.view")
      ? prisma.report.findMany({
          where: {
            AND: [
              ...reportConditions,
              reportNumber !== null
                ? { OR: [{ number: reportNumber }, { title: { contains: trimmed, mode: "insensitive" } }] }
                : { title: { contains: trimmed, mode: "insensitive" } },
            ],
          },
          orderBy: { number: "desc" },
          take: 5,
          select: { id: true, number: true, title: true, status: true },
        })
      : [],
    can(actor, "warrants.view")
      ? prisma.warrant.findMany({
          where: {
            status: "ACTIVE",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            citizen: {
              is: {
                OR: [
                  { firstName: { contains: trimmed, mode: "insensitive" } },
                  { lastName: { contains: trimmed, mode: "insensitive" } },
                ],
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { citizen: { select: { id: true, firstName: true, lastName: true } } },
        })
      : [],
    can(actor, "bolos.view")
      ? prisma.bolo.findMany({
          where: {
            isActive: true,
            AND: [
              { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
              { OR: [
                { title: { contains: trimmed, mode: "insensitive" } },
                { plate: { contains: trimmed, mode: "insensitive" } },
                { citizen: { is: { firstName: { contains: trimmed, mode: "insensitive" } } } },
                { citizen: { is: { lastName: { contains: trimmed, mode: "insensitive" } } } },
                { vehicle: { is: { plate: { contains: trimmed, mode: "insensitive" } } } },
              ] },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            citizen: { select: { id: true, firstName: true, lastName: true } },
            vehicle: { select: { id: true, plate: true } },
          },
        })
      : [],
    can(actor, "hr.roster.view")
      ? prisma.user.findMany({
          where: {
            isActive: true,
            memberships: {
              some: {
                status: "ACTIVE",
                ...(actor.isSuperAdmin ? {} : { departmentId: { in: departmentIds } }),
              },
            },
            OR: [
              { firstName: { contains: trimmed, mode: "insensitive" } },
              { lastName: { contains: trimmed, mode: "insensitive" } },
              { memberships: { some: { badgeNumber: { contains: trimmed, mode: "insensitive" } } } },
            ],
          },
          orderBy: { lastName: "asc" },
          take: 5,
          include: {
            memberships: {
              where: {
                status: "ACTIVE",
                ...(actor.isSuperAdmin ? {} : { departmentId: { in: departmentIds } }),
              },
              include: { department: { select: { shortName: true } } },
              take: 1,
            },
          },
        })
      : [],
  ]);

  const groups: GlobalSearchGroup[] = [];
  if (citizens.length) groups.push({
    type: "citizens", label: "Citoyens", allHref: `/citoyens?q=${q}`,
    results: citizens.map((citizen) =>
      result(citizen.id, `/citoyens/${citizen.id}`, `${citizen.lastName} ${citizen.firstName}`,
        citizen.fingerprint === trimmed ? `Empreinte ${citizen.fingerprint}` : citizen.dob.toISOString().slice(0, 10),
        citizen.notes.length > 0)),
  });
  if (patients.length) groups.push({
    type: "patients", label: "Patients EMS", allHref: `/medical/patients?q=${q}`,
    results: patients.map((patient) =>
      result(patient.id, `/medical/${patient.id}`, `${patient.lastName} ${patient.firstName}`, "Dossier médical")),
  });
  if (vehicles.length) groups.push({
    type: "vehicles", label: "Véhicules", allHref: `/vehicules?q=${q}`,
    results: vehicles.map((vehicle) =>
      result(vehicle.id, `/vehicules/${vehicle.id}`, vehicle.plate,
        vehicle.vin?.toLowerCase() === trimmed.toLowerCase() ? `VIN ${vehicle.vin}` : `${vehicle.make} ${vehicle.model}`,
        vehicle.isStolen)),
  });
  if (weapons.length) groups.push({
    type: "weapons", label: "Armes", allHref: `/armes?q=${q}`,
    results: weapons.map((weapon) =>
      result(weapon.id, `/armes/${weapon.id}`, weapon.serialNumber, weapon.model, weapon.isStolen)),
  });
  if (reports.length) groups.push({
    type: "reports", label: "Rapports", allHref: `/rapports?q=${q}`,
    results: reports.map((report) =>
      result(report.id, `/rapports/${report.id}`, `#${report.number} — ${report.title}`, report.status)),
  });
  if (warrants.length) groups.push({
    type: "warrants", label: "Mandats actifs", allHref: `/mandats?q=${q}&status=ACTIVE`,
    results: warrants.map((warrant) =>
      result(warrant.id, `/citoyens/${warrant.citizen.id}`,
        `${warrant.citizen.lastName} ${warrant.citizen.firstName}`, warrant.reason, true)),
  });
  if (bolos.length) groups.push({
    type: "bolos", label: "BOLO actifs", allHref: `/bolos?q=${q}`,
    results: bolos.map((bolo) =>
      result(bolo.id, bolo.citizen ? `/citoyens/${bolo.citizen.id}` : bolo.vehicle ? `/vehicules/${bolo.vehicle.id}` : `/bolos?q=${q}`,
        bolo.title, bolo.citizen ? `${bolo.citizen.lastName} ${bolo.citizen.firstName}` : bolo.vehicle?.plate ?? bolo.plate ?? bolo.type, true)),
  });
  if (agents.length) groups.push({
    type: "agents", label: "Agents", allHref: `/rh?q=${q}`,
    results: agents.map((user) => {
      const membership = user.memberships[0];
      return result(user.id, `/rh?q=${encodeURIComponent(`${user.firstName} ${user.lastName}`)}`,
        `${user.lastName} ${user.firstName}`,
        membership ? `${membership.department.shortName} #${membership.badgeNumber}` : user.username);
    }),
  });
  return groups;
}
