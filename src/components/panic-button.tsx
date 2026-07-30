"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Siren } from "lucide-react";
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
import { setUnitStatus, type FormState } from "@/app/(app)/dispatch/actions";

const initialState: FormState = {};

/**
 * Déclenchement du 10-99 depuis la barre de navigation, donc depuis n'importe
 * quel écran : un agent en danger n'a pas le temps d'aller chercher le
 * tableau de dispatch. La confirmation évite le déclenchement accidentel — un
 * 10-99 mobilise tout le monde.
 */
export function PanicButton({ unitId, isPanicking }: { unitId: string; isPanicking: boolean }) {
  const [state, formAction] = useActionState(setUnitStatus, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state !== initialState && !state.error && !state.fieldErrors) router.refresh();
  }, [router, state]);

  if (isPanicking) {
    return (
      <form action={formAction}>
        <input type="hidden" name="unitId" value={unitId} />
        <input type="hidden" name="status" value="AVAILABLE" />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="h-9 border-alert text-alert"
          title="Lever le 10-99 de votre unité"
        >
          Lever le 10-99
        </Button>
      </form>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-9 text-alert hover:bg-alert/15 hover:text-alert"
          title="Déclencher un 10-99"
        >
          <Siren className="size-4" />
          <span className="sr-only">Déclencher un 10-99</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Déclencher un 10-99 ?</AlertDialogTitle>
          <AlertDialogDescription>
            Tous les postes connectés seront alertés immédiatement, quel que soit l&apos;écran
            ouvert. À n&apos;utiliser qu&apos;en cas d&apos;urgence vitale.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="unitId" value={unitId} />
            <input type="hidden" name="status" value="PANIC" />
            <AlertDialogAction type="submit" className="bg-alert text-alert-foreground hover:bg-alert/90">
              Déclencher
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
