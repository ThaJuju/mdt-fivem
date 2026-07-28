"use client";

import { useActionState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteUser, type FormState } from "../actions";

const initialState: FormState = {};

export function DeleteUserButton({ userId, username }: { userId: string; username: string }) {
  const [state, formAction] = useActionState(deleteUser, initialState);

  // Le refus est explicatif et souvent long : un toast persistant le rend
  // lisible, plutôt qu'un message qui disparaît en trois secondes.
  useEffect(() => {
    if (state.error) toast.error(state.error, { duration: 12000 });
  }, [state]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 className="size-4" />
          Supprimer le compte
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer le compte {username} ?</AlertDialogTitle>
          <AlertDialogDescription>
            La suppression n&apos;est possible que si le compte n&apos;a laissé aucune trace : aucun
            rapport, note, mandat, BOLO ni passage au journal d&apos;audit. Elle sert à effacer un compte
            créé par erreur.
            <br />
            <br />
            Si le compte a servi, décochez plutôt « Compte actif » : l&apos;accès est retiré et
            l&apos;historique reste attribuable.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="userId" value={userId} />
            <AlertDialogAction
              type="submit"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
