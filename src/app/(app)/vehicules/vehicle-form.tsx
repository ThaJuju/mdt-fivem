"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CitizenPicker } from "@/components/citizen-picker";
import { ImageField } from "@/components/image-field";
import { createVehicle, updateVehicle, type FormState } from "./actions";

const DOCUMENT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "VALID", label: "Valide" },
  { value: "SUSPENDED", label: "Suspendue" },
  { value: "REVOKED", label: "Révoquée" },
  { value: "EXPIRED", label: "Expirée" },
];

export type ExistingVehicle = {
  id: string;
  plate: string;
  make: string;
  model: string;
  color: string | null;
  class: string | null;
  vin: string | null;
  owner: { id: string; label: string } | null;
  registration: string;
  insurance: string;
  isImpounded: boolean;
  notes: string | null;
  imageUrl: string | null;
};

const initialState: FormState = {};

export function VehicleForm({ vehicle }: { vehicle?: ExistingVehicle }) {
  const action = vehicle ? updateVehicle : createVehicle;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {vehicle ? <input type="hidden" name="id" value={vehicle.id} /> : null}

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="plate">Plaque</Label>
          <Input id="plate" name="plate" defaultValue={vehicle?.plate} className="font-mono uppercase" autoFocus />
          {state.fieldErrors?.plate?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="make">Marque</Label>
          <Input id="make" name="make" defaultValue={vehicle?.make} />
          {state.fieldErrors?.make?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="model">Modèle</Label>
          <Input id="model" name="model" defaultValue={vehicle?.model} />
          {state.fieldErrors?.model?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="color">Couleur</Label>
          <Input id="color" name="color" defaultValue={vehicle?.color ?? undefined} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="class">Catégorie</Label>
          <Input id="class" name="class" defaultValue={vehicle?.class ?? undefined} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="vin">VIN</Label>
          <Input id="vin" name="vin" defaultValue={vehicle?.vin ?? undefined} className="font-mono" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Propriétaire</Label>
        <CitizenPicker name="ownerId" defaultValue={vehicle?.owner ?? undefined} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Immatriculation</Label>
          <Select name="registration" defaultValue={vehicle?.registration ?? "VALID"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Assurance</Label>
          <Select name="insurance" defaultValue={vehicle?.insurance ?? "VALID"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="isImpounded" name="isImpounded" defaultChecked={vehicle?.isImpounded} />
        <Label htmlFor="isImpounded" className="font-normal">
          Véhicule mis en fourrière
        </Label>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Photo</Label>
        <ImageField name="imageUrl" defaultValue={vehicle?.imageUrl} label="Photo du véhicule" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={vehicle?.notes ?? undefined} rows={3} />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {vehicle ? "Enregistrer" : "Enregistrer le véhicule"}
      </Button>
    </form>
  );
}
