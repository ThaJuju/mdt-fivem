"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { REPORT_TYPE_LABELS, REPORT_STATUS_LABELS } from "@/lib/labels";

export type ReportRow = {
  id: string;
  number: number;
  type: string;
  title: string;
  status: string;
  occurredAt: Date;
  authorName: string;
  departmentShortName: string;
  departmentColor: string;
};

function StatusBadge({ status }: { status: string }) {
  const label = REPORT_STATUS_LABELS[status] ?? status;
  if (status === "APPROVED") return <Badge variant="outline">{label}</Badge>;
  if (status === "SUBMITTED") return <Badge variant="secondary">{label}</Badge>;
  if (status === "REJECTED")
    return <Badge className="bg-destructive text-destructive-foreground">{label}</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">{label}</Badge>;
}

export const columns: ColumnDef<ReportRow>[] = [
  {
    accessorKey: "number",
    header: "N°",
    meta: { sortable: true },
    cell: ({ row }) => (
      <Link href={`/rapports/${row.original.id}`} className="font-mono text-sm hover:underline">
        #{row.original.number}
      </Link>
    ),
  },
  {
    accessorKey: "title",
    header: "Titre",
    cell: ({ row }) => (
      <Link href={`/rapports/${row.original.id}`} className="text-sm hover:underline">
        {row.original.title}
      </Link>
    ),
  },
  {
    id: "type",
    header: "Type",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {REPORT_TYPE_LABELS[row.original.type] ?? row.original.type}
      </span>
    ),
  },
  {
    id: "department",
    header: "Service",
    cell: ({ row }) => (
      <span className="flex items-center gap-2 font-mono text-xs">
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: row.original.departmentColor }}
          aria-hidden
        />
        {row.original.departmentShortName}
      </span>
    ),
  },
  {
    id: "author",
    header: "Auteur",
    cell: ({ row }) => <span className="text-sm">{row.original.authorName}</span>,
  },
  {
    accessorKey: "occurredAt",
    header: "Faits",
    meta: { sortable: true },
    cell: ({ row }) => (
      <span className="font-mono text-xs whitespace-nowrap">
        {format(row.original.occurredAt, "dd/MM/yyyy HH:mm", { locale: fr })}
      </span>
    ),
  },
  {
    id: "status",
    header: "Statut",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];
