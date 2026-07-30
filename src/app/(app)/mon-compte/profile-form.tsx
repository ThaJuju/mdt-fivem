"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ImageField } from "@/components/image-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, type ProfileState } from "./actions";

const initialState: ProfileState = {};

export function ProfileForm({
  email,
  avatarUrl,
}: {
  email: string | null;
  avatarUrl: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);

  useEffect(() => {
    if (state.success) toast.success("Profil mis à jour.");
  }, [state.success]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Adresse e-mail</Label>
        <Input id="email" name="email" type="email" defaultValue={email ?? ""} autoComplete="email" />
        {state.fieldErrors?.email?.map((message) => (
          <p key={message} className="text-sm text-destructive">{message}</p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Photo de profil</Label>
        <ImageField
          name="avatarUrl"
          label="Photo de profil"
          defaultValue={avatarUrl}
          purpose="avatar"
          maxBytes={1024 * 1024}
        />
        {state.fieldErrors?.avatarUrl?.map((message) => (
          <p key={message} className="text-sm text-destructive">{message}</p>
        ))}
      </div>

      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Enregistrer le profil
      </Button>
    </form>
  );
}
