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
import { deleteCitizen, type FormState } from "../actions";

const initialState: FormState = {};

/**
 * Le refus quand la fiche est référencée arrive du serveur, pas d'ici : le
 * bouton reste proposé et l'erreur explique ce qui rattache la fiche et
 * pourquoi l'archivage est la bonne sortie. Masquer le bouton laisserait
 * l'agent chercher pourquoi il ne peut rien faire.
 */
export function DeleteCitizenButton({ citizenId }: { citizenId: string }) {
  const [state, formAction] = useActionState(deleteCitizen, initialState);

  useEffect(() => {
    // Message long et actionnable : on laisse le temps de le lire.
    if (state.error) toast.error(state.error, { duration: 12000 });
  }, [state]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 className="size-4" />
          Supprimer
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cette fiche ?</AlertDialogTitle>
          <AlertDialogDescription>
            Définitif. La suppression n&apos;aboutit que si aucun rapport, charge, mandat, BOLO,
            véhicule, arme ni propriété ne cite cette personne — sinon il faut l&apos;archiver.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="citizenId" value={citizenId} />
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
