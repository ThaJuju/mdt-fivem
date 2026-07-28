"use client";

import { DataTable } from "@/components/data-table";
import { columns, type AuditRow } from "./columns";

export function AuditTable({
  data,
  page,
  pageCount,
  total,
}: {
  data: AuditRow[];
  page: number;
  pageCount: number;
  total: number;
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      page={page}
      pageCount={pageCount}
      total={total}
      emptyState="Aucune entrée ne correspond à ces filtres."
    />
  );
}
