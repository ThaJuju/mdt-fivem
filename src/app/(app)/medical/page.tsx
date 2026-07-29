import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Ambulance, ArrowRight, FilePlus2, HeartPulse, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TRIAGE_LABELS, triageClass } from "@/lib/medical-labels";

export const metadata: Metadata = { title: "Centre EMS — MDT" };

export default async function MedicalDashboardPage() {
  const actor = await requireActor();
  requirePagePermission(actor, "medical.view");

  const emsUnitFilter = {
    members: {
      some: {
        user: {
          memberships: {
            some: { status: "ACTIVE" as const, department: { type: "EMS" as const } },
          },
        },
      },
    },
  };

  const [
    patientCount,
    recordCount,
    interventionCount,
    transportedCount,
    activeUnits,
    recentInterventions,
  ] = await Promise.all([
    prisma.citizen.count(),
    prisma.medicalRecord.count(),
    prisma.emsDetail.count(),
    prisma.emsDetail.count({ where: { outcome: "TRANSPORTED" } }),
    prisma.unit.count({
      where: { isActive: true, status: { not: "OFF_DUTY" }, ...emsUnitFilter },
    }),
    prisma.report.findMany({
      where: { emsDetail: { isNot: null } },
      orderBy: { occurredAt: "desc" },
      take: 6,
      select: {
        id: true,
        number: true,
        title: true,
        location: true,
        occurredAt: true,
        emsDetail: true,
        involvements: {
          where: { role: "PATIENT" },
          take: 2,
          select: { citizen: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
  ]);

  await audit(actor, "medical.dashboard");

  const completionRate = patientCount > 0 ? Math.round((recordCount / patientCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-7">
      <section className="panel-surface relative overflow-hidden rounded-xl">
        <div className="pointer-events-none absolute -top-28 right-0 size-96 rounded-full bg-department/12 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-7 px-6 py-7 sm:px-8 sm:py-9 lg:flex-row lg:items-end">
          <div className="flex items-start gap-4">
            <span className="hidden size-12 shrink-0 items-center justify-center rounded-lg border border-department/30 bg-department/10 text-department shadow-[0_0_30px_color-mix(in_srgb,var(--department-accent)_14%,transparent)] sm:flex">
              <Ambulance className="size-6" />
            </span>
            <div>
              <div className="eyebrow mb-3 flex items-center gap-2">
                <span className="status-dot" />
                Console opérationnelle EMS
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Centre EMS</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Vision synthétique de l’activité préhospitalière et des dossiers patients.
              </p>
            </div>
          </div>
          {can(actor, "medical.reports.create") ? (
            <Button asChild className="h-10 shrink-0 px-4">
              <Link href="/medical/interventions/nouvelle"><FilePlus2 className="size-4" />Nouvelle intervention</Link>
            </Button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Patients enregistrés", value: patientCount, detail: `${recordCount} dossiers ouverts`, icon: Users },
          { label: "Dossiers complétés", value: `${completionRate}%`, detail: "du registre patient", icon: HeartPulse },
          { label: "Interventions EMS", value: interventionCount, detail: `${transportedCount} transports`, icon: Ambulance },
          { label: "Unités en service", value: activeUnits, detail: "équipes EMS actives", icon: Activity },
        ].map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className="panel-surface rounded-lg p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
              <Icon className="size-4 text-department" />
            </div>
            <p className="mt-4 font-mono text-3xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </article>
        ))}
      </section>

      <section className="panel-surface overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
            <div>
              <p className="eyebrow">Journal clinique</p>
              <h2 className="mt-1 font-semibold">Interventions récentes</h2>
            </div>
            <Link href="/medical/interventions" className="flex items-center gap-1 text-xs font-medium text-department hover:underline">
              Tout consulter <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {recentInterventions.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Aucune intervention EMS enregistrée.
            </div>
          ) : (
            <div className="divide-y divide-border/70">
              {recentInterventions.map((report) => {
                const detail = report.emsDetail;
                const patients = report.involvements.map(({ citizen }) => `${citizen.firstName} ${citizen.lastName}`);
                return (
                  <Link
                    key={report.id}
                    href={`/rapports/${report.id}`}
                    className="group grid gap-3 px-5 py-4 transition-colors hover:bg-accent/45 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                  >
                    <span className="font-mono text-xs text-muted-foreground">#{report.number}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-department">{report.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {patients.join(", ") || "Patient non renseigné"} · {report.location ?? "Lieu non renseigné"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      {detail ? (
                        <Badge className={triageClass(detail.triage)}>
                          {TRIAGE_LABELS[detail.triage]?.split(" — ")[0] ?? detail.triage}
                        </Badge>
                      ) : null}
                      <span className="font-mono text-[0.6875rem] text-muted-foreground">
                        {format(report.occurredAt, "dd MMM HH:mm", { locale: fr })}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
      </section>
    </div>
  );
}
