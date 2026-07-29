"use client";

import { useActionState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BirthDatePicker } from "@/components/birth-date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiImageField } from "@/components/multi-image-field";
import { createEmsPatient, type FormState } from "../../actions";

const initialState: FormState = {};

export function EmsPatientForm() {
  const [state, formAction, isPending] = useActionState(createEmsPatient, initialState);
  const error = (field: string) =>
    state.fieldErrors?.[field]?.map((message) => <p key={message} className="text-xs text-destructive">{message}</p>);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <div><p className="eyebrow">01 · Identité</p><h2 className="mt-1 font-semibold">Informations du patient</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2"><Label htmlFor="firstName">Prénom</Label><Input id="firstName" name="firstName" autoFocus />{error("firstName")}</div>
          <div className="flex flex-col gap-2"><Label htmlFor="lastName">Nom</Label><Input id="lastName" name="lastName" />{error("lastName")}</div>
          <div className="flex flex-col gap-2"><Label htmlFor="dob">Date de naissance</Label><BirthDatePicker id="dob" />{error("dob")}</div>
          <div className="flex flex-col gap-2"><Label htmlFor="gender">Genre</Label><Input id="gender" name="gender" />{error("gender")}</div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2"><Label htmlFor="phone">Téléphone</Label><Input id="phone" name="phone" className="font-mono" /></div>
          <div className="flex flex-col gap-2 sm:col-span-2"><Label htmlFor="address">Adresse</Label><Input id="address" name="address" /></div>
          <div className="flex flex-col gap-2"><Label htmlFor="postal">Code postal</Label><Input id="postal" name="postal" /></div>
          <div className="flex flex-col gap-2"><Label htmlFor="height">Taille (cm)</Label><Input id="height" name="height" type="number" /></div>
          <div className="flex flex-col gap-2"><Label htmlFor="weight">Poids (kg)</Label><Input id="weight" name="weight" type="number" /></div>
        </div>
      </section>

      <div className="border-t border-border/70" />

      <section className="flex flex-col gap-4">
        <div><p className="eyebrow">02 · Photographies</p><h2 className="mt-1 font-semibold">Documents visuels du dossier</h2></div>
        <div className="flex flex-col gap-2">
          <Label>Photos médicales</Label>
          <MultiImageField name="photoUrls" />
          <p className="text-xs text-muted-foreground">Ajoutez les photographies utiles au suivi du patient. Elles resteront réservées au dossier médical.</p>
        </div>
      </section>

      <div className="border-t border-border/70" />

      <section className="flex flex-col gap-4">
        <div><p className="eyebrow">03 · Dossier médical</p><h2 className="mt-1 font-semibold">Données cliniques initiales</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2"><Label htmlFor="bloodType">Groupe sanguin</Label><Input id="bloodType" name="bloodType" placeholder="O+" className="font-mono" /></div>
          <div className="flex flex-col gap-2"><Label htmlFor="allergies">Allergies</Label><Textarea id="allergies" name="allergies" rows={2} placeholder="Une par ligne" /></div>
          <div className="flex flex-col gap-2"><Label htmlFor="conditions">Antécédents</Label><Textarea id="conditions" name="conditions" rows={3} placeholder="Une entrée par ligne" /></div>
          <div className="flex flex-col gap-2"><Label htmlFor="medications">Traitements en cours</Label><Textarea id="medications" name="medications" rows={3} placeholder="Un par ligne" /></div>
        </div>
        <div className="flex flex-col gap-2"><Label htmlFor="notes">Notes médicales</Label><Textarea id="notes" name="notes" rows={3} /></div>
      </section>

      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={isPending} className="h-10 w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        Créer le patient
      </Button>
    </form>
  );
}
