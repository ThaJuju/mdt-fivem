"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteLicense, type FormState } from "../actions";

const initialState: FormState = {};

export function DeleteLicenseButton({ citizenId, licenseId }: { citizenId: string; licenseId: string }) {
  const [, formAction, isPending] = useActionState(deleteLicense, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="citizenId" value={citizenId} />
      <input type="hidden" name="licenseId" value={licenseId} />
      <Button type="submit" variant="ghost" size="icon" disabled={isPending} title="Supprimer">
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}
