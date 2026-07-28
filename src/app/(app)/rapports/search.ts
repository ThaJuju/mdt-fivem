"use server";

import { requireActor, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type PickerOption = { id: string; label: string; hint: string };

export async function searchVehiclesForReport(query: string): Promise<PickerOption[]> {
  const actor = await requireActor();
  if (!can(actor, "vehicles.view")) return [];
  if (query.trim().length < 2) return [];

  const vehicles = await prisma.vehicle.findMany({
    where: {
      OR: [
        { plate: { contains: query, mode: "insensitive" } },
        { make: { contains: query, mode: "insensitive" } },
        { model: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { plate: "asc" },
    take: 10,
  });

  return vehicles.map((vehicle) => ({
    id: vehicle.id,
    label: vehicle.plate,
    hint: `${vehicle.make} ${vehicle.model}`,
  }));
}

export async function searchOfficers(query: string): Promise<PickerOption[]> {
  const actor = await requireActor();
  if (!can(actor, "reports.create") && !can(actor, "reports.edit_any")) return [];
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
    include: {
      memberships: {
        where: { isPrimary: true },
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
