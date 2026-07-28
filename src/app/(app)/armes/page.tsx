import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePageParams, pageCount } from "@/lib/pagination";
import { SearchBox } from "@/components/search-box";
import { Button } from "@/components/ui/button";
import type { WeaponRow } from "./columns";
import { WeaponsTable } from "./weapons-table";

export const metadata: Metadata = { title: "Armes — MDT" };

export default async function ArmesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  requirePagePermission(actor, "weapons.view");

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePageParams(params, 25);
  const q = typeof params.q === "string" ? params.q : undefined;
  const sortDir = params.dir === "desc" ? "desc" : "asc";

  const where: Prisma.WeaponWhereInput = q
    ? {
        OR: [
          { serialNumber: { contains: q, mode: "insensitive" } },
          { model: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [weapons, total] = await Promise.all([
    prisma.weapon.findMany({
      where,
      orderBy: { serialNumber: sortDir },
      skip,
      take,
      include: { owner: { select: { firstName: true, lastName: true } } },
    }),
    prisma.weapon.count({ where }),
  ]);

  const rows: WeaponRow[] = weapons.map((weapon) => ({
    id: weapon.id,
    serialNumber: weapon.serialNumber,
    model: weapon.model,
    type: weapon.type,
    ownerName: weapon.owner ? `${weapon.owner.lastName} ${weapon.owner.firstName}` : null,
    isStolen: weapon.isStolen,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <SearchBox placeholder="Rechercher un numéro de série, un modèle…" />
        {can(actor, "weapons.manage") ? (
          <Button asChild>
            <Link href="/armes/nouvelle">
              <Plus className="size-4" />
              Enregistrer une arme
            </Link>
          </Button>
        ) : null}
      </div>
      <WeaponsTable data={rows} page={page} pageCount={pageCount(total, pageSize)} total={total} />
    </div>
  );
}
