"use client";

import { useActionState } from "react";
import { setCitizenDeceased, type FormState } from "../actions";
import { Button } from "@/components/ui/button";

const initialState: FormState = {};

export function DeceasedToggle({ citizenId, isDeceased }: { citizenId: string; isDeceased: boolean }) {
  const [, formAction, isPending] = useActionState(setCitizenDeceased, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="citizenId" value={citizenId} />
      <input type="hidden" name="isDeceased" value={isDeceased ? "" : "on"} />
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        {isDeceased ? "Marquer comme vivant" : "Déclarer décédé"}
      </Button>
    </form>
  );
}
