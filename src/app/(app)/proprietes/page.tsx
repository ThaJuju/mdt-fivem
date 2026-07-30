import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePageParams, pageCount } from "@/lib/pagination";
import { SearchBox } from "@/components/search-box";
import { SimplePagination } from "@/components/simple-pagination";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Propriétés — MDT" };

export default async function PropertiesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  requirePagePermission(actor, "properties.view");
  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePageParams(params, 25);
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const where: Prisma.PropertyWhereInput = q
    ? { address: { contains: q, mode: "insensitive" } }
    : {};
  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      orderBy: { address: "asc" },
      skip,
      take,
      include: { citizen: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.property.count({ where }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox placeholder="Rechercher une adresse…" />
        {can(actor, "properties.create") ? (
          <Button asChild><Link href="/proprietes/nouvelle"><Plus className="size-4" />Enregistrer un bien</Link></Button>
        ) : null}
      </div>
      {properties.length ? (
        <div className="overflow-hidden rounded-md border border-border">
          {properties.map((property) => (
            <Link key={property.id} href={`/proprietes/${property.id}`}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4 last:border-b-0 hover:bg-muted/50">
              <div><p className="font-medium">{property.address}</p><p className="text-sm text-muted-foreground">{property.type ?? "Type non renseigné"}</p></div>
              <span className="text-sm text-muted-foreground">
                {property.citizen ? `${property.citizen.lastName} ${property.citizen.firstName}` : "Sans propriétaire"}
              </span>
            </Link>
          ))}
        </div>
      ) : <p className="rounded-md border border-dashed p-8 text-center text-muted-foreground">Aucune propriété trouvée.</p>}
      <SimplePagination page={page} pageCount={pageCount(total, pageSize)} total={total} noun="propriété" />
    </div>
  );
}
