"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCitizen, updateCitizen, type FormState } from "./actions";

export type ExistingCitizen = {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  height: number | null;
  weight: number | null;
  hairColor: string | null;
  eyeColor: string | null;
  address: string | null;
  postal: string | null;
  phone: string | null;
  occupation: string | null;
  imageUrl: string | null;
  fingerprint: string | null;
};

const initialState: FormState = {};

export function CitizenForm({ citizen }: { citizen?: ExistingCitizen }) {
  const action = citizen ? updateCitizen : createCitizen;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {citizen ? <input type="hidden" name="id" value={citizen.id} /> : null}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input id="firstName" name="firstName" defaultValue={citizen?.firstName} autoFocus />
          {state.fieldErrors?.firstName?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" name="lastName" defaultValue={citizen?.lastName} />
          {state.fieldErrors?.lastName?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dob">Date de naissance</Label>
          <Input id="dob" name="dob" type="date" defaultValue={citizen?.dob} />
          {state.fieldErrors?.dob?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gender">Genre</Label>
          <Input id="gender" name="gender" defaultValue={citizen?.gender} />
          {state.fieldErrors?.gender?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="height">Taille (cm)</Label>
          <Input id="height" name="height" type="number" defaultValue={citizen?.height ?? undefined} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="weight">Poids (kg)</Label>
          <Input id="weight" name="weight" type="number" defaultValue={citizen?.weight ?? undefined} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="hairColor">Cheveux</Label>
          <Input id="hairColor" name="hairColor" defaultValue={citizen?.hairColor ?? undefined} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="eyeColor">Yeux</Label>
          <Input id="eyeColor" name="eyeColor" defaultValue={citizen?.eyeColor ?? undefined} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Adresse</Label>
        <Input id="address" name="address" defaultValue={citizen?.address ?? undefined} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="postal">Code postal</Label>
          <Input id="postal" name="postal" defaultValue={citizen?.postal ?? undefined} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" name="phone" defaultValue={citizen?.phone ?? undefined} className="font-mono" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="occupation">Profession</Label>
          <Input id="occupation" name="occupation" defaultValue={citizen?.occupation ?? undefined} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fingerprint">Empreinte (identifiant unique)</Label>
          <Input
            id="fingerprint"
            name="fingerprint"
            defaultValue={citizen?.fingerprint ?? undefined}
            className="font-mono"
          />
          {state.fieldErrors?.fingerprint?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="imageUrl">Photo (URL)</Label>
          <Input id="imageUrl" name="imageUrl" defaultValue={citizen?.imageUrl ?? undefined} />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {citizen ? "Enregistrer" : "Créer la fiche"}
      </Button>
    </form>
  );
}
