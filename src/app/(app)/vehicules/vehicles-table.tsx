"use client";

import { DataTable } from "@/components/data-table";
import { columns, type VehicleRow } from "./columns";

export function VehiclesTable({
  data,
  page,
  pageCount,
  total,
}: {
  data: VehicleRow[];
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
      emptyState="Aucun véhicule ne correspond à cette recherche."
    />
  );
}
