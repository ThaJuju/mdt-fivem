"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export type LoginAttemptRow = {
  id: string;
  createdAt: Date;
  identifier: string;
  ip: string | null;
  succeeded: boolean;
  /** Faux quand aucun compte ne porte cet identifiant — signe d'un balayage. */
  accountExists: boolean;
};

export const columns: ColumnDef<LoginAttemptRow>[] = [
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
    accessorKey: "identifier",
    header: "Identifiant saisi",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm">{row.original.identifier}</span>
        {row.original.accountExists ? null : (
          <span className="text-xs text-muted-foreground">compte inexistant</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "ip",
    header: "Adresse",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">{row.original.ip ?? "inconnue"}</span>
    ),
  },
  {
    accessorKey: "succeeded",
    header: "Issue",
    cell: ({ row }) =>
      row.original.succeeded ? (
        <Badge variant="outline">Réussie</Badge>
      ) : (
        <Badge className="bg-destructive text-destructive-foreground">Échouée</Badge>
      ),
  },
];
