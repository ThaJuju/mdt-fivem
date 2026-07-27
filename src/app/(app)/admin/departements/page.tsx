import type { Metadata } from "next";
import Link from "next/link";
import { requireActor, assertCan } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { CreateDepartmentDialog } from "./create-department-dialog";

export const metadata: Metadata = { title: "Départements — Administration — MDT" };

const TYPE_LABELS: Record<string, string> = {
  POLICE: "Police",
  EMS: "Secours (EMS)",
  DOJ: "Justice (DOJ)",
  ADMIN: "Administration",
};

export default async function DepartementsPage() {
  const actor = await requireActor();
  assertCan(actor, "admin.departments.manage");

  const departments = await prisma.department.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { grades: true, memberships: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {departments.length} département{departments.length > 1 ? "s" : ""}
        </p>
        <CreateDepartmentDialog />
      </div>

      {departments.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
          Aucun département. Créez-en un pour commencer à structurer les grades et les affectations.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((department) => (
            <Link
              key={department.id}
              href={`/admin/departements/${department.id}`}
              className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 hover:border-department"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold" style={{ color: department.color }}>
                  {department.shortName}
                </span>
                {!department.isActive ? <Badge variant="outline">Inactif</Badge> : null}
              </div>
              <span className="text-sm">{department.name}</span>
              <span className="text-xs text-muted-foreground">
                {TYPE_LABELS[department.type] ?? department.type} · {department._count.grades} grade
                {department._count.grades > 1 ? "s" : ""} · {department._count.memberships} membre
                {department._count.memberships > 1 ? "s" : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
