"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveMedicalRecord, certifyFitness, type FormState } from "../actions";

const initialState: FormState = {};

export function MedicalRecordForm({
  citizenId,
  record,
}: {
  citizenId: string;
  record: {
    bloodType: string | null;
    allergies: string[];
    conditions: string[];
    medications: string[];
    notes: string | null;
  } | null;
}) {
  const [state, formAction, isPending] = useActionState(saveMedicalRecord, initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="citizenId" value={citizenId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="bloodType">Groupe sanguin</Label>
        <Input
          id="bloodType"
          name="bloodType"
          defaultValue={record?.bloodType ?? ""}
          placeholder="O+"
          className="w-28 font-mono"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="allergies">Allergies</Label>
        <Textarea
          id="allergies"
          name="allergies"
          rows={2}
          defaultValue={record?.allergies.join("\n") ?? ""}
          placeholder="Une par ligne."
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="conditions">Antécédents</Label>
        <Textarea
          id="conditions"
          name="conditions"
          rows={2}
          defaultValue={record?.conditions.join("\n") ?? ""}
          placeholder="Une par ligne."
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="medications">Traitements en cours</Label>
        <Textarea
          id="medications"
          name="medications"
          rows={2}
          defaultValue={record?.medications.join("\n") ?? ""}
          placeholder="Un par ligne."
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={record?.notes ?? ""} />
      </div>

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Enregistrer le dossier
      </Button>
    </form>
  );
}

export function FitnessForm({
  citizenId,
  isFitForDuty,
}: {
  citizenId: string;
  isFitForDuty: boolean | null;
}) {
  const [state, formAction, isPending] = useActionState(certifyFitness, initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  const current = isFitForDuty === true ? "yes" : isFitForDuty === false ? "no" : "unset";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="citizenId" value={citizenId} />
      <p className="text-sm text-muted-foreground">
        L&apos;aptitude médicale conditionne la délivrance d&apos;un permis de port d&apos;arme côté
        police.
      </p>
      <div className="flex flex-wrap gap-2">
        {[
          { value: "yes", label: "Déclarer apte" },
          { value: "no", label: "Déclarer inapte" },
          { value: "unset", label: "Remettre à non évaluée" },
        ].map((option) => (
          <Button
            key={option.value}
            type="submit"
            name="fitness"
            value={option.value}
            variant={current === option.value ? "default" : "outline"}
            size="sm"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {option.label}
          </Button>
        ))}
      </div>
    </form>
  );
}
