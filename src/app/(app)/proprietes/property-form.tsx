"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CitizenPicker } from "@/components/citizen-picker";
import { createProperty, updateProperty, type FormState } from "./actions";

export type ExistingProperty = {
  id: string;
  address: string;
  type: string | null;
  citizen: { id: string; label: string } | null;
  notes: string | null;
};

const initialState: FormState = {};

export function PropertyForm({ property }: { property?: ExistingProperty }) {
  const [state, formAction, isPending] = useActionState(
    property ? updateProperty : createProperty,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {property ? <input type="hidden" name="id" value={property.id} /> : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Adresse</Label>
        <Input id="address" name="address" defaultValue={property?.address} autoFocus />
        {state.fieldErrors?.address?.map((message) => (
          <p key={message} className="text-sm text-destructive">{message}</p>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Type de bien</Label>
        <Input id="type" name="type" defaultValue={property?.type ?? ""} placeholder="Maison, appartement, commerce…" />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Propriétaire</Label>
        <CitizenPicker name="citizenId" defaultValue={property?.citizen ?? undefined} scope="civil" />
        {state.fieldErrors?.citizenId?.map((message) => (
          <p key={message} className="text-sm text-destructive">{message}</p>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={property?.notes ?? ""} rows={5} />
      </div>
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {property ? "Enregistrer" : "Enregistrer la propriété"}
      </Button>
    </form>
  );
}
