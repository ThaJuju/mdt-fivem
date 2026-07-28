import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { HeartPulse } from "lucide-react";
import { requireActor, requirePagePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { parsePageParams, pageCount } from "@/lib/pagination";
import { SearchBox } from "@/components/search-box";
import { Badge } from "@/components/ui/badge";
import { MedicalPagination } from "./medical-pagination";

export const metadata: Metadata = { title: "Dossiers médicaux — MDT" };

export default async function MedicalPage({
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
        ],
      }
    : {};

  const [citizens, total] = await Promise.all([
    prisma.citizen.findMany({
      where,
      orderBy: { lastName: "asc" },
      skip,
      take,
      include: { medicalRecord: true },
    }),
    prisma.citizen.count({ where }),
  ]);

  await audit(actor, "medical.list");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Dossiers médicaux</h1>
        <SearchBox placeholder="Rechercher un patient…" />
      </div>

      {citizens.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
          Aucun patient ne correspond à cette recherche.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="p-2 font-medium">Patient</th>
                <th className="p-2 font-medium">Groupe sanguin</th>
                <th className="p-2 font-medium">Allergies</th>
                <th className="p-2 font-medium">Aptitude</th>
                <th className="p-2 font-medium">Dossier</th>
              </tr>
            </thead>
            <tbody>
              {citizens.map((citizen) => (
                <tr key={citizen.id} className="border-b border-border last:border-0">
                  <td className="p-2">
                    <Link href={`/medical/${citizen.id}`} className="hover:underline">
                      {citizen.lastName} {citizen.firstName}
                    </Link>
                  </td>
                  <td className="p-2 font-mono">{citizen.medicalRecord?.bloodType ?? "—"}</td>
                  <td className="p-2 text-muted-foreground">
                    {citizen.medicalRecord && citizen.medicalRecord.allergies.length > 0
                      ? citizen.medicalRecord.allergies.join(", ")
                      : "—"}
                  </td>
                  <td className="p-2">
                    {citizen.medicalRecord?.isFitForDuty === true ? (
                      <Badge variant="outline">Apte</Badge>
                    ) : citizen.medicalRecord?.isFitForDuty === false ? (
                      <Badge className="bg-destructive text-destructive-foreground">Inapte</Badge>
                    ) : (
                      <span className="text-muted-foreground">Non évaluée</span>
                    )}
                  </td>
                  <td className="p-2">
                    {citizen.medicalRecord ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <HeartPulse className="size-3.5" />
                        Renseigné
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Vide</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MedicalPagination page={page} pageCount={pageCount(total, pageSize)} total={total} />
    </div>
  );
}
