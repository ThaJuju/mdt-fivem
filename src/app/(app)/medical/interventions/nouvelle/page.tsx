import type { Metadata } from "next";
import { requireActor, requirePagePermission } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmsInterventionForm } from "./intervention-form";

export const metadata: Metadata = { title: "Nouvelle intervention — EMS MDT" };

function localDateTime(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default async function NewEmsInterventionPage() {
  const actor = await requireActor();
  requirePagePermission(actor, "medical.reports.create");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <p className="eyebrow">Rapport préhospitalier</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Nouvelle intervention EMS</h1>
        <p className="mt-2 text-sm text-muted-foreground">Le rapport, le patient intervenant et le volet médical seront liés automatiquement.</p>
      </div>
      <Card><CardHeader><CardTitle>Compte rendu d’intervention</CardTitle></CardHeader><CardContent><EmsInterventionForm defaultDate={localDateTime(new Date())} /></CardContent></Card>
    </div>
  );
}
