"use client";

import { useActionState } from "react";
import { setVehicleStolen, type FormState } from "../actions";
import { Button } from "@/components/ui/button";

const initialState: FormState = {};

export function StolenToggle({ vehicleId, isStolen }: { vehicleId: string; isStolen: boolean }) {
  const [, formAction, isPending] = useActionState(setVehicleStolen, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="isStolen" value={isStolen ? "" : "on"} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={isPending}
        className={isStolen ? undefined : "border-alert bg-alert text-alert-foreground hover:bg-alert/90"}
      >
        {isStolen ? "Retirer le signalement de vol" : "Signaler comme volé"}
      </Button>
    </form>
  );
}
