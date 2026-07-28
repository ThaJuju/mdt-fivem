"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

export type VehicleRow = {
  id: string;
  plate: string;
  make: string;
  model: string;
  color: string | null;
  ownerName: string | null;
  isStolen: boolean;
  isImpounded: boolean;
};

export const columns: ColumnDef<VehicleRow>[] = [
  {
    accessorKey: "plate",
    header: "Plaque",
    meta: { sortable: true },
    cell: ({ row }) => (
      <Link href={`/vehicules/${row.original.id}`} className="font-mono text-sm hover:underline">
        {row.original.plate}
      </Link>
    ),
  },
  {
    id: "vehicule",
    header: "Véhicule",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.make} {row.original.model}
        {row.original.color ? ` · ${row.original.color}` : ""}
      </span>
    ),
  },
  {
    id: "owner",
    header: "Propriétaire",
    cell: ({ row }) => <span className="text-sm">{row.original.ownerName ?? "—"}</span>,
  },
  {
    id: "statut",
    header: "Statut",
    cell: ({ row }) => (
      <div className="flex gap-1.5">
        {row.original.isStolen ? <Badge className="bg-alert text-alert-foreground">Volé</Badge> : null}
        {row.original.isImpounded ? <Badge variant="secondary">Fourrière</Badge> : null}
      </div>
    ),
  },
];
