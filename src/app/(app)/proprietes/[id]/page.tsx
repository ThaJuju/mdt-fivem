import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyForm } from "../property-form";
import { DeletePropertyButton } from "./delete-property-button";

export const metadata: Metadata = { title: "Fiche propriété — MDT" };

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  requirePagePermission(actor, "properties.view");
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      citizen: { select: { id: true, firstName: true, lastName: true } },
      warrants: { orderBy: { createdAt: "desc" }, select: { id: true, status: true, reason: true } },
    },
  });
  if (!property) notFound();
  await audit(actor, "property.view", { entity: "Property", entityId: property.id });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">{property.address}</h1><p className="text-muted-foreground">{property.type ?? "Type non renseigné"}</p></div>{can(actor, "properties.delete") ? <DeletePropertyButton propertyId={property.id} /> : null}</div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Informations</CardTitle></CardHeader><CardContent>
          {can(actor, "properties.edit") ? <PropertyForm property={{ id: property.id, address: property.address, type: property.type, citizen: property.citizen ? { id: property.citizen.id, label: `${property.citizen.lastName} ${property.citizen.firstName}` } : null, notes: property.notes }} /> : (
            <div className="space-y-2"><p><span className="text-muted-foreground">Propriétaire : </span>{property.citizen ? <Link className="hover:underline" href={`/citoyens/${property.citizen.id}`}>{property.citizen.lastName} {property.citizen.firstName}</Link> : "Aucun"}</p><p className="whitespace-pre-wrap">{property.notes || "Aucune note."}</p></div>
          )}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Mandats liés</CardTitle></CardHeader><CardContent className="space-y-3">
          {property.warrants.length ? property.warrants.map((warrant) => <div key={warrant.id} className="rounded-md border p-3"><p className="text-sm font-medium">{warrant.status}</p><p className="text-sm text-muted-foreground">{warrant.reason}</p></div>) : <p className="text-sm text-muted-foreground">Aucun mandat ne vise ce bien.</p>}
        </CardContent></Card>
      </div>
    </div>
  );
}
