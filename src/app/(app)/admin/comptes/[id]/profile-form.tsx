"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { updateUser, type FormState } from "../actions";

type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
};

const initialState: FormState = {};

export function ProfileForm({ user, isSelf }: { user: UserProfile; isSelf: boolean }) {
  const [state, formAction, isPending] = useActionState(updateUser, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={user.id} />
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input id="firstName" name="firstName" defaultValue={user.firstName} />
          {state.fieldErrors?.firstName?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" name="lastName" defaultValue={user.lastName} />
          {state.fieldErrors?.lastName?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={user.email ?? ""} />
        {state.fieldErrors?.email?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Checkbox id="isActive" name="isActive" defaultChecked={user.isActive} />
          <Label htmlFor="isActive" className="font-normal">
            Compte actif
          </Label>
        </div>
        {isSelf ? (
          <p className="pl-6 text-xs text-muted-foreground">
            Vous ne pouvez pas désactiver votre propre compte.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Checkbox id="isSuperAdmin" name="isSuperAdmin" defaultChecked={user.isSuperAdmin} />
          <Label htmlFor="isSuperAdmin" className="font-normal">
            Super-admin
          </Label>
        </div>
        {isSelf && user.isSuperAdmin ? (
          <p className="pl-6 text-xs text-muted-foreground">
            Vous ne pouvez pas retirer votre propre statut super-admin.
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        Enregistrer
      </Button>
    </form>
  );
}
