"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
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
import { setCitizenArchived, type FormState } from "../actions";

const initialState: FormState = {};

export function ArchiveToggle({ citizenId, isArchived }: { citizenId: string; isArchived: boolean }) {
  const [state, formAction] = useActionState(setCitizenArchived, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state !== initialState && !state.error) {
      toast.success(isArchived ? "Fiche réactivée." : "Fiche archivée.");
      router.refresh();
    }
    // `isArchived` est la valeur d'avant l'action : l'inclure relancerait
    // l'effet au rafraîchissement et rejouerait le message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, state]);

  // Réactiver ne détruit rien : pas de confirmation, un simple bouton.
  if (isArchived) {
    return (
      <form action={formAction}>
        <input type="hidden" name="citizenId" value={citizenId} />
        <input type="hidden" name="archived" value="false" />
        <Button type="submit" variant="outline">
          <ArchiveRestore className="size-4" />
          Réactiver la fiche
        </Button>
      </form>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="outline">
          <Archive className="size-4" />
          Archiver
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archiver cette fiche ?</AlertDialogTitle>
          <AlertDialogDescription>
            Elle sortira des listes et de la recherche, et ne pourra plus être rattachée à un nouveau
            dossier. Elle reste consultable depuis les rapports, charges et mandats qui la citent, et
            peut être réactivée à tout moment.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="citizenId" value={citizenId} />
            <input type="hidden" name="archived" value="true" />
            <AlertDialogAction type="submit">Archiver</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
