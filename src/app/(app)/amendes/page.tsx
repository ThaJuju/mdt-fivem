import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Prisma } from "@prisma/client";
import { requireActor, requirePagePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/labels";
import { sumFineAmounts } from "@/lib/fines";
import { pageCount, parsePageParams } from "@/lib/pagination";
import { SearchBox } from "@/components/search-box";
import { SimplePagination } from "@/components/simple-pagination";
import { Badge } from "@/components/ui/badge";
import { CollectButton } from "./collect-button";

export const metadata: Metadata = { title: "Amendes impayées — MDT" };

const AGE_OPTIONS = [
  { value: "all", label: "Toutes" },
  { value: "30", label: "Plus de 30 jours" },
  { value: "60", label: "Plus de 60 jours" },
  { value: "90", label: "Plus de 90 jours" },
];

export default async function FinesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  requirePagePermission(actor, "charges.collect");
  const params = await searchParams;
  const { page, pageSize, skip, take } = parsePageParams(params, 25);
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const age = typeof params.age === "string" && ["30", "60", "90"].includes(params.age)
    ? Number(params.age)
    : null;
  const cutoff = age ? new Date(Date.now() - age * 24 * 60 * 60 * 1000) : null;

  const where: Prisma.ChargeWhereInput = {
    isPaid: false,
    isGuilty: true,
    report: { status: "APPROVED" },
    ...(cutoff ? { createdAt: { lt: cutoff } } : {}),
    ...(q
      ? {
          citizen: {
            is: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" as const } },
                { lastName: { contains: q, mode: "insensitive" as const } },
              ],
            },
          },
        }
      : {}),
  };

  const [charges, total] = await Promise.all([
    prisma.charge.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip,
      take,
      include: {
        citizen: { select: { id: true, firstName: true, lastName: true } },
        offense: { select: { code: true, name: true } },
        report: { select: { id: true, number: true } },
      },
    }),
    prisma.charge.count({ where }),
  ]);
  const totalDue = sumFineAmounts(charges);
  await audit(actor, "charge.unpaid.list", { metadata: { age, results: total } });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Recouvrement</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Amendes impayées</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} amende{total > 1 ? "s" : ""} · {formatMoney(totalDue)} sur cette page
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox placeholder="Nom du citoyen…" />
        <div className="flex flex-wrap gap-1">
          {AGE_OPTIONS.map((option) => {
            const query = new URLSearchParams();
            if (q) query.set("q", q);
            if (option.value !== "all") query.set("age", option.value);
            return (
              <Link
                key={option.value}
                href={`/amendes?${query.toString()}`}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  (age?.toString() ?? "all") === option.value
                    ? "bg-department/15 text-department"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>

      {charges.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          Aucune amende impayée ne correspond à ces filtres.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Citoyen</th>
                <th className="p-3 font-medium">Infraction</th>
                <th className="p-3 font-medium">Rapport</th>
                <th className="p-3 font-medium">Depuis</th>
                <th className="p-3 text-right font-medium">Montant</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {charges.map((charge) => (
                <tr key={charge.id} className="border-b last:border-0">
                  <td className="p-3">
                    <Link href={`/citoyens/${charge.citizen.id}`} className="font-medium hover:underline">
                      {charge.citizen.lastName} {charge.citizen.firstName}
                    </Link>
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-xs">{charge.offense.code}</span> — {charge.offense.name}
                    {charge.count > 1 ? <Badge variant="outline" className="ml-2">×{charge.count}</Badge> : null}
                  </td>
                  <td className="p-3">
                    <Link href={`/rapports/${charge.report.id}`} className="font-mono hover:underline">
                      #{charge.report.number}
                    </Link>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {format(charge.createdAt, "dd/MM/yyyy", { locale: fr })}
                  </td>
                  <td className="p-3 text-right font-mono font-medium">
                    {formatMoney(charge.fine * charge.count)}
                  </td>
                  <td className="p-3 text-right"><CollectButton chargeId={charge.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <SimplePagination page={page} pageCount={pageCount(total, pageSize)} total={total} noun="amende" />
    </div>
  );
}
