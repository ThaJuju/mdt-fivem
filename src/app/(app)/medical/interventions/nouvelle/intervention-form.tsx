"use client";

import { useActionState } from "react";
import { Ambulance, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CitizenPicker } from "@/components/citizen-picker";
import { MultiImageField } from "@/components/multi-image-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EMS_OUTCOME_LABELS, TRIAGE_LABELS } from "@/lib/medical-labels";
import { createEmsIntervention, type FormState } from "../../actions";

const initialState: FormState = {};

export function EmsInterventionForm({ defaultDate }: { defaultDate: string }) {
  const [state, formAction, isPending] = useActionState(createEmsIntervention, initialState);
  const value = (field: string, fallback = "") => state.values?.[field] ?? fallback;
  const error = (field: string) =>
    state.fieldErrors?.[field]?.map((message) => <p key={message} className="text-xs text-destructive">{message}</p>);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <div><p className="eyebrow">01 · Engagement</p><h2 className="mt-1 font-semibold">Contexte de l’intervention</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>Patient</Label>
            <CitizenPicker name="patientId" placeholder="Sélectionner un patient" searchPlaceholder="Rechercher un patient…" />
            {error("patientId")}
          </div>
          <div className="flex flex-col gap-2"><Label htmlFor="title">Intitulé</Label><Input id="title" name="title" placeholder="Ex. Malaise sur voie publique" defaultValue={value("title")} required minLength={3} />{error("title")}</div>
          <div className="flex flex-col gap-2"><Label htmlFor="location">Lieu</Label><Input id="location" name="location" placeholder="Adresse ou point remarquable" defaultValue={value("location")} required />{error("location")}</div>
          <div className="flex flex-col gap-2"><Label htmlFor="occurredAt">Début d’intervention</Label><Input id="occurredAt" name="occurredAt" type="datetime-local" defaultValue={value("occurredAt", defaultDate)} required />{error("occurredAt")}</div>
          <div className="flex flex-col gap-2"><Label htmlFor="arrivedAt">Arrivée sur place</Label><Input id="arrivedAt" name="arrivedAt" type="datetime-local" defaultValue={value("arrivedAt", defaultDate)} /></div>
        </div>
      </section>

      <div className="border-t border-border/70" />

      <section className="flex flex-col gap-4">
        <div><p className="eyebrow">02 · Bilan</p><h2 className="mt-1 font-semibold">Évaluation et prise en charge</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2"><Label>Triage</Label><Select name="triage" defaultValue={value("triage", "GREEN")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TRIAGE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex flex-col gap-2"><Label htmlFor="chiefComplaint">Motif d’appel</Label><Input id="chiefComplaint" name="chiefComplaint" defaultValue={value("chiefComplaint")} required />{error("chiefComplaint")}</div>
          <div className="flex flex-col gap-2"><Label htmlFor="injuries">Lésions constatées</Label><Textarea id="injuries" name="injuries" rows={4} defaultValue={value("injuries")} /></div>
          <div className="flex flex-col gap-2"><Label htmlFor="treatment">Soins prodigués</Label><Textarea id="treatment" name="treatment" rows={4} defaultValue={value("treatment")} /></div>
        </div>
        <div className="flex flex-col gap-2"><Label htmlFor="medications">Médicaments administrés</Label><Textarea id="medications" name="medications" rows={2} defaultValue={value("medications")} /></div>
      </section>

      <div className="border-t border-border/70" />

      <section className="flex flex-col gap-4">
        <div><p className="eyebrow">03 · Pièces jointes</p><h2 className="mt-1 font-semibold">Photographies de l’intervention</h2></div>
        <div className="flex flex-col gap-2">
          <Label>Photos</Label>
          <MultiImageField name="photoUrls" />
          <p className="text-xs text-muted-foreground">Les images seront ajoutées aux pièces jointes du rapport EMS.</p>
        </div>
      </section>

      <div className="border-t border-border/70" />

      <section className="flex flex-col gap-4">
        <div><p className="eyebrow">04 · Clôture</p><h2 className="mt-1 font-semibold">Issue et destination</h2></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2"><Label>Issue</Label><Select name="outcome" defaultValue={value("outcome", "TREATED_ON_SCENE")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EMS_OUTCOME_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="flex flex-col gap-2"><Label htmlFor="hospital">Hôpital de destination</Label><Input id="hospital" name="hospital" defaultValue={value("hospital")} /></div>
          <div className="flex flex-col gap-2"><Label htmlFor="clearedAt">Fin d’intervention</Label><Input id="clearedAt" name="clearedAt" type="datetime-local" defaultValue={value("clearedAt")} /></div>
        </div>
      </section>

      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={isPending} className="h-10 w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Ambulance className="size-4" />}
        Enregistrer l’intervention
      </Button>
    </form>
  );
}
