"use client";

import { DataTable } from "@/components/data-table";
import { columns, type LoginAttemptRow } from "./columns";

export function LoginAttemptsTable({
  data,
  page,
  pageCount,
  total,
}: {
  data: LoginAttemptRow[];
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
      emptyState="Aucune tentative de connexion ne correspond à ces filtres."
    />
  );
}
