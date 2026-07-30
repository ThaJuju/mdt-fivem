import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Phone, UserRound } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TRIAGE_LABELS, EMS_OUTCOME_LABELS, triageClass } from "@/lib/medical-labels";
import { MedicalRecordForm, FitnessForm } from "./medical-form";
import { PatientIdentityCard } from "./patient-identity-form";
import { MedicalPhotosSection } from "./medical-photos-section";

export const metadata: Metadata = { title: "Dossier médical — MDT" };

export default async function MedicalRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  requirePagePermission(actor, "medical.view");

  const { id } = await params;

  const citizen = await prisma.citizen.findUnique({
    where: { id },
    include: {
      medicalRecord: true,
      medicalAttachments: { orderBy: { createdAt: "desc" } },
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
    <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-6">
      <section className="panel-surface relative overflow-hidden rounded-xl">
        <div className="pointer-events-none absolute -top-28 right-0 size-80 rounded-full bg-department/12 blur-3xl" />
        <div className="relative p-6 sm:p-8">
          <Link href="/medical/patients" className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-department">
            <ArrowLeft className="size-3.5" />Retour aux patients
          </Link>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-department/30 bg-department/10 text-department shadow-[0_0_30px_color-mix(in_srgb,var(--department-accent)_12%,transparent)]">
              <UserRound className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Dossier médical patient</p>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight">{citizen.firstName} {citizen.lastName}</h1>
                {citizen.isDeceased ? <Badge variant="outline">Décédé</Badge> : null}
                {citizen.medicalRecord?.isFitForDuty === true ? <Badge variant="outline">Apte</Badge> : null}
                {citizen.medicalRecord?.isFitForDuty === false ? <Badge variant="destructive">Inapte</Badge> : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5 text-department" />{format(citizen.dob, "dd MMMM yyyy", { locale: fr })}</span>
                <span className="flex items-center gap-1.5"><Phone className="size-3.5 text-department" />{citizen.phone ?? "Téléphone non renseigné"}</span>
                <span className="flex items-center gap-1.5"><MapPin className="size-3.5 text-department" />{citizen.address ?? "Adresse non renseignée"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PatientIdentityCard
        canEdit={canEdit && citizen.isMedicalOnly}
        isPoliceFile={!citizen.isMedicalOnly}
        patient={{
          id: citizen.id,
          firstName: citizen.firstName,
          lastName: citizen.lastName,
          dob: citizen.dob.toISOString().slice(0, 10),
          gender: citizen.gender,
          phone: citizen.phone,
          address: citizen.address,
          postal: citizen.postal,
          height: citizen.height,
          weight: citizen.weight,
        }}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="border-b border-border/70 pb-4">
            <div><p className="eyebrow">Informations cliniques</p><CardTitle className="mt-1">Dossier médical</CardTitle></div>
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

      <MedicalPhotosSection
        citizenId={citizen.id}
        canEdit={canEdit}
        photos={citizen.medicalAttachments.map((attachment) => ({ id: attachment.id, url: attachment.url }))}
      />
    </div>
  );
}
