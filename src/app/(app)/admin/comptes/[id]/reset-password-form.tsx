"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword, type FormState } from "../actions";

const initialState: FormState = {};

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, formAction, isPending] = useActionState(resetPassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={userId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Nouveau mot de passe provisoire</Label>
        <Input id="password" name="password" type="password" />
        {state.fieldErrors?.password?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
        <p className="text-xs text-muted-foreground">
          L&apos;utilisateur devra le changer à sa prochaine connexion.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} variant="outline" className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Réinitialiser le mot de passe
      </Button>
    </form>
  );
}
