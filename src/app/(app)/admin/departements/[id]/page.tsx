import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireActor, assertCan } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DepartmentForm } from "../department-form";
import { DeleteDepartmentButton } from "../delete-department-button";
import { GradesSection } from "./grades-section";

export const metadata: Metadata = { title: "Détail du département — Administration — MDT" };

export default async function DepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  assertCan(actor, "admin.departments.manage");

  const { id } = await params;

  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      grades: {
        orderBy: { level: "asc" },
        include: { _count: { select: { memberships: true } } },
      },
    },
  });

  if (!department) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-2xl font-semibold" style={{ color: department.color }}>
          {department.shortName}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{department.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <DepartmentForm
            department={{
              id: department.id,
              name: department.name,
              shortName: department.shortName,
              type: department.type,
              color: department.color,
              order: department.order,
              isActive: department.isActive,
            }}
          />
        </CardContent>
      </Card>

      <GradesSection
        departmentId={department.id}
        grades={department.grades.map((grade) => ({
          id: grade.id,
          name: grade.name,
          level: grade.level,
          salary: grade.salary,
          isDefault: grade.isDefault,
          permissions: grade.permissions,
          memberCount: grade._count.memberships,
        }))}
      />

      <div>
        <DeleteDepartmentButton departmentId={department.id} />
      </div>
    </div>
  );
}
