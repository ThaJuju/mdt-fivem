"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export type AuditRow = {
  id: string;
  createdAt: Date;
  username: string | null;
  userLabel: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  ip: string | null;
  metadata: Prisma.JsonValue;
};

export const columns: ColumnDef<AuditRow>[] = [
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => (
      <span className="font-mono text-sm whitespace-nowrap">
        {format(row.original.createdAt, "dd/MM/yyyy HH:mm:ss", { locale: fr })}
      </span>
    ),
  },
  {
    id: "user",
    header: "Utilisateur",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-sm">{row.original.userLabel}</span>
        {row.original.username ? (
          <span className="font-mono text-xs text-muted-foreground">@{row.original.username}</span>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.action}</span>,
  },
  {
    id: "entity",
    header: "Entité",
    cell: ({ row }) =>
      row.original.entity ? (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.entity}
          {row.original.entityId ? ` #${row.original.entityId.slice(0, 8)}` : ""}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "ip",
    header: "IP",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.ip ?? "—"}</span>,
  },
  {
    id: "metadata",
    header: "Détails",
    cell: ({ row }) => {
      if (row.original.metadata === null || row.original.metadata === undefined) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Voir</summary>
          <pre className="mt-1 max-w-xs overflow-x-auto rounded bg-muted p-2 font-mono">
            {JSON.stringify(row.original.metadata, null, 2)}
          </pre>
        </details>
      );
    },
  },
];
