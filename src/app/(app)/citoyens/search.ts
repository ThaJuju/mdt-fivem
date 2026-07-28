"use server";

import { requireActor, assertCan } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CitizenSearchResult = {
  id: string;
  label: string;
  dob: string;
};

/** Recherche légère pour les sélecteurs de propriétaire (véhicules, armes). */
export async function searchCitizens(query: string): Promise<CitizenSearchResult[]> {
  const actor = await requireActor();
  assertCan(actor, "citizens.view");

  if (query.trim().length < 2) return [];

  const citizens = await prisma.citizen.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { lastName: "asc" },
    take: 10,
    select: { id: true, firstName: true, lastName: true, dob: true },
  });

  return citizens.map((citizen) => ({
    id: citizen.id,
    label: `${citizen.lastName} ${citizen.firstName}`,
    dob: citizen.dob.toISOString().slice(0, 10),
  }));
}
