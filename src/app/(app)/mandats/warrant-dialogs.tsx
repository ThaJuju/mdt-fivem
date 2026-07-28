"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus, Check, X, Gavel } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CitizenPicker } from "@/components/citizen-picker";
import { requestWarrant, approveWarrant, denyWarrant, executeWarrant, type FormState } from "./actions";

const initialState: FormState = {};

export function RequestWarrantDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(requestWarrant, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) setOpen(false);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Demander un mandat
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander un mandat</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Type</Label>
            <Select name="type" defaultValue="ARREST">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ARREST">Mandat d&apos;arrêt</SelectItem>
                <SelectItem value="SEARCH">Mandat de perquisition</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Personne visée</Label>
            <CitizenPicker name="citizenId" />
            {state.fieldErrors?.citizenId?.map((m) => (
              <p key={m} className="text-sm text-destructive">
                {m}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Motif</Label>
            <Textarea id="reason" name="reason" rows={4} placeholder="Éléments justifiant la demande." />
            {state.fieldErrors?.reason?.map((m) => (
              <p key={m} className="text-sm text-destructive">
                {m}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Adresse (perquisition)</Label>
            <Input id="address" name="address" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="expiresAt">Expire le (optionnel)</Label>
            <Input id="expiresAt" name="expiresAt" type="date" />
          </div>

          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Envoyer la demande
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ApproveWarrantDialog({ warrantId }: { warrantId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(approveWarrant, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) setOpen(false);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Check className="size-4" />
          Approuver
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approuver le mandat</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="warrantId" value={warrantId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor={`exp-${warrantId}`}>Date d&apos;expiration (optionnel)</Label>
            <Input id={`exp-${warrantId}`} name="expiresAt" type="date" />
            <p className="text-xs text-muted-foreground">
              Passée cette date, le mandat bascule automatiquement en expiré.
            </p>
          </div>
          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Rendre le mandat actif
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SimpleActionButton({
  action,
  warrantId,
  label,
  icon,
  variant = "outline",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  warrantId: string;
  label: string;
  icon: React.ReactNode;
  variant?: "outline" | "default";
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="warrantId" value={warrantId} />
      <Button type="submit" size="sm" variant={variant} disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : icon}
        {label}
      </Button>
    </form>
  );
}

export function DenyWarrantButton({ warrantId }: { warrantId: string }) {
  return (
    <SimpleActionButton
      action={denyWarrant}
      warrantId={warrantId}
      label="Refuser"
      icon={<X className="size-4" />}
    />
  );
}

export function ExecuteWarrantButton({ warrantId }: { warrantId: string }) {
  return (
    <SimpleActionButton
      action={executeWarrant}
      warrantId={warrantId}
      label="Marquer exécuté"
      icon={<Gavel className="size-4" />}
    />
  );
}
