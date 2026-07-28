"use client";

import { DataTable } from "@/components/data-table";
import { columns, type CitizenRow } from "./columns";

/**
 * Les définitions de colonnes contiennent des fonctions `cell` : elles ne
 * peuvent pas traverser la frontière serveur → client. Ce composant client
 * les garde de son côté, la page serveur ne passe que des données sérialisables.
 */
export function CitizensTable({
  data,
  page,
  pageCount,
  total,
}: {
  data: CitizenRow[];
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
      emptyState="Aucun citoyen ne correspond à cette recherche."
    />
  );
}
