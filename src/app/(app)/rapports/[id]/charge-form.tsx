"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatJailTime, formatMoney } from "@/lib/labels";
import { addCharge, type FormState } from "../actions";

export type OffenseOption = {
  id: string;
  code: string;
  name: string;
  categoryName: string;
  fine: number;
  jailMinutes: number;
  points: number;
};

export type InvolvedCitizen = { id: string; label: string };

const initialState: FormState = {};

export function ChargeForm({
  reportId,
  offenses,
  citizens,
  onSuccess,
}: {
  reportId: string;
  offenses: OffenseOption[];
  citizens: InvolvedCitizen[];
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(addCharge, initialState);
  const [offenseId, setOffenseId] = useState("");
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const selected = useMemo(() => offenses.find((o) => o.id === offenseId), [offenses, offenseId]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="reportId" value={reportId} />

      <div className="flex flex-col gap-2">
        <Label>Personne mise en cause</Label>
        <Select name="citizenId">
          <SelectTrigger>
            <SelectValue placeholder="Choisir une personne impliquée" />
          </SelectTrigger>
          <SelectContent>
            {citizens.map((citizen) => (
              <SelectItem key={citizen.id} value={citizen.id}>
                {citizen.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {citizens.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Ajoutez d&apos;abord une personne impliquée au rapport.
          </p>
        ) : null}
        {state.fieldErrors?.citizenId?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Infraction</Label>
        <Select name="offenseId" value={offenseId} onValueChange={setOffenseId}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir une infraction" />
          </SelectTrigger>
          <SelectContent>
            {offenses.map((offense) => (
              <SelectItem key={offense.id} value={offense.id}>
                <span className="font-mono">{offense.code}</span> — {offense.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.offenseId?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="count">Nombre d&apos;occurrences</Label>
        <Input
          id="count"
          name="count"
          type="number"
          min={1}
          value={count}
          onChange={(event) => setCount(Math.max(1, Number(event.target.value) || 1))}
          className="w-28"
        />
      </div>

      {selected ? (
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <p className="mb-1.5 text-xs text-muted-foreground">
            Barème repris du code pénal et figé sur ce rapport. Il restera modifiable ici sans affecter le
            code pénal.
          </p>
          <div className="grid grid-cols-3 gap-2 font-mono">
            <span>{formatMoney(selected.fine * count)}</span>
            <span>{formatJailTime(selected.jailMinutes * count)}</span>
            <span>{selected.points * count} pts</span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (optionnel)</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending || citizens.length === 0} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Ajouter la charge
      </Button>
    </form>
  );
}
