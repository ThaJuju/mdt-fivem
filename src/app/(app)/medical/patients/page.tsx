import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ArrowUpRight, HeartPulse, Search, UserPlus } from "lucide-react";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { parsePageParams, pageCount } from "@/lib/pagination";
import { SearchBox } from "@/components/search-box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MedicalPagination } from "../medical-pagination";

export const metadata: Metadata = { title: "Patients — EMS MDT" };

export default async function MedicalPatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  requirePagePermission(actor, "medical.view");

  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePageParams(params, 25);
  const q = typeof params.q === "string" ? params.q : undefined;
  const where: Prisma.CitizenWhereInput = q
    ? {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const [citizens, total] = await Promise.all([
    prisma.citizen.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip,
      take,
      include: { medicalRecord: true },
    }),
    prisma.citizen.count({ where }),
  ]);

  await audit(actor, "medical.list");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Registre clinique</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consultez les antécédents, allergies, traitements et aptitudes médicales.
          </p>
        </div>
        {can(actor, "medical.edit") ? (
          <Button asChild><Link href="/medical/patients/nouveau"><UserPlus className="size-4" />Nouveau patient</Link></Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox placeholder="Nom ou téléphone…" />
      </div>

      {citizens.length === 0 ? (
        <div className="panel-surface flex flex-col items-center rounded-lg border-dashed p-10 text-center">
          <Search className="mb-3 size-6 text-muted-foreground" />
          <p className="font-medium">Aucun patient trouvé</p>
          <p className="mt-1 text-sm text-muted-foreground">Modifiez les termes de votre recherche.</p>
        </div>
      ) : (
        <div className="panel-surface overflow-x-auto rounded-lg">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background/35 text-left text-muted-foreground">
              <tr>
                <th className="p-3 text-xs font-semibold tracking-wide uppercase">Patient</th>
                <th className="p-3 text-xs font-semibold tracking-wide uppercase">Groupe</th>
                <th className="p-3 text-xs font-semibold tracking-wide uppercase">Alertes médicales</th>
                <th className="p-3 text-xs font-semibold tracking-wide uppercase">Aptitude</th>
                <th className="p-3 text-xs font-semibold tracking-wide uppercase">État du dossier</th>
                <th className="w-10 p-3" />
              </tr>
            </thead>
            <tbody>
              {citizens.map((citizen) => {
                const alerts = [
                  ...(citizen.medicalRecord?.allergies ?? []),
                  ...(citizen.medicalRecord?.conditions ?? []),
                ];
                return (
                  <tr key={citizen.id} className="group border-b border-border/70 last:border-0 hover:bg-accent/45">
                    <td className="p-3">
                      <Link href={`/medical/${citizen.id}`} className="font-medium hover:text-department">
                        {citizen.lastName} {citizen.firstName}
                      </Link>
                    </td>
                    <td className="p-3 font-mono">{citizen.medicalRecord?.bloodType ?? "—"}</td>
                    <td className="max-w-sm p-3 text-muted-foreground">
                      <span className="line-clamp-1">{alerts.length > 0 ? alerts.join(", ") : "Aucune renseignée"}</span>
                    </td>
                    <td className="p-3">
                      {citizen.medicalRecord?.isFitForDuty === true ? (
                        <Badge variant="outline">Apte</Badge>
                      ) : citizen.medicalRecord?.isFitForDuty === false ? (
                        <Badge variant="destructive">Inapte</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Non évaluée</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        <HeartPulse className={citizen.medicalRecord ? "size-3.5 text-department" : "size-3.5"} />
                        {citizen.medicalRecord ? "Renseigné" : "À compléter"}
                      </span>
                    </td>
                    <td className="p-3">
                      <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <MedicalPagination page={page} pageCount={pageCount(total, pageSize)} total={total} />
    </div>
  );
}
