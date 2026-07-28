"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Check, X, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { submitReport, approveReport, rejectReport, deleteReport, type FormState } from "../actions";

const initialState: FormState = {};

export function WorkflowBar({
  reportId,
  status,
  canEdit,
  canApprove,
  canDelete,
}: {
  reportId: string;
  status: string;
  canEdit: boolean;
  canApprove: boolean;
  canDelete: boolean;
}) {
  const [submitState, submitAction, isSubmitting] = useActionState(submitReport, initialState);
  const [approveState, approveAction, isApproving] = useActionState(approveReport, initialState);
  const [deleteState, deleteAction] = useActionState(deleteReport, initialState);
  const [rejectState, rejectAction, isRejecting] = useActionState(rejectReport, initialState);
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => {
    for (const state of [submitState, approveState, rejectState, deleteState]) {
      if (state.error) toast.error(state.error);
    }
  }, [submitState, approveState, rejectState, deleteState]);

  useEffect(() => {
    if (rejectState !== initialState && !rejectState.error && !rejectState.fieldErrors) setRejectOpen(false);
  }, [rejectState]);

  const canSubmit = canEdit && (status === "DRAFT" || status === "REJECTED");
  const canDecide = canApprove && status === "SUBMITTED";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canSubmit ? (
        <form action={submitAction}>
          <input type="hidden" name="reportId" value={reportId} />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Soumettre à validation
          </Button>
        </form>
      ) : null}

      {canDecide ? (
        <>
          <form action={approveAction}>
            <input type="hidden" name="reportId" value={reportId} />
            <Button type="submit" disabled={isApproving}>
              {isApproving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Valider le rapport
            </Button>
          </form>

          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <X className="size-4" />
                Refuser
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Refuser le rapport</DialogTitle>
              </DialogHeader>
              <form action={rejectAction} className="flex flex-col gap-4">
                <input type="hidden" name="reportId" value={reportId} />
                <div className="flex flex-col gap-2">
                  <Label htmlFor="rejectReason">Motif du refus</Label>
                  <Textarea
                    id="rejectReason"
                    name="rejectReason"
                    rows={4}
                    placeholder="Expliquez ce qui doit être corrigé pour que le rapport puisse être validé."
                  />
                  {rejectState.fieldErrors?.rejectReason?.map((m) => (
                    <p key={m} className="text-sm text-destructive">
                      {m}
                    </p>
                  ))}
                </div>
                <Button type="submit" disabled={isRejecting} className="w-fit">
                  {isRejecting ? <Loader2 className="size-4 animate-spin" /> : null}
                  Renvoyer pour correction
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </>
      ) : null}

      {canDelete ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-destructive hover:text-destructive">
              <Trash2 className="size-4" />
              Supprimer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce rapport ?</AlertDialogTitle>
              <AlertDialogDescription>
                Les charges, pièces jointes et personnes rattachées seront supprimées avec lui. Cette action
                est définitive.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <form action={deleteAction}>
                <input type="hidden" name="reportId" value={reportId} />
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
      ) : null}
    </div>
  );
}
