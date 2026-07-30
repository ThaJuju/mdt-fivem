"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { collectFine, type FineActionState } from "./actions";

const initialState: FineActionState = {};

export function CollectButton({ chargeId }: { chargeId: string }) {
  const [state, action, pending] = useActionState(collectFine, initialState);
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success("Amende encaissée.");
  }, [state]);

  return (
    <form action={action}>
      <input type="hidden" name="chargeId" value={chargeId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Encaisser
      </Button>
    </form>
  );
}
