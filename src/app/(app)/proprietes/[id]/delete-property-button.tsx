"use client";

import { useActionState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteProperty, type FormState } from "../actions";

const initialState: FormState = {};

export function DeletePropertyButton({ propertyId }: { propertyId: string }) {
  const [state, formAction] = useActionState(deleteProperty, initialState);
  useEffect(() => { if (state.error) toast.error(state.error); }, [state]);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="outline" className="text-destructive hover:text-destructive"><Trash2 className="size-4" />Supprimer le bien</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Supprimer cette propriété ?</AlertDialogTitle><AlertDialogDescription>Les mandats associés conserveront leur adresse, mais ne viseront plus cette fiche.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><form action={formAction}><input type="hidden" name="propertyId" value={propertyId} /><AlertDialogAction type="submit" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></form></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
