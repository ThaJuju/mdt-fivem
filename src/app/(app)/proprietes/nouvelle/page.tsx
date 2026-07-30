import type { Metadata } from "next";
import { requireActor, requirePagePermission } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyForm } from "../property-form";

export const metadata: Metadata = { title: "Nouvelle propriété — MDT" };

export default async function NewPropertyPage() {
  const actor = await requireActor();
  requirePagePermission(actor, "properties.create");
  return <Card><CardHeader><CardTitle>Enregistrer une propriété</CardTitle></CardHeader><CardContent><PropertyForm /></CardContent></Card>;
}
