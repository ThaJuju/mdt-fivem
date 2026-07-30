"use server";

import { requireActor, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CitizenSearchResult = {
  id: string;
  label: string;
  dob: string;
};

/** Recherche légère pour les sélecteurs de citoyens et de patients. */
export async function searchCitizens(
  query: string,
  scope: "accessible" | "civil" | "medical" = "accessible",
): Promise<CitizenSearchResult[]> {
  const actor = await requireActor();
  const hasMedicalAccess = can(actor, "medical.view");
  if (!can(actor, "citizens.view") && !hasMedicalAccess) return [];

  const normalizedQuery = query.trim();

  const citizens = await prisma.citizen.findMany({
    where: {
      ...(scope === "civil"
        ? { isMedicalOnly: false }
        : scope === "medical"
          ? { isMedicalOnly: true }
          : hasMedicalAccess
            ? {}
            : { isMedicalOnly: false }),
      // On ne rattache pas un nouveau dossier à une fiche archivée : elle est
      // sortie de la circulation, la proposer dans un sélecteur la ferait
      // revenir par la petite porte.
      archivedAt: null,
      ...(normalizedQuery
        ? {
            OR: [
              { firstName: { contains: normalizedQuery, mode: "insensitive" as const } },
              { lastName: { contains: normalizedQuery, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 10,
    select: { id: true, firstName: true, lastName: true, dob: true },
  });

  return citizens.map((citizen) => ({
    id: citizen.id,
    label: `${citizen.lastName} ${citizen.firstName}`,
    dob: citizen.dob.toISOString().slice(0, 10),
  }));
}
