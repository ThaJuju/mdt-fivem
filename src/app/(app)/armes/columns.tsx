"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

export type WeaponRow = {
  id: string;
  serialNumber: string;
  model: string;
  type: string | null;
  ownerName: string | null;
  isStolen: boolean;
};

export const columns: ColumnDef<WeaponRow>[] = [
  {
    accessorKey: "serialNumber",
    header: "Numéro de série",
    meta: { sortable: true },
    cell: ({ row }) => (
      <Link href={`/armes/${row.original.id}`} className="font-mono text-sm hover:underline">
        {row.original.serialNumber}
      </Link>
    ),
  },
  {
    accessorKey: "model",
    header: "Modèle",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.model}
        {row.original.type ? ` · ${row.original.type}` : ""}
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
    cell: ({ row }) =>
      row.original.isStolen ? <Badge className="bg-department text-department-foreground">Volée</Badge> : null,
  },
];
