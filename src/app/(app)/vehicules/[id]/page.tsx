import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
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

  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: { owner: { select: { id: true, firstName: true, lastName: true } } },
  });

  if (!vehicle) notFound();

  await audit(actor, "vehicle.view", { entity: "Vehicle", entityId: vehicle.id });

  return (
    <div className="flex flex-col gap-6">
      {vehicle.isStolen ? (
        <div className="flex items-center gap-2 rounded-md border border-alert bg-alert/10 p-4 text-alert">
          <AlertTriangle className="size-4" />
          <span className="font-medium">Ce véhicule est signalé volé.</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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

      {can(actor, "vehicles.delete") ? (
        <div>
          <DeleteVehicleButton vehicleId={vehicle.id} />
        </div>
      ) : null}
    </div>
  );
}
