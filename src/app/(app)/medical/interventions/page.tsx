import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Ambulance, ArrowUpRight, MapPin, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { parsePageParams, pageCount } from "@/lib/pagination";
import { SearchBox } from "@/components/search-box";
import { SimplePagination } from "@/components/simple-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EMS_OUTCOME_LABELS, TRIAGE_LABELS, triageClass } from "@/lib/medical-labels";

export const metadata: Metadata = { title: "Interventions — EMS MDT" };

export default async function MedicalInterventionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  requirePagePermission(actor, "medical.view");
  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePageParams(params, 20);
  const q = typeof params.q === "string" ? params.q : undefined;
  const outcome = typeof params.outcome === "string" ? params.outcome : undefined;

  const where: Prisma.ReportWhereInput = {
    emsDetail: {
      is: {
        ...(outcome && ["TREATED_ON_SCENE", "TRANSPORTED", "REFUSED_CARE", "DECEASED"].includes(outcome)
          ? { outcome: outcome as "TREATED_ON_SCENE" | "TRANSPORTED" | "REFUSED_CARE" | "DECEASED" }
          : {}),
      },
    },
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
            { emsDetail: { is: { chiefComplaint: { contains: q, mode: "insensitive" } } } },
            {
              involvements: {
                some: {
                  citizen: {
                    OR: [
                      { firstName: { contains: q, mode: "insensitive" } },
                      { lastName: { contains: q, mode: "insensitive" } },
                    ],
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        number: true,
        title: true,
        location: true,
        occurredAt: true,
        emsDetail: true,
        author: { select: { firstName: true, lastName: true } },
        involvements: {
          where: { role: "PATIENT" },
          select: { citizen: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    prisma.report.count({ where }),
  ]);

  await audit(actor, "medical.interventions.list");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Activité préhospitalière</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Interventions EMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Triage, soins administrés, transports et issues de prise en charge.</p>
        </div>
        {can(actor, "medical.reports.create") ? (
          <Button asChild><Link href="/medical/interventions/nouvelle"><Plus className="size-4" />Nouvelle intervention</Link></Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox placeholder="Patient, motif ou lieu…" />
      </div>

      <div className="panel-surface overflow-hidden rounded-lg">
        {reports.length === 0 ? (
          <div className="flex flex-col items-center p-12 text-center">
            <Ambulance className="mb-3 size-7 text-muted-foreground" />
            <p className="font-medium">Aucune intervention trouvée</p>
            <p className="mt-1 text-sm text-muted-foreground">Les rapports EMS apparaîtront ici.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/70">
            {reports.map((report) => {
              const detail = report.emsDetail!;
              const patients = report.involvements.map(({ citizen }) => `${citizen.firstName} ${citizen.lastName}`);
              return (
                <Link key={report.id} href={`/rapports/${report.id}`} className="group grid gap-4 p-5 hover:bg-accent/45 lg:grid-cols-[5rem_1fr_11rem_10rem_auto] lg:items-center">
                  <span className="font-mono text-sm font-semibold text-department">#{report.number}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium group-hover:text-department">{report.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{patients.join(", ") || "Patient non renseigné"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={triageClass(detail.triage)}>{TRIAGE_LABELS[detail.triage] ?? detail.triage}</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium">{EMS_OUTCOME_LABELS[detail.outcome] ?? detail.outcome}</p>
                    {detail.hospital ? <p className="mt-1 truncate text-xs text-muted-foreground">{detail.hospital}</p> : null}
                  </div>
                  <div className="flex items-center justify-between gap-4 lg:justify-end">
                    <div className="text-right">
                      <p className="font-mono text-xs">{format(report.occurredAt, "dd/MM/yy HH:mm", { locale: fr })}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{report.location ?? "—"}</p>
                    </div>
                    <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-department" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <SimplePagination page={page} pageCount={pageCount(total, pageSize)} total={total} noun="intervention" />
    </div>
  );
}
