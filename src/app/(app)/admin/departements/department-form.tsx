"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDepartment, updateDepartment, type FormState } from "./actions";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "POLICE", label: "Police" },
  { value: "EMS", label: "Secours (EMS)" },
  { value: "DOJ", label: "Justice (DOJ)" },
  { value: "ADMIN", label: "Administration" },
];

export type ExistingDepartment = {
  id: string;
  name: string;
  shortName: string;
  type: string;
  color: string;
  order: number;
  isActive: boolean;
};

const initialState: FormState = {};

export function DepartmentForm({
  department,
  onSuccess,
}: {
  department?: ExistingDepartment;
  onSuccess?: () => void;
}) {
  const action = department ? updateDepartment : createDepartment;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [color, setColor] = useState(department?.color ?? "#3B6FE0");

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) {
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {department ? <input type="hidden" name="id" value={department.id} /> : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" name="name" defaultValue={department?.name} autoFocus />
        {state.fieldErrors?.name?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="shortName">Sigle</Label>
          <Input
            id="shortName"
            name="shortName"
            defaultValue={department?.shortName}
            className="font-mono uppercase"
            placeholder="LSPD"
          />
          {state.fieldErrors?.shortName?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label>Type</Label>
          <Select name="type" defaultValue={department?.type ?? "POLICE"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="color">Couleur</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-9 w-9 rounded border border-input bg-transparent p-0.5"
              aria-label="Choisir une couleur"
            />
            <Input
              id="color"
              name="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="font-mono"
            />
          </div>
          {state.fieldErrors?.color?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="order">Ordre d&apos;affichage</Label>
          <Input id="order" name="order" type="number" defaultValue={department?.order ?? 0} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="isActive" name="isActive" defaultChecked={department?.isActive ?? true} />
        <Label htmlFor="isActive" className="font-normal">
          Département actif
        </Label>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {department ? "Enregistrer" : "Créer le département"}
      </Button>
    </form>
  );
}
