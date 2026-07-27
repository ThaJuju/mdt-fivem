"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="currentPassword">Mot de passe actuel</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          autoFocus
          aria-invalid={Boolean(state.fieldErrors?.currentPassword)}
        />
        {state.fieldErrors?.currentPassword?.map((message) => (
          <p key={message} className="text-sm text-destructive">
            {message}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword">Nouveau mot de passe</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(state.fieldErrors?.newPassword)}
        />
        {state.fieldErrors?.newPassword?.map((message) => (
          <p key={message} className="text-sm text-destructive">
            {message}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
        />
        {state.fieldErrors?.confirmPassword?.map((message) => (
          <p key={message} className="text-sm text-destructive">
            {message}
          </p>
        ))}
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="mt-1">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Valider le nouveau mot de passe
      </Button>
    </form>
  );
}
