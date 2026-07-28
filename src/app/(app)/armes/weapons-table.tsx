"use client";

import { DataTable } from "@/components/data-table";
import { columns, type WeaponRow } from "./columns";

export function WeaponsTable({
  data,
  page,
  pageCount,
  total,
}: {
  data: WeaponRow[];
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
      emptyState="Aucune arme ne correspond à cette recherche."
    />
  );
}
