import type { Metadata } from "next";
import { requireActor, requirePagePermission } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CitizenForm } from "../citizen-form";

export const metadata: Metadata = { title: "Nouvelle fiche citoyen — MDT" };

export default async function NouveauCitoyenPage() {
  const actor = await requireActor();
  requirePagePermission(actor, "citizens.create");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Créer une fiche citoyen</h1>
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <CitizenForm />
        </CardContent>
      </Card>
    </div>
  );
}
