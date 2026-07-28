import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { expireStaleRecords } from "@/lib/expiry";
import { parsePageParams, pageCount } from "@/lib/pagination";
import { Badge } from "@/components/ui/badge";
import { BoloFilters } from "./bolo-filters";
import { BolosPagination } from "./bolos-pagination";
import {
  CreateBoloDialog,
  EditBoloDialog,
  CloseBoloButton,
  ReopenBoloButton,
  DeleteBoloButton,
} from "./bolo-dialogs";

export const metadata: Metadata = { title: "BOLO — MDT" };

const TYPE_LABELS: Record<string, string> = {
  PERSON: "Personne",
  VEHICLE: "Véhicule",
  OTHER: "Autre",
};

export default async function BolosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  requirePagePermission(actor, "bolos.view");

  await expireStaleRecords();

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePageParams(params, 25);
  const scope = params.scope === "closed" ? "closed" : params.scope === "all" ? "all" : "active";

  const where: Prisma.BoloWhereInput =
    scope === "all" ? {} : scope === "closed" ? { isActive: false } : { isActive: true };

  const [bolos, total] = await Promise.all([
    prisma.bolo.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      skip,
      take,
      include: {
        citizen: { select: { id: true, firstName: true, lastName: true } },
        vehicle: { select: { id: true, plate: true, make: true, model: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.bolo.count({ where }),
  ]);

  await audit(actor, "bolo.list");
  const canManage = can(actor, "bolos.manage");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">BOLO</h1>
        {canManage ? <CreateBoloDialog /> : null}
      </div>

      <BoloFilters />

      {bolos.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
          {scope === "active"
            ? "Aucun avis de recherche en cours. Diffusez-en un dès qu'une personne ou un véhicule est activement recherché."
            : "Aucun BOLO ne correspond à ce filtre."}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {bolos.map((bolo) => (
            <article
              key={bolo.id}
              className={`flex flex-col gap-2 rounded-md border p-4 ${
                bolo.isActive ? "border-department/60 bg-department/5" : "border-border bg-card opacity-80"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{TYPE_LABELS[bolo.type] ?? bolo.type}</Badge>
                  {bolo.isActive ? (
                    <Badge className="bg-department text-department-foreground">En cours</Badge>
                  ) : (
                    <Badge variant="outline">Clôturé</Badge>
                  )}
                </div>
                {canManage ? (
                  <div className="flex items-center gap-1">
                    <EditBoloDialog
                      bolo={{
                        id: bolo.id,
                        type: bolo.type,
                        title: bolo.title,
                        description: bolo.description,
                        plate: bolo.plate,
                        imageUrl: bolo.imageUrl,
                        expiresAt: bolo.expiresAt ? bolo.expiresAt.toISOString().slice(0, 10) : null,
                      }}
                    />
                    <DeleteBoloButton boloId={bolo.id} />
                  </div>
                ) : null}
              </div>

              <h2 className="font-medium">{bolo.title}</h2>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{bolo.description}</p>

              {bolo.citizen ? (
                <Link href={`/citoyens/${bolo.citizen.id}`} className="text-sm hover:underline">
                  {bolo.citizen.lastName} {bolo.citizen.firstName}
                </Link>
              ) : null}
              {bolo.vehicle ? (
                <Link href={`/vehicules/${bolo.vehicle.id}`} className="text-sm hover:underline">
                  <span className="font-mono">{bolo.vehicle.plate}</span> — {bolo.vehicle.make}{" "}
                  {bolo.vehicle.model}
                </Link>
              ) : null}
              {!bolo.vehicle && bolo.plate ? (
                <span className="font-mono text-sm">{bolo.plate}</span>
              ) : null}

              <p className="text-xs text-muted-foreground">
                Diffusé par {bolo.createdBy.firstName} {bolo.createdBy.lastName} le{" "}
                {format(bolo.createdAt, "dd/MM/yyyy", { locale: fr })}
                {bolo.expiresAt ? ` · expire le ${format(bolo.expiresAt, "dd/MM/yyyy", { locale: fr })}` : ""}
              </p>

              {canManage ? (
                <div className="mt-1">
                  {bolo.isActive ? (
                    <CloseBoloButton boloId={bolo.id} />
                  ) : (
                    <ReopenBoloButton boloId={bolo.id} />
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <BolosPagination page={page} pageCount={pageCount(total, pageSize)} total={total} />
    </div>
  );
}
