import type { Metadata } from "next";
import { requireActor, requirePagePermission } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmsPatientForm } from "./patient-form";

export const metadata: Metadata = { title: "Nouveau patient — EMS MDT" };

export default async function NewEmsPatientPage() {
  const actor = await requireActor();
  requirePagePermission(actor, "medical.edit");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <p className="eyebrow">Registre EMS</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Ouvrir un dossier patient</h1>
        <p className="mt-2 text-sm text-muted-foreground">Créez l’identité et le dossier médical initial en une seule opération.</p>
      </div>
      <Card><CardHeader><CardTitle>Nouveau patient</CardTitle></CardHeader><CardContent><EmsPatientForm /></CardContent></Card>
    </div>
  );
}
