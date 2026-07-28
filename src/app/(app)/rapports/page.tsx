import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePageParams, pageCount } from "@/lib/pagination";
import { SearchBox } from "@/components/search-box";
import { Button } from "@/components/ui/button";
import type { ReportRow } from "./columns";
import { ReportsTable } from "./reports-table";
import { ReportFilters } from "./report-filters";

export const metadata: Metadata = { title: "Rapports — MDT" };

const REPORT_TYPES = new Set([
  "INCIDENT",
  "ARREST",
  "CITATION",
  "INVESTIGATION",
  "FIELD_INTERVIEW",
  "USE_OF_FORCE",
  "EMS_INTERVENTION",
]);
const REPORT_STATUSES = new Set(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]);

export default async function RapportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  requirePagePermission(actor, "reports.view");

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePageParams(params, 25);
  const q = typeof params.q === "string" ? params.q : undefined;
  const sortField = params.sort === "occurredAt" ? "occurredAt" : "number";
  const sortDir = params.dir === "asc" ? "asc" : "desc";
  const canViewAll = can(actor, "reports.view_all");

  const typeFilter = typeof params.type === "string" && REPORT_TYPES.has(params.type) ? params.type : undefined;
  const statusFilter =
    typeof params.status === "string" && REPORT_STATUSES.has(params.status) ? params.status : undefined;
  const onlyMine = params.scope === "mine" || !canViewAll;

  const where: Prisma.ReportWhereInput = {
    ...(onlyMine ? { authorId: actor.id } : {}),
    ...(typeFilter ? { type: typeFilter as Prisma.EnumReportTypeFilter["equals"] } : {}),
    ...(statusFilter ? { status: statusFilter as Prisma.EnumReportStatusFilter["equals"] } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { content: { contains: q, mode: "insensitive" } },
            ...(Number.isInteger(Number(q)) ? [{ number: Number(q) }] : []),
          ],
        }
      : {}),
  };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: sortField === "occurredAt" ? { occurredAt: sortDir } : { number: sortDir },
      skip,
      take,
      include: {
        author: { select: { firstName: true, lastName: true } },
        department: { select: { shortName: true, color: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  const rows: ReportRow[] = reports.map((report) => ({
    id: report.id,
    number: report.number,
    type: report.type,
    title: report.title,
    status: report.status,
    occurredAt: report.occurredAt,
    authorName: `${report.author.lastName} ${report.author.firstName}`,
    departmentShortName: report.department.shortName,
    departmentColor: report.department.color,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Rapports</h1>
        {can(actor, "reports.create") ? (
          <Button asChild>
            <Link href="/rapports/nouveau">
              <Plus className="size-4" />
              Rédiger un rapport
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox placeholder="Titre, contenu, numéro…" />
        <ReportFilters canViewAll={canViewAll} />
      </div>

      {!canViewAll ? (
        <p className="text-xs text-muted-foreground">
          Vous ne voyez que les rapports dont vous êtes l&apos;auteur.
        </p>
      ) : null}

      <ReportsTable data={rows} page={page} pageCount={pageCount(total, pageSize)} total={total} />
    </div>
  );
}
