import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { expireStaleRecords } from "@/lib/expiry";
import { parsePageParams, pageCount } from "@/lib/pagination";
import { Badge } from "@/components/ui/badge";
import { SearchBox } from "@/components/search-box";
import { WarrantFilters } from "./warrant-filters";
import {
  RequestWarrantDialog,
  ApproveWarrantDialog,
  DenyWarrantButton,
  ExecuteWarrantButton,
} from "./warrant-dialogs";
import { WarrantsPagination } from "./warrants-pagination";

export const metadata: Metadata = { title: "Mandats — MDT" };

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  ACTIVE: "Actif",
  EXECUTED: "Exécuté",
  EXPIRED: "Expiré",
  DENIED: "Refusé",
};

const STATUSES = new Set(Object.keys(STATUS_LABELS));

export default async function MandatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  requirePagePermission(actor, "warrants.view");

  // Bascule les mandats arrivés à échéance avant d'afficher la liste.
  await expireStaleRecords();

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePageParams(params, 25);
  const statusFilter =
    typeof params.status === "string" && STATUSES.has(params.status) ? params.status : undefined;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const where: Prisma.WarrantWhereInput = {
    ...(statusFilter ? { status: statusFilter as Prisma.EnumWarrantStatusFilter["equals"] } : {}),
    ...(q
      ? {
          citizen: {
            is: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" as const } },
                { lastName: { contains: q, mode: "insensitive" as const } },
              ],
            },
          },
        }
      : {}),
  };

  const [warrants, total] = await Promise.all([
    prisma.warrant.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip,
      take,
      include: {
        citizen: { select: { id: true, firstName: true, lastName: true } },
        requestedBy: { select: { firstName: true, lastName: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.warrant.count({ where }),
  ]);

  await audit(actor, "warrant.list");

  const canApprove = can(actor, "warrants.approve");
  const canExecute = can(actor, "warrants.execute");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Mandats</h1>
        {can(actor, "warrants.request") ? <RequestWarrantDialog /> : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox placeholder="Nom de la personne recherchée…" />
        <WarrantFilters />
      </div>

      {warrants.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
          Aucun mandat ne correspond à ce filtre.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {warrants.map((warrant) => (
            <div
              key={warrant.id}
              className={`flex flex-col gap-2 rounded-md border p-4 ${
                warrant.status === "ACTIVE" ? "border-alert bg-alert/5" : "border-border bg-card"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {warrant.status === "ACTIVE" ? <AlertTriangle className="size-4 text-alert" /> : null}
                  <Badge variant="secondary">
                    {warrant.type === "ARREST" ? "Mandat d'arrêt" : "Perquisition"}
                  </Badge>
                  <Link href={`/citoyens/${warrant.citizen.id}`} className="font-medium hover:underline">
                    {warrant.citizen.lastName} {warrant.citizen.firstName}
                  </Link>
                  <Badge
                    className={
                      warrant.status === "ACTIVE" ? "bg-alert text-alert-foreground" : undefined
                    }
                    variant={warrant.status === "ACTIVE" ? "default" : "outline"}
                  >
                    {STATUS_LABELS[warrant.status] ?? warrant.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canApprove && warrant.status === "PENDING" ? (
                    <>
                      <ApproveWarrantDialog warrantId={warrant.id} />
                      <DenyWarrantButton warrantId={warrant.id} />
                    </>
                  ) : null}
                  {canExecute && warrant.status === "ACTIVE" ? (
                    <ExecuteWarrantButton warrantId={warrant.id} />
                  ) : null}
                </div>
              </div>

              <p className="text-sm whitespace-pre-wrap">{warrant.reason}</p>
              {warrant.address ? (
                <p className="text-sm text-muted-foreground">Adresse : {warrant.address}</p>
              ) : null}

              <p className="text-xs text-muted-foreground">
                Demandé par {warrant.requestedBy.firstName} {warrant.requestedBy.lastName} le{" "}
                {format(warrant.createdAt, "dd/MM/yyyy", { locale: fr })}
                {warrant.approvedBy
                  ? ` · traité par ${warrant.approvedBy.firstName} ${warrant.approvedBy.lastName}`
                  : ""}
                {warrant.expiresAt
                  ? ` · expire le ${format(warrant.expiresAt, "dd/MM/yyyy", { locale: fr })}`
                  : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      <WarrantsPagination page={page} pageCount={pageCount(total, pageSize)} total={total} />
    </div>
  );
}
