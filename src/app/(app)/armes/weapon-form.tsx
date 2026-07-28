"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CitizenPicker } from "@/components/citizen-picker";
import { createWeapon, updateWeapon, type FormState } from "./actions";

export type ExistingWeapon = {
  id: string;
  serialNumber: string;
  model: string;
  type: string | null;
  owner: { id: string; label: string } | null;
  isStolen: boolean;
};

const initialState: FormState = {};

export function WeaponForm({ weapon }: { weapon?: ExistingWeapon }) {
  const action = weapon ? updateWeapon : createWeapon;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {weapon ? <input type="hidden" name="id" value={weapon.id} /> : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="serialNumber">Numéro de série</Label>
        <Input
          id="serialNumber"
          name="serialNumber"
          defaultValue={weapon?.serialNumber}
          className="font-mono"
          autoFocus
        />
        {state.fieldErrors?.serialNumber?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="model">Modèle</Label>
          <Input id="model" name="model" defaultValue={weapon?.model} />
          {state.fieldErrors?.model?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="type">Type</Label>
          <Input id="type" name="type" defaultValue={weapon?.type ?? undefined} placeholder="pistolet, fusil…" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Propriétaire</Label>
        <CitizenPicker name="ownerId" defaultValue={weapon?.owner ?? undefined} />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="isStolen" name="isStolen" defaultChecked={weapon?.isStolen} />
        <Label htmlFor="isStolen" className="font-normal">
          Arme signalée volée
        </Label>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {weapon ? "Enregistrer" : "Enregistrer l'arme"}
      </Button>
    </form>
  );
}
