"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BirthDatePicker } from "@/components/birth-date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateEmsPatientIdentity, type FormState } from "../actions";

const initialState: FormState = {};

export function PatientIdentityCard({
  patient,
  canEdit,
}: {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dob: string;
    gender: string;
    phone: string | null;
    address: string | null;
    postal: string | null;
    height: number | null;
    weight: number | null;
  };
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(updateEmsPatientIdentity, initialState);
  const [editing, setEditing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state !== initialState && !state.error && !state.fieldErrors) {
      toast.success("Informations du patient mises à jour.");
      setEditing(false);
      router.refresh();
    }
  }, [router, state]);

  const fields = [
    ["Date de naissance", new Intl.DateTimeFormat("fr-FR").format(new Date(patient.dob))],
    ["Genre", patient.gender],
    ["Téléphone", patient.phone ?? "Non renseigné"],
    ["Adresse", [patient.address, patient.postal].filter(Boolean).join(" · ") || "Non renseignée"],
    ["Taille", patient.height ? `${patient.height} cm` : "Non renseignée"],
    ["Poids", patient.weight ? `${patient.weight} kg` : "Non renseigné"],
  ];

  const error = (field: string) =>
    state.fieldErrors?.[field]?.map((message) => <p key={message} className="text-xs text-destructive">{message}</p>);

  return (
    <Card>
      <CardHeader className="border-b border-border/70 pb-4">
        <div>
          <p className="eyebrow">Profil patient</p>
          <CardTitle className="mt-1">Identité et contact</CardTitle>
        </div>
        {canEdit ? (
          <CardAction>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing((value) => !value)}>
              {editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
              {editing ? "Annuler" : "Modifier"}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {!editing ? (
          <dl className="grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(([label, value]) => (
              <div key={label} className="border-l border-border/80 pl-3">
                <dt className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
                <dd className="mt-1.5 font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <form action={formAction} className="flex flex-col gap-5">
            <input type="hidden" name="citizenId" value={patient.id} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-2"><Label htmlFor="patient-firstName">Prénom</Label><Input id="patient-firstName" name="firstName" defaultValue={patient.firstName} />{error("firstName")}</div>
              <div className="flex flex-col gap-2"><Label htmlFor="patient-lastName">Nom</Label><Input id="patient-lastName" name="lastName" defaultValue={patient.lastName} />{error("lastName")}</div>
              <div className="flex flex-col gap-2"><Label htmlFor="patient-dob">Date de naissance</Label><BirthDatePicker id="patient-dob" defaultValue={patient.dob} />{error("dob")}</div>
              <div className="flex flex-col gap-2"><Label htmlFor="patient-gender">Genre</Label><Input id="patient-gender" name="gender" defaultValue={patient.gender} />{error("gender")}</div>
              <div className="flex flex-col gap-2"><Label htmlFor="patient-phone">Téléphone</Label><Input id="patient-phone" name="phone" defaultValue={patient.phone ?? ""} className="font-mono" />{error("phone")}</div>
              <div className="flex flex-col gap-2 lg:col-span-2"><Label htmlFor="patient-address">Adresse</Label><Input id="patient-address" name="address" defaultValue={patient.address ?? ""} />{error("address")}</div>
              <div className="flex flex-col gap-2"><Label htmlFor="patient-postal">Code postal</Label><Input id="patient-postal" name="postal" defaultValue={patient.postal ?? ""} />{error("postal")}</div>
              <div className="flex flex-col gap-2"><Label htmlFor="patient-height">Taille (cm)</Label><Input id="patient-height" name="height" type="number" min="1" defaultValue={patient.height && patient.height > 0 ? patient.height : ""} />{error("height")}</div>
              <div className="flex flex-col gap-2"><Label htmlFor="patient-weight">Poids (kg)</Label><Input id="patient-weight" name="weight" type="number" min="1" defaultValue={patient.weight && patient.weight > 0 ? patient.weight : ""} />{error("weight")}</div>
            </div>
            {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
            {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 ? (
              <p role="alert" className="text-sm text-destructive">
                Certains champs sont invalides. Vérifiez les indications affichées ci-dessus.
              </p>
            ) : null}
            <div className="flex items-center justify-end gap-2 border-t border-border/70 pt-4">
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
