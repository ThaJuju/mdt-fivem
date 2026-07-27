"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStatusCode, updateStatusCode, type FormState } from "./actions";

export type ExistingStatusCode = {
  id: string;
  code: string;
  label: string;
  color: string;
  type: string | null;
  order: number;
};

const initialState: FormState = {};

export function StatusCodeForm({
  statusCode,
  onSuccess,
}: {
  statusCode?: ExistingStatusCode;
  onSuccess?: () => void;
}) {
  const action = statusCode ? updateStatusCode : createStatusCode;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [color, setColor] = useState(statusCode?.color ?? "#8A94A3");

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) {
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {statusCode ? <input type="hidden" name="id" value={statusCode.id} /> : null}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Code</Label>
          <Input id="code" name="code" defaultValue={statusCode?.code} className="font-mono" placeholder="10-4" />
          {state.fieldErrors?.code?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="order">Ordre</Label>
          <Input id="order" name="order" type="number" defaultValue={statusCode?.order ?? 0} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="label">Libellé</Label>
        <Input id="label" name="label" defaultValue={statusCode?.label} placeholder="Bien reçu" />
        {state.fieldErrors?.label?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
      </div>

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
        <Label htmlFor="type">Catégorie (optionnel)</Label>
        <Input id="type" name="type" defaultValue={statusCode?.type ?? ""} />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {statusCode ? "Enregistrer" : "Créer le code"}
      </Button>
    </form>
  );
}
