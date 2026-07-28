"use client";

import { DataTable } from "@/components/data-table";
import { columns, type ReportRow } from "./columns";

export function ReportsTable({
  data,
  page,
  pageCount,
  total,
}: {
  data: ReportRow[];
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
      emptyState="Aucun rapport ne correspond à ces critères."
    />
  );
}
