"use client";

import type { ReactNode } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    sortable?: boolean;
  }
}

type DataTableProps<TData> = {
  columns: ColumnDef<TData>[];
  data: TData[];
  page: number;
  pageCount: number;
  total: number;
  emptyState?: ReactNode;
};

/**
 * Table générique tri/pagination côté serveur : l'état vit dans les
 * paramètres d'URL (`page`, `sort`, `dir`), pas dans le state React. Chaque
 * page appelante lit ces paramètres côté serveur pour interroger Prisma et
 * passe le résultat déjà paginé/trié ici.
 */
export function DataTable<TData>({ columns, data, page, pageCount, total, emptyState }: DataTableProps<TData>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount,
  });

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleSort(columnId: string) {
    const params = new URLSearchParams(searchParams.toString());
    const currentSort = params.get("sort");
    const currentDir = params.get("dir");
    if (currentSort === columnId && currentDir === "asc") {
      params.set("dir", "desc");
    } else if (currentSort === columnId && currentDir === "desc") {
      params.delete("sort");
      params.delete("dir");
    } else {
      params.set("sort", columnId);
      params.set("dir", "asc");
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  const currentSort = searchParams.get("sort");
  const currentDir = searchParams.get("dir");

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortable = header.column.columnDef.meta?.sortable;
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(header.column.id)}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {currentSort === header.column.id ? (
                            currentDir === "asc" ? (
                              <ArrowUp className="size-3.5" />
                            ) : (
                              <ArrowDown className="size-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  {emptyState ?? "Aucun résultat."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {total} résultat{total > 1 ? "s" : ""} — page {page} sur {pageCount}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              <ChevronLeft className="size-4" />
              Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => goToPage(page + 1)}>
              Suivant
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
