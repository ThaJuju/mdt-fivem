import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  INVOLVEMENT_ROLE_LABELS,
  OFFENSE_TYPE_LABELS,
  REPORT_TYPE_LABELS,
  formatJailTime,
  formatMoney,
} from "@/lib/labels";

export type RecordCharge = {
  id: string;
  offenseCode: string;
  offenseName: string;
  offenseType: string;
  count: number;
  fine: number;
  jailMinutes: number;
  points: number;
  isPaid: boolean;
  reportId: string;
  reportNumber: number;
  occurredAt: string;
};

export type RecordInvolvement = {
  id: string;
  role: string;
  reportId: string;
  reportNumber: number;
  reportTitle: string;
  reportType: string;
  occurredAt: string;
};

/**
 * Un crime, un délit et une contravention n'ont pas le même poids : la
 * distinction doit sauter aux yeux sans lire le libellé. Le rouge d'alerte
 * reste réservé aux mandats et aux 10-99, on utilise donc `destructive` pour
 * le crime.
 */
function offenseTypeClass(type: string): string {
  if (type === "FELONY") return "bg-destructive text-destructive-foreground";
  if (type === "MISDEMEANOR") return "border-department/60 text-department";
  return "text-muted-foreground";
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/80 bg-background/40 px-3 py-2">
      <p className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold leading-none">{value}</p>
    </div>
  );
}

/**
 * Casier judiciaire : les charges retenues (`isGuilty`) sur des rapports
 * **validés** uniquement. Un brouillon ou un rapport en attente n'est pas une
 * condamnation, et n'a rien à faire dans un casier.
 */
export function CriminalRecordSection({
  charges,
  isPartial,
}: {
  charges: RecordCharge[];
  isPartial: boolean;
}) {
  const totals = charges.reduce(
    (acc, charge) => ({
      fine: acc.fine + charge.fine * charge.count,
      jailMinutes: acc.jailMinutes + charge.jailMinutes * charge.count,
      points: acc.points + charge.points * charge.count,
      unpaid: acc.unpaid + (charge.isPaid ? 0 : charge.fine * charge.count),
    }),
    { fine: 0, jailMinutes: 0, points: 0, unpaid: 0 },
  );

  // Les charges arrivent triées par date décroissante : on les regroupe par
  // rapport en conservant cet ordre.
  const byReport = new Map<string, RecordCharge[]>();
  for (const charge of charges) {
    const existing = byReport.get(charge.reportId);
    if (existing) existing.push(charge);
    else byReport.set(charge.reportId, [charge]);
  }

  return (
    <Card>
      <CardHeader className="border-b border-border/70 pb-4">
        <div>
          <p className="eyebrow">Antécédents</p>
          <CardTitle className="mt-1">Casier judiciaire</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPartial ? (
          <p className="text-xs text-muted-foreground">
            Vous ne consultez que les rapports auxquels vous avez participé : ce casier peut être
            incomplet.
          </p>
        ) : null}

        {charges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune condamnation enregistrée sur un rapport validé.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <Total label="Amendes" value={formatMoney(totals.fine)} />
              <Total label="Reste dû" value={formatMoney(totals.unpaid)} />
              <Total label="Peine cumulée" value={formatJailTime(totals.jailMinutes)} />
              <Total label="Points" value={String(totals.points)} />
            </div>

            <div className="flex flex-col gap-3">
              {[...byReport.entries()].map(([reportId, reportCharges]) => (
                <div key={reportId} className="rounded-md border border-border bg-card p-3">
                  <div className="mb-2 flex flex-wrap items-baseline gap-2">
                    <Link href={`/rapports/${reportId}`} className="font-mono text-sm hover:underline">
                      #{reportCharges[0].reportNumber}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(reportCharges[0].occurredAt), "dd/MM/yyyy", { locale: fr })}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {reportCharges.map((charge) => (
                      <li key={charge.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant="outline" className={offenseTypeClass(charge.offenseType)}>
                          {OFFENSE_TYPE_LABELS[charge.offenseType] ?? charge.offenseType}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">{charge.offenseCode}</span>
                        <span className="min-w-0 flex-1">{charge.offenseName}</span>
                        {charge.count > 1 ? (
                          <span className="font-mono text-xs text-muted-foreground">×{charge.count}</span>
                        ) : null}
                        <span className="font-mono text-xs">{formatMoney(charge.fine * charge.count)}</span>
                        {charge.fine > 0 && !charge.isPaid ? (
                          <Badge variant="secondary" className="text-xs">
                            Impayée
                          </Badge>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Implications hors casier : savoir que quelqu'un a été victime trois fois ce
 * mois-ci change la lecture d'un appel. Le volet EMS en est exclu — le secret
 * médical vaut ici comme sur `/rapports/[id]`.
 */
export function InvolvementHistorySection({
  involvements,
  isPartial,
}: {
  involvements: RecordInvolvement[];
  isPartial: boolean;
}) {
  return (
    <Card>
      <CardHeader className="border-b border-border/70 pb-4">
        <div>
          <p className="eyebrow">Historique</p>
          <CardTitle className="mt-1">Implications dans des rapports</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isPartial ? (
          <p className="text-xs text-muted-foreground">
            Limité aux rapports auxquels vous avez participé.
          </p>
        ) : null}
        {involvements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cette personne n&apos;apparaît dans aucun rapport.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {involvements.map((involvement) => (
              <li
                key={involvement.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3 text-sm"
              >
                <Badge variant="outline">
                  {INVOLVEMENT_ROLE_LABELS[involvement.role] ?? involvement.role}
                </Badge>
                <Link href={`/rapports/${involvement.reportId}`} className="font-mono text-xs hover:underline">
                  #{involvement.reportNumber}
                </Link>
                <span className="min-w-0 flex-1 truncate">{involvement.reportTitle}</span>
                <span className="text-xs text-muted-foreground">
                  {REPORT_TYPE_LABELS[involvement.reportType] ?? involvement.reportType} ·{" "}
                  {format(new Date(involvement.occurredAt), "dd/MM/yyyy", { locale: fr })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
