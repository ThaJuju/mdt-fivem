import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { requireActor, requirePagePermission, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeaponForm } from "../weapon-form";
import { DeleteWeaponButton } from "./delete-weapon-button";

export const metadata: Metadata = { title: "Fiche arme — MDT" };

export default async function WeaponDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  requirePagePermission(actor, "weapons.view");

  const { id } = await params;

  const weapon = await prisma.weapon.findUnique({
    where: { id },
    include: { owner: { select: { id: true, firstName: true, lastName: true } } },
  });

  if (!weapon) notFound();

  await audit(actor, "weapon.view", { entity: "Weapon", entityId: weapon.id });

  return (
    <div className="flex flex-col gap-6">
      {weapon.isStolen ? (
        <div className="flex items-center gap-2 rounded-md border border-alert bg-alert/10 p-4 text-alert">
          <AlertTriangle className="size-4" />
          <span className="font-medium">Cette arme est signalée volée.</span>
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">{weapon.serialNumber}</h1>
        <span className="text-muted-foreground">
          {weapon.model}
          {weapon.type ? ` · ${weapon.type}` : ""}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            {can(actor, "weapons.manage") ? (
              <WeaponForm
                weapon={{
                  id: weapon.id,
                  serialNumber: weapon.serialNumber,
                  model: weapon.model,
                  type: weapon.type,
                  owner: weapon.owner
                    ? { id: weapon.owner.id, label: `${weapon.owner.lastName} ${weapon.owner.firstName}` }
                    : null,
                  isStolen: weapon.isStolen,
                }}
              />
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Modèle</dt>
                  <dd>{weapon.model}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd>{weapon.type ?? "—"}</dd>
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
            {weapon.owner ? (
              <Link href={`/citoyens/${weapon.owner.id}`} className="text-sm hover:underline">
                {weapon.owner.lastName} {weapon.owner.firstName}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun propriétaire déclaré pour cette arme.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {can(actor, "weapons.manage") ? (
        <div>
          <DeleteWeaponButton weaponId={weapon.id} />
        </div>
      ) : null}
    </div>
  );
}
