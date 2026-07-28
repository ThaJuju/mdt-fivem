import type { Metadata } from "next";
import { requireActor, requirePagePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportForm } from "../report-form";

export const metadata: Metadata = { title: "Nouveau rapport — MDT" };

export default async function NouveauRapportPage() {
  const actor = await requireActor();
  requirePagePermission(actor, "reports.create");

  // Un rapport ne peut être rattaché qu'à un service dont l'agent est membre actif.
  const departmentIds = actor.memberships.filter((m) => m.status === "ACTIVE").map((m) => m.departmentId);
  const departments = await prisma.department.findMany({
    where: actor.isSuperAdmin ? { isActive: true } : { id: { in: departmentIds }, isActive: true },
    orderBy: { order: "asc" },
    select: { id: true, shortName: true, name: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Rédiger un rapport</h1>

      {departments.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
          Vous n&apos;êtes affecté à aucun service actif : demandez une affectation avant de rédiger un
          rapport.
        </p>
      ) : (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportForm departments={departments} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
