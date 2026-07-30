import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePageParams, pageCount } from "@/lib/pagination";
import { SearchBox } from "@/components/search-box";
import { Button } from "@/components/ui/button";
import type { VehicleRow } from "./columns";
import { VehiclesTable } from "./vehicles-table";

export const metadata: Metadata = { title: "Véhicules — MDT" };

export default async function VehiculesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  requirePagePermission(actor, "vehicles.view");

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePageParams(params, 25);
  const q = typeof params.q === "string" ? params.q : undefined;
  const sortDir = params.dir === "desc" ? "desc" : "asc";

  const where: Prisma.VehicleWhereInput = q
    ? {
        OR: [
          { vin: { equals: q, mode: "insensitive" } },
          { plate: { contains: q, mode: "insensitive" } },
          { make: { contains: q, mode: "insensitive" } },
          { model: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: { plate: sortDir },
      skip,
      take,
      include: { owner: { select: { firstName: true, lastName: true } } },
    }),
    prisma.vehicle.count({ where }),
  ]);

  const rows: VehicleRow[] = vehicles.map((vehicle) => ({
    id: vehicle.id,
    plate: vehicle.plate,
    make: vehicle.make,
    model: vehicle.model,
    color: vehicle.color,
    ownerName: vehicle.owner ? `${vehicle.owner.lastName} ${vehicle.owner.firstName}` : null,
    isStolen: vehicle.isStolen,
    isImpounded: vehicle.isImpounded,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <SearchBox placeholder="Rechercher une plaque, une marque…" />
        {can(actor, "vehicles.create") ? (
          <Button asChild>
            <Link href="/vehicules/nouveau">
              <Plus className="size-4" />
              Enregistrer un véhicule
            </Link>
          </Button>
        ) : null}
      </div>
      <VehiclesTable data={rows} page={page} pageCount={pageCount(total, pageSize)} total={total} />
    </div>
  );
}
