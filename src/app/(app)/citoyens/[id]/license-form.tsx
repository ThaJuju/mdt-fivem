"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addLicense, updateLicense, type FormState } from "../actions";

export type ExistingLicense = {
  id: string;
  type: string;
  status: string;
  points: number;
  issuedAt: string;
  expiresAt: string | null;
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "VALID", label: "Valide" },
  { value: "SUSPENDED", label: "Suspendue" },
  { value: "REVOKED", label: "Révoquée" },
  { value: "EXPIRED", label: "Expirée" },
];

const initialState: FormState = {};

export function LicenseForm({
  citizenId,
  license,
  onSuccess,
}: {
  citizenId: string;
  license?: ExistingLicense;
  onSuccess?: () => void;
}) {
  const action = license ? updateLicense : addLicense;
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) {
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="citizenId" value={citizenId} />
      {license ? <input type="hidden" name="id" value={license.id} /> : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Type</Label>
        <Input id="type" name="type" defaultValue={license?.type} placeholder="driver, firearm, pilot…" />
        {state.fieldErrors?.type?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Statut</Label>
          <Select name="status" defaultValue={license?.status ?? "VALID"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="points">Points</Label>
          <Input id="points" name="points" type="number" min={0} defaultValue={license?.points ?? 0} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="issuedAt">Délivrée le</Label>
          <Input id="issuedAt" name="issuedAt" type="date" defaultValue={license?.issuedAt} />
          {state.fieldErrors?.issuedAt?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="expiresAt">Expire le (optionnel)</Label>
          <Input id="expiresAt" name="expiresAt" type="date" defaultValue={license?.expiresAt ?? undefined} />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {license ? "Enregistrer" : "Ajouter la licence"}
      </Button>
    </form>
  );
}
