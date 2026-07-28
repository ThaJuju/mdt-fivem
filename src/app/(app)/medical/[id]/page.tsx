import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TRIAGE_LABELS, EMS_OUTCOME_LABELS, triageClass } from "@/lib/medical-labels";
import { MedicalRecordForm, FitnessForm } from "./medical-form";

export const metadata: Metadata = { title: "Dossier médical — MDT" };

export default async function MedicalRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  requirePagePermission(actor, "medical.view");

  const { id } = await params;

  const citizen = await prisma.citizen.findUnique({
    where: { id },
    include: {
      medicalRecord: true,
      reportInvolvements: {
        where: { report: { emsDetail: { isNot: null } } },
        orderBy: { report: { occurredAt: "desc" } },
        take: 20,
        include: {
          report: {
            select: {
              id: true,
              number: true,
              title: true,
              occurredAt: true,
              emsDetail: true,
            },
          },
        },
      },
    },
  });

  if (!citizen) notFound();

  // Consulter un dossier médical est une donnée sensible : tracé au même
  // titre qu'une modification.
  await audit(actor, "medical.view", { entity: "Citizen", entityId: citizen.id });

  const canEdit = can(actor, "medical.edit");
  const canCertify = can(actor, "medical.fitness.certify");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {citizen.firstName} {citizen.lastName}
        </h1>
        <Link href={`/citoyens/${citizen.id}`} className="text-sm text-muted-foreground hover:underline">
          Voir la fiche civile
        </Link>
        {citizen.isDeceased ? <Badge variant="outline">Décédé</Badge> : null}
        {citizen.medicalRecord?.isFitForDuty === true ? (
          <Badge variant="outline">Apte au port d&apos;arme</Badge>
        ) : citizen.medicalRecord?.isFitForDuty === false ? (
          <Badge className="bg-destructive text-destructive-foreground">Inapte</Badge>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dossier</CardTitle>
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <MedicalRecordForm
                citizenId={citizen.id}
                record={
                  citizen.medicalRecord
                    ? {
                        bloodType: citizen.medicalRecord.bloodType,
                        allergies: citizen.medicalRecord.allergies,
                        conditions: citizen.medicalRecord.conditions,
                        medications: citizen.medicalRecord.medications,
                        notes: citizen.medicalRecord.notes,
                      }
                    : null
                }
              />
            ) : citizen.medicalRecord ? (
              <dl className="flex flex-col gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Groupe sanguin</dt>
                  <dd className="font-mono">{citizen.medicalRecord.bloodType ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Allergies</dt>
                  <dd>{citizen.medicalRecord.allergies.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Antécédents</dt>
                  <dd>{citizen.medicalRecord.conditions.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Traitements</dt>
                  <dd>{citizen.medicalRecord.medications.join(", ") || "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun dossier médical n&apos;a encore été ouvert pour ce patient.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {canCertify ? (
            <Card>
              <CardHeader>
                <CardTitle>Aptitude médicale</CardTitle>
              </CardHeader>
              <CardContent>
                <FitnessForm
                  citizenId={citizen.id}
                  isFitForDuty={citizen.medicalRecord?.isFitForDuty ?? null}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Interventions</CardTitle>
            </CardHeader>
            <CardContent>
              {citizen.reportInvolvements.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune intervention médicale enregistrée pour ce patient.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {citizen.reportInvolvements.map((involvement) => {
                    const detail = involvement.report.emsDetail;
                    return (
                      <li
                        key={involvement.id}
                        className="flex flex-col gap-1 rounded-md border border-border p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/rapports/${involvement.report.id}`}
                            className="font-mono text-sm hover:underline"
                          >
                            #{involvement.report.number}
                          </Link>
                          <span className="text-sm">{involvement.report.title}</span>
                          {detail ? (
                            <span className={`rounded px-1.5 py-0.5 text-xs ${triageClass(detail.triage)}`}>
                              {TRIAGE_LABELS[detail.triage] ?? detail.triage}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(involvement.report.occurredAt, "dd/MM/yyyy HH:mm", { locale: fr })}
                          {detail ? ` · ${EMS_OUTCOME_LABELS[detail.outcome] ?? detail.outcome}` : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
