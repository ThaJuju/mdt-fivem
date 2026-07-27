"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createUser, type FormState } from "./actions";

const initialState: FormState = {};

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createUser, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Créer un compte
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un compte</DialogTitle>
          <DialogDescription>
            L&apos;utilisateur devra changer ce mot de passe à sa première connexion. Vous pourrez lui
            attribuer une affectation une fois le compte créé.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input id="firstName" name="firstName" autoFocus />
              {state.fieldErrors?.firstName?.map((m) => (
                <p key={m} className="text-sm text-destructive">
                  {m}
                </p>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input id="lastName" name="lastName" />
              {state.fieldErrors?.lastName?.map((m) => (
                <p key={m} className="text-sm text-destructive">
                  {m}
                </p>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Identifiant</Label>
            <Input id="username" name="username" className="font-mono" placeholder="j.doe" />
            {state.fieldErrors?.username?.map((m) => (
              <p key={m} className="text-sm text-destructive">
                {m}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email (optionnel)</Label>
            <Input id="email" name="email" type="email" />
            {state.fieldErrors?.email?.map((m) => (
              <p key={m} className="text-sm text-destructive">
                {m}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Mot de passe provisoire</Label>
            <Input id="password" name="password" type="password" />
            {state.fieldErrors?.password?.map((m) => (
              <p key={m} className="text-sm text-destructive">
                {m}
              </p>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="isSuperAdmin" name="isSuperAdmin" />
            <Label htmlFor="isSuperAdmin" className="font-normal">
              Super-admin (court-circuite toutes les permissions)
            </Label>
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Créer le compte
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
