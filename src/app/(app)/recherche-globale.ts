"use server";

import { requireActor, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type GlobalSearchGroup = {
  type: "citizens" | "vehicles" | "weapons";
  label: string;
  results: { id: string; href: string; title: string; subtitle: string; isAlert: boolean }[];
};

/**
 * Recherche unifiée : n'interroge que les tables que l'acteur a le droit de
 * consulter, et renvoie les résultats déjà groupés par type.
 */
export async function globalSearch(query: string): Promise<GlobalSearchGroup[]> {
  const actor = await requireActor();
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const groups: GlobalSearchGroup[] = [];

  if (can(actor, "citizens.view")) {
    const citizens = await prisma.citizen.findMany({
      where: {
        OR: [
          { firstName: { contains: trimmed, mode: "insensitive" } },
          { lastName: { contains: trimmed, mode: "insensitive" } },
          { phone: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      orderBy: { lastName: "asc" },
      take: 5,
      include: { notes: { where: { isFlagged: true }, select: { id: true }, take: 1 } },
    });
    if (citizens.length > 0) {
      groups.push({
        type: "citizens",
        label: "Citoyens",
        results: citizens.map((citizen) => ({
          id: citizen.id,
          href: `/citoyens/${citizen.id}`,
          title: `${citizen.lastName} ${citizen.firstName}`,
          subtitle: citizen.dob.toISOString().slice(0, 10),
          isAlert: citizen.notes.length > 0,
        })),
      });
    }
  }

  if (can(actor, "vehicles.view")) {
    const vehicles = await prisma.vehicle.findMany({
      where: {
        OR: [
          { plate: { contains: trimmed, mode: "insensitive" } },
          { make: { contains: trimmed, mode: "insensitive" } },
          { model: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      orderBy: { plate: "asc" },
      take: 5,
    });
    if (vehicles.length > 0) {
      groups.push({
        type: "vehicles",
        label: "Véhicules",
        results: vehicles.map((vehicle) => ({
          id: vehicle.id,
          href: `/vehicules/${vehicle.id}`,
          title: vehicle.plate,
          subtitle: `${vehicle.make} ${vehicle.model}`,
          isAlert: vehicle.isStolen,
        })),
      });
    }
  }

  if (can(actor, "weapons.view")) {
    const weapons = await prisma.weapon.findMany({
      where: {
        OR: [
          { serialNumber: { contains: trimmed, mode: "insensitive" } },
          { model: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      orderBy: { serialNumber: "asc" },
      take: 5,
    });
    if (weapons.length > 0) {
      groups.push({
        type: "weapons",
        label: "Armes",
        results: weapons.map((weapon) => ({
          id: weapon.id,
          href: `/armes/${weapon.id}`,
          title: weapon.serialNumber,
          subtitle: weapon.model,
          isAlert: weapon.isStolen,
        })),
      });
    }
  }

  return groups;
}
