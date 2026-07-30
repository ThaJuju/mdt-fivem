import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePageParams, pageCount } from "@/lib/pagination";
import { SearchBox } from "@/components/search-box";
import { Button } from "@/components/ui/button";
import type { CitizenRow } from "./columns";
import { CitizensTable } from "./citizens-table";

export const metadata: Metadata = { title: "Citoyens — MDT" };

export default async function CitoyensPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  requirePagePermission(actor, "citizens.view");

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePageParams(params, 25);
  const q = typeof params.q === "string" ? params.q : undefined;
  const sortDir = params.dir === "desc" ? "desc" : "asc";

  const where: Prisma.CitizenWhereInput = {
    isMedicalOnly: false,
    // Une fiche archivée ne circule plus : elle reste consultable depuis les
    // dossiers qui la citent, pas dans les listes du fichier.
    archivedAt: null,
    ...(q
      ? {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      }
      : {}),
  };

  const [citizens, total] = await Promise.all([
    prisma.citizen.findMany({
      where,
      orderBy: { lastName: sortDir },
      skip,
      take,
      include: { notes: { where: { isFlagged: true }, select: { id: true }, take: 1 } },
    }),
    prisma.citizen.count({ where }),
  ]);

  const rows: CitizenRow[] = citizens.map((citizen) => ({
    id: citizen.id,
    firstName: citizen.firstName,
    lastName: citizen.lastName,
    dob: citizen.dob,
    phone: citizen.phone,
    isDeceased: citizen.isDeceased,
    hasFlaggedNote: citizen.notes.length > 0,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <SearchBox placeholder="Rechercher un citoyen…" />
        {can(actor, "citizens.create") ? (
          <Button asChild>
            <Link href="/citoyens/nouveau">
              <Plus className="size-4" />
              Créer une fiche
            </Link>
          </Button>
        ) : null}
      </div>
      <CitizensTable data={rows} page={page} pageCount={pageCount(total, pageSize)} total={total} />
    </div>
  );
}
