"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { differenceInYears } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export type CitizenRow = {
  id: string;
  firstName: string;
  lastName: string;
  dob: Date;
  phone: string | null;
  isDeceased: boolean;
  hasFlaggedNote: boolean;
};

export const columns: ColumnDef<CitizenRow>[] = [
  {
    accessorKey: "lastName",
    header: "Nom",
    meta: { sortable: true },
    cell: ({ row }) => (
      <Link href={`/citoyens/${row.original.id}`} className="flex items-center gap-2 hover:underline">
        {row.original.hasFlaggedNote ? (
          <AlertTriangle className="size-4 text-alert" aria-label="Note signalée" />
        ) : null}
        {row.original.lastName} {row.original.firstName}
      </Link>
    ),
  },
  {
    id: "age",
    header: "Âge",
    cell: ({ row }) => <span className="font-mono text-sm">{differenceInYears(new Date(), row.original.dob)} ans</span>,
  },
  {
    accessorKey: "phone",
    header: "Téléphone",
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.phone ?? "—"}</span>,
  },
  {
    id: "statut",
    header: "Statut",
    cell: ({ row }) => (row.original.isDeceased ? <Badge variant="outline">Décédé</Badge> : null),
  },
];
