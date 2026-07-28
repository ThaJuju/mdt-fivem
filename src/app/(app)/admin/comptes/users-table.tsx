"use client";

import { DataTable } from "@/components/data-table";
import { columns, type UserRow } from "./columns";

export function UsersTable({
  data,
  page,
  pageCount,
  total,
}: {
  data: UserRow[];
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
      emptyState="Aucun compte ne correspond à cette recherche."
    />
  );
}
