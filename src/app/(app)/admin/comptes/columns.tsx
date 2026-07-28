"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

export type UserRow = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  primaryMembership: { departmentShortName: string; departmentColor: string; gradeName: string } | null;
};

export const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: "lastName",
    header: "Nom",
    meta: { sortable: true },
    cell: ({ row }) => (
      <Link href={`/admin/comptes/${row.original.id}`} className="hover:underline">
        {row.original.lastName} {row.original.firstName}
      </Link>
    ),
  },
  {
    accessorKey: "username",
    header: "Identifiant",
    meta: { sortable: true },
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.username}</span>,
  },
  {
    id: "affectation",
    header: "Affectation",
    cell: ({ row }) => {
      const membership = row.original.primaryMembership;
      if (!membership) return <span className="text-muted-foreground">Aucune</span>;
      return (
        <span className="flex items-center gap-2 text-sm">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: membership.departmentColor }}
            aria-hidden
          />
          {membership.departmentShortName} — {membership.gradeName}
        </span>
      );
    },
  },
  {
    id: "statut",
    header: "Statut",
    cell: ({ row }) => (
      <div className="flex gap-1.5">
        {row.original.isSuperAdmin ? <Badge variant="secondary">Super-admin</Badge> : null}
        {row.original.isActive ? (
          <Badge variant="outline">Actif</Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Inactif
          </Badge>
        )}
      </div>
    ),
  },
];
