import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { requireActor, assertCan } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePageParams, pageCount } from "@/lib/pagination";
import { DataTable } from "@/components/data-table";
import { AuditFilters } from "./audit-filters";
import { columns, type AuditRow } from "./columns";

export const metadata: Metadata = { title: "Journal d'audit — Administration — MDT" };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  assertCan(actor, "admin.audit.view");

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePageParams(params, 50);

  const actionFilter = typeof params.action === "string" && params.action ? params.action : undefined;
  const entityFilter = typeof params.entity === "string" && params.entity ? params.entity : undefined;
  const userFilter = typeof params.user === "string" && params.user ? params.user : undefined;
  const fromFilter = typeof params.from === "string" && params.from ? params.from : undefined;
  const toFilter = typeof params.to === "string" && params.to ? params.to : undefined;

  const where: Prisma.AuditLogWhereInput = {
    ...(actionFilter ? { action: { contains: actionFilter, mode: "insensitive" } } : {}),
    ...(entityFilter ? { entity: { contains: entityFilter, mode: "insensitive" } } : {}),
    ...(userFilter ? { user: { username: { contains: userFilter, mode: "insensitive" } } } : {}),
    ...(fromFilter || toFilter
      ? {
          createdAt: {
            ...(fromFilter ? { gte: new Date(`${fromFilter}T00:00:00`) } : {}),
            ...(toFilter
              ? { lt: new Date(new Date(`${toFilter}T00:00:00`).getTime() + 24 * 60 * 60 * 1000) }
              : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { user: { select: { username: true, firstName: true, lastName: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const rows: AuditRow[] = logs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt,
    username: log.user?.username ?? null,
    userLabel: log.user ? `${log.user.firstName} ${log.user.lastName}` : "Système",
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    ip: log.ip,
    metadata: log.metadata,
  }));

  return (
    <div className="flex flex-col gap-4">
      <AuditFilters />
      <DataTable
        columns={columns}
        data={rows}
        page={page}
        pageCount={pageCount(total, pageSize)}
        total={total}
        emptyState="Aucune entrée ne correspond à ces filtres."
      />
    </div>
  );
}
