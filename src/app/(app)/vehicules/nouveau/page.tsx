import type { Metadata } from "next";
import { requireActor, requirePagePermission } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VehicleForm } from "../vehicle-form";

export const metadata: Metadata = { title: "Nouveau véhicule — MDT" };

export default async function NouveauVehiculePage() {
  const actor = await requireActor();
  requirePagePermission(actor, "vehicles.create");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Enregistrer un véhicule</h1>
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <VehicleForm />
        </CardContent>
      </Card>
    </div>
  );
}
