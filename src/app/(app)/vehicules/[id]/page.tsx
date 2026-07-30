import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { expireStaleRecords } from "@/lib/expiry";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VehicleForm } from "../vehicle-form";
import { StolenToggle } from "./stolen-toggle";
import { DeleteVehicleButton } from "./delete-vehicle-button";

export const metadata: Metadata = { title: "Fiche véhicule — MDT" };

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  VALID: "Valide",
  SUSPENDED: "Suspendue",
  REVOKED: "Révoquée",
  EXPIRED: "Expirée",
};

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  requirePagePermission(actor, "vehicles.view");

  const { id } = await params;
  await expireStaleRecords();
  const now = new Date();

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true } },
      bolos: {
        where: {
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, description: true, expiresAt: true },
      },
    },
  });

  if (!vehicle) notFound();

  const participation: Prisma.ReportWhereInput = {
    OR: [{ authorId: actor.id }, { officers: { some: { userId: actor.id } } }],
  };
  const primary =
    actor.memberships.find((membership) => membership.isPrimary && membership.status === "ACTIVE") ??
    actor.memberships.find((membership) => membership.status === "ACTIVE");
  const reportConditions: Prisma.ReportWhereInput[] = [];
  if (!actor.isSuperAdmin) {
    reportConditions.push({
      OR: [
        ...(primary ? [{ departmentId: primary.departmentId }] : []),
        { authorId: actor.id },
        { officers: { some: { userId: actor.id } } },
      ],
    });
  }
  if (!can(actor, "reports.view_all")) reportConditions.push(participation);
  if (!can(actor, "medical.view")) {
    reportConditions.push({
      OR: [
        { AND: [{ type: { not: "EMS_INTERVENTION" } }, { emsDetail: { is: null } }] },
        { authorId: actor.id },
        { officers: { some: { userId: actor.id } } },
      ],
    });
  }

  const [ownerWarrants, reportAppearances] = await Promise.all([
    vehicle.owner && can(actor, "warrants.view")
      ? prisma.warrant.findMany({
          where: {
            citizenId: vehicle.owner.id,
            status: "ACTIVE",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, type: true, reason: true, expiresAt: true },
        })
      : [],
    can(actor, "reports.view")
      ? prisma.reportVehicle.findMany({
          where: {
            vehicleId: vehicle.id,
            report: { AND: reportConditions },
          },
          orderBy: { report: { occurredAt: "desc" } },
          take: 50,
          include: {
            report: {
              select: { id: true, number: true, title: true, type: true, occurredAt: true },
            },
          },
        })
      : [],
  ]);

  await audit(actor, "vehicle.view", {
    entity: "Vehicle",
    entityId: vehicle.id,
    metadata: {
      activeBolos: vehicle.bolos.length,
      ownerWarrants: ownerWarrants.length,
      visibleReports: reportAppearances.length,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      {vehicle.isStolen ? (
        <div className="flex items-center gap-2 rounded-md border border-alert bg-alert/10 p-4 text-alert">
          <AlertTriangle className="size-4" />
          <span className="font-medium">Ce véhicule est signalé volé.</span>
        </div>
      ) : null}

      {vehicle.bolos.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-md border border-alert bg-alert/10 p-4">
          <div className="flex items-center gap-2 text-alert">
            <AlertTriangle className="size-4" />
            <span className="font-medium">
              {vehicle.bolos.length} BOLO actif{vehicle.bolos.length > 1 ? "s" : ""} sur ce véhicule
            </span>
          </div>
          {vehicle.bolos.map((bolo) => (
            <div key={bolo.id} className="pl-6 text-sm">
              <Link href={`/bolos?q=${encodeURIComponent(bolo.title)}`} className="font-medium hover:underline">
                {bolo.title}
              </Link>
              <p className="text-muted-foreground">{bolo.description}</p>
              {bolo.expiresAt ? (
                <p className="text-xs text-muted-foreground">
                  Expire le {format(bolo.expiresAt, "dd/MM/yyyy", { locale: fr })}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {ownerWarrants.length > 0 && vehicle.owner ? (
        <div className="flex flex-col gap-3 rounded-md border border-alert bg-alert/10 p-4">
          <div className="flex items-center gap-2 text-alert">
            <AlertTriangle className="size-4" />
            <span className="font-medium">
              Mandat actif visant le propriétaire{" "}
              <Link href={`/citoyens/${vehicle.owner.id}`} className="underline">
                {vehicle.owner.lastName} {vehicle.owner.firstName}
              </Link>
            </span>
          </div>
          {ownerWarrants.map((warrant) => (
            <div key={warrant.id} className="pl-6 text-sm">
              <Badge variant="destructive">
                {warrant.type === "ARREST" ? "Mandat d'arrêt" : "Mandat de perquisition"}
              </Badge>
              <span className="ml-2">{warrant.reason}</span>
              {warrant.expiresAt ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  expire le {format(warrant.expiresAt, "dd/MM/yyyy", { locale: fr })}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {vehicle.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={vehicle.imageUrl}
              alt={`Photo du véhicule ${vehicle.plate}`}
              className="size-14 rounded-md border border-border object-cover"
            />
          ) : null}
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{vehicle.plate}</h1>
          <span className="text-muted-foreground">
            {vehicle.make} {vehicle.model}
          </span>
          {vehicle.isImpounded ? <Badge variant="secondary">Fourrière</Badge> : null}
        </div>
        {can(actor, "vehicles.flag_stolen") ? (
          <StolenToggle vehicleId={vehicle.id} isStolen={vehicle.isStolen} />
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            {can(actor, "vehicles.edit") ? (
              <VehicleForm
                vehicle={{
                  id: vehicle.id,
                  plate: vehicle.plate,
                  make: vehicle.make,
                  model: vehicle.model,
                  color: vehicle.color,
                  class: vehicle.class,
                  vin: vehicle.vin,
                  owner: vehicle.owner
                    ? { id: vehicle.owner.id, label: `${vehicle.owner.lastName} ${vehicle.owner.firstName}` }
                    : null,
                  registration: vehicle.registration,
                  insurance: vehicle.insurance,
                  isImpounded: vehicle.isImpounded,
                  notes: vehicle.notes,
                  imageUrl: vehicle.imageUrl,
                }}
              />
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Couleur</dt>
                  <dd>{vehicle.color ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">VIN</dt>
                  <dd className="font-mono">{vehicle.vin ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Immatriculation</dt>
                  <dd>{DOCUMENT_STATUS_LABELS[vehicle.registration] ?? vehicle.registration}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Assurance</dt>
                  <dd>{DOCUMENT_STATUS_LABELS[vehicle.insurance] ?? vehicle.insurance}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Propriétaire</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicle.owner ? (
              <Link href={`/citoyens/${vehicle.owner.id}`} className="text-sm hover:underline">
                {vehicle.owner.lastName} {vehicle.owner.firstName}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun propriétaire déclaré pour ce véhicule.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {can(actor, "reports.view") ? (
        <Card>
          <CardHeader>
            <CardTitle>Apparaît dans</CardTitle>
          </CardHeader>
          <CardContent>
            {reportAppearances.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ce véhicule n&apos;apparaît dans aucun rapport visible.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {reportAppearances.map((appearance) => (
                  <Link
                    key={appearance.id}
                    href={`/rapports/${appearance.report.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3 hover:bg-accent/50"
                  >
                    <span>
                      <span className="font-mono text-sm">#{appearance.report.number}</span>
                      <span className="ml-2 text-sm font-medium">{appearance.report.title}</span>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {appearance.role ? <Badge variant="outline">{appearance.role}</Badge> : null}
                      {format(appearance.report.occurredAt, "dd/MM/yyyy", { locale: fr })}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {can(actor, "vehicles.delete") ? (
        <div>
          <DeleteVehicleButton vehicleId={vehicle.id} />
        </div>
      ) : null}
    </div>
  );
}
