"use server";

import { requireActor, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PickerOption } from "@/components/async-picker";

/** Recherche de comptes pour le recrutement : renvoie aussi les non-affectés. */
export async function searchHireCandidates(query: string): Promise<PickerOption[]> {
  const actor = await requireActor();
  if (!can(actor, "hr.hire")) return [];
  if (query.trim().length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { username: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { lastName: "asc" },
    take: 10,
    include: { memberships: { include: { department: { select: { shortName: true } } } } },
  });

  return users.map((user) => ({
    id: user.id,
    label: `${user.lastName} ${user.firstName}`,
    hint:
      user.memberships.length > 0
        ? user.memberships.map((m) => m.department.shortName).join(", ")
        : "sans affectation",
  }));
}

/** Recherche d'agents déjà en poste, pour les formations et sanctions. */
export async function searchStaff(query: string): Promise<PickerOption[]> {
  const actor = await requireActor();
  if (!can(actor, "hr.roster.view")) return [];
  if (query.trim().length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      memberships: { some: { status: "ACTIVE" } },
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { username: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { lastName: "asc" },
    take: 10,
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: { department: { select: { shortName: true } } },
        take: 1,
      },
    },
  });

  return users.map((user) => ({
    id: user.id,
    label: `${user.lastName} ${user.firstName}`,
    hint: user.memberships[0]
      ? `${user.memberships[0].department.shortName} #${user.memberships[0].badgeNumber}`
      : user.username,
  }));
}
