import type { Metadata } from "next";
import { requireActor, requirePagePermission } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeaponForm } from "../weapon-form";

export const metadata: Metadata = { title: "Nouvelle arme — MDT" };

export default async function NouvelleArmePage() {
  const actor = await requireActor();
  requirePagePermission(actor, "weapons.manage");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Enregistrer une arme</h1>
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <WeaponForm />
        </CardContent>
      </Card>
    </div>
  );
}
