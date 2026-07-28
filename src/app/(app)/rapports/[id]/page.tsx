import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { REPORT_TYPE_LABELS, REPORT_STATUS_LABELS } from "@/lib/labels";
import { ReportForm } from "../report-form";
import { InvolvementsSection, OfficersSection } from "./people-section";
import { ReportVehiclesSection, EvidenceSection } from "./attachments-section";
import { ChargesSection } from "./charges-section";
import { WorkflowBar } from "./workflow-bar";

export const metadata: Metadata = { title: "Rapport — MDT" };

/** Pour un `datetime-local`, il faut une chaîne locale sans suffixe de fuseau. */
function toDateTimeLocal(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  requirePagePermission(actor, "reports.view");

  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      author: { select: { firstName: true, lastName: true } },
      approvedBy: { select: { firstName: true, lastName: true } },
      department: { select: { id: true, shortName: true, name: true, color: true } },
      involvements: { include: { citizen: { select: { id: true, firstName: true, lastName: true } } } },
      officers: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              memberships: {
                where: { isPrimary: true },
                select: { badgeNumber: true, department: { select: { shortName: true } } },
                take: 1,
              },
            },
          },
        },
      },
      vehicles: { include: { vehicle: { select: { id: true, plate: true, make: true, model: true } } } },
      evidence: { orderBy: { createdAt: "asc" } },
      charges: {
        include: {
          citizen: { select: { firstName: true, lastName: true } },
          offense: { select: { code: true, name: true } },
        },
      },
    },
  });

  if (!report) notFound();

  const isAuthor = report.authorId === actor.id;
  if (!isAuthor && !can(actor, "reports.view_all")) {
    requirePagePermission(actor, "reports.view_all");
  }

  await audit(actor, "report.view", {
    entity: "Report",
    entityId: report.id,
    metadata: { number: report.number },
  });

  const canEditAny = can(actor, "reports.edit_any");
  const canEdit =
    canEditAny || (isAuthor && can(actor, "reports.edit") && report.status !== "APPROVED");
  const canDelete = can(actor, "reports.delete_any") || (isAuthor && can(actor, "reports.delete"));
  const canApprove = can(actor, "reports.approve");

  // Le formulaire ne propose que les services dont l'agent est membre actif.
  const departmentIds = actor.memberships.filter((m) => m.status === "ACTIVE").map((m) => m.departmentId);
  const departments = await prisma.department.findMany({
    where: canEditAny || actor.isSuperAdmin ? { isActive: true } : { id: { in: departmentIds } },
    orderBy: { order: "asc" },
    select: { id: true, shortName: true, name: true },
  });
  // Le service courant doit rester sélectionnable même si l'agent n'en est plus membre.
  if (!departments.some((d) => d.id === report.department.id)) {
    departments.unshift({
      id: report.department.id,
      shortName: report.department.shortName,
      name: report.department.name,
    });
  }

  const offenses = can(actor, "charges.manage")
    ? await prisma.offense.findMany({
        where: { isActive: true },
        orderBy: [{ category: { order: "asc" } }, { code: "asc" }],
        include: { category: { select: { name: true } } },
      })
    : [];

  return (
    <div className="flex flex-col gap-6">
      {report.status === "REJECTED" && report.rejectReason ? (
        <div className="flex flex-col gap-1 rounded-md border border-destructive bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" />
            <span className="font-medium">Rapport refusé — à corriger</span>
          </div>
          <p className="text-sm">{report.rejectReason}</p>
          {report.approvedBy ? (
            <p className="text-xs text-muted-foreground">
              Par {report.approvedBy.firstName} {report.approvedBy.lastName}
              {report.approvedAt
                ? ` le ${format(report.approvedAt, "dd/MM/yyyy à HH:mm", { locale: fr })}`
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {report.status === "APPROVED" ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-card p-4 text-sm">
          <CheckCircle2 className="size-4 text-department" />
          <span>
            Validé
            {report.approvedBy ? ` par ${report.approvedBy.firstName} ${report.approvedBy.lastName}` : ""}
            {report.approvedAt
              ? ` le ${format(report.approvedAt, "dd/MM/yyyy à HH:mm", { locale: fr })}`
              : ""}
            .
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-2xl font-semibold tracking-tight">#{report.number}</span>
            <h1 className="text-2xl font-semibold tracking-tight">{report.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">{REPORT_TYPE_LABELS[report.type] ?? report.type}</Badge>
            <Badge variant="outline">{REPORT_STATUS_LABELS[report.status] ?? report.status}</Badge>
            <span className="flex items-center gap-1.5 font-mono text-xs">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: report.department.color }}
                aria-hidden
              />
              {report.department.shortName}
            </span>
            <span>
              par {report.author.firstName} {report.author.lastName} ·{" "}
              {format(report.occurredAt, "dd/MM/yyyy à HH:mm", { locale: fr })}
            </span>
          </div>
        </div>
        <WorkflowBar
          reportId={report.id}
          status={report.status}
          canEdit={canEdit}
          canApprove={canApprove}
          canDelete={canDelete}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{canEdit ? "Rapport" : "Rapport (lecture seule)"}</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportForm
            departments={departments}
            readOnly={!canEdit}
            report={{
              id: report.id,
              type: report.type,
              title: report.title,
              content: report.content,
              location: report.location,
              occurredAt: toDateTimeLocal(report.occurredAt),
              departmentId: report.departmentId,
            }}
          />
        </CardContent>
      </Card>

      <OfficersSection
        reportId={report.id}
        canEdit={canEdit}
        officers={report.officers.map((officer) => ({
          id: officer.id,
          userId: officer.userId,
          name: `${officer.user.firstName} ${officer.user.lastName}`,
          badge: officer.user.memberships[0]
            ? `${officer.user.memberships[0].department.shortName} #${officer.user.memberships[0].badgeNumber}`
            : null,
          isLead: officer.isLead,
        }))}
      />

      <InvolvementsSection
        reportId={report.id}
        canEdit={canEdit}
        involvements={report.involvements.map((involvement) => ({
          id: involvement.id,
          citizenId: involvement.citizenId,
          citizenName: `${involvement.citizen.lastName} ${involvement.citizen.firstName}`,
          role: involvement.role,
          statement: involvement.statement,
        }))}
      />

      <ChargesSection
        reportId={report.id}
        canManage={canEdit && can(actor, "charges.manage")}
        charges={report.charges.map((charge) => ({
          id: charge.id,
          citizenId: charge.citizenId,
          citizenName: `${charge.citizen.lastName} ${charge.citizen.firstName}`,
          offenseCode: charge.offense.code,
          offenseName: charge.offense.name,
          count: charge.count,
          fine: charge.fine,
          jailMinutes: charge.jailMinutes,
          points: charge.points,
          isGuilty: charge.isGuilty,
          isPaid: charge.isPaid,
          notes: charge.notes,
        }))}
        offenses={offenses.map((offense) => ({
          id: offense.id,
          code: offense.code,
          name: offense.name,
          categoryName: offense.category.name,
          fine: offense.fine,
          jailMinutes: offense.jailMinutes,
          points: offense.points,
        }))}
        citizens={report.involvements.map((involvement) => ({
          id: involvement.citizenId,
          label: `${involvement.citizen.lastName} ${involvement.citizen.firstName}`,
        }))}
      />

      <ReportVehiclesSection
        reportId={report.id}
        canEdit={canEdit}
        vehicles={report.vehicles.map((reportVehicle) => ({
          id: reportVehicle.id,
          vehicleId: reportVehicle.vehicleId,
          plate: reportVehicle.vehicle.plate,
          makeModel: `${reportVehicle.vehicle.make} ${reportVehicle.vehicle.model}`,
          role: reportVehicle.role,
        }))}
      />

      <EvidenceSection
        reportId={report.id}
        canEdit={canEdit}
        evidence={report.evidence.map((item) => ({
          id: item.id,
          label: item.label,
          description: item.description,
          kind: item.kind,
          url: item.url,
        }))}
      />
    </div>
  );
}
