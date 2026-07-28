"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus, Pencil, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CitizenPicker } from "@/components/citizen-picker";
import { AsyncPicker } from "@/components/async-picker";
import { ImageField } from "@/components/image-field";
import { searchVehiclesForReport } from "@/app/(app)/rapports/search";
import { saveBolo, closeBolo, reopenBolo, deleteBolo, type FormState } from "./actions";

const initialState: FormState = {};

export type ExistingBolo = {
  id: string;
  type: string;
  title: string;
  description: string;
  plate: string | null;
  imageUrl: string | null;
  expiresAt: string | null;
};

function BoloForm({ bolo, onSuccess }: { bolo?: ExistingBolo; onSuccess?: () => void }) {
  const [state, formAction, isPending] = useActionState(saveBolo, initialState);
  const [type, setType] = useState(bolo?.type ?? "PERSON");

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) onSuccess?.();
    if (state.error) toast.error(state.error);
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {bolo ? <input type="hidden" name="id" value={bolo.id} /> : null}
      <input type="hidden" name="type" value={type} />

      <div className="flex flex-col gap-2">
        <Label>Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PERSON">Personne recherchée</SelectItem>
            <SelectItem value="VEHICLE">Véhicule recherché</SelectItem>
            <SelectItem value="OTHER">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Titre</Label>
        <Input id="title" name="title" defaultValue={bolo?.title} />
        {state.fieldErrors?.title?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={4} defaultValue={bolo?.description} />
        {state.fieldErrors?.description?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
      </div>

      {type === "PERSON" && !bolo ? (
        <div className="flex flex-col gap-2">
          <Label>Personne concernée (optionnel)</Label>
          <CitizenPicker name="citizenId" />
        </div>
      ) : null}

      {type === "VEHICLE" ? (
        <>
          {!bolo ? (
            <div className="flex flex-col gap-2">
              <Label>Véhicule au fichier (optionnel)</Label>
              <AsyncPicker
                name="vehicleId"
                search={searchVehiclesForReport}
                placeholder="Plaque, marque…"
                emptyLabel="Aucun véhicule lié"
                monospace
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label htmlFor="plate">Plaque relevée (si non fichée)</Label>
            <Input id="plate" name="plate" defaultValue={bolo?.plate ?? undefined} className="font-mono" />
          </div>
        </>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label>Image (optionnel)</Label>
        <ImageField name="imageUrl" defaultValue={bolo?.imageUrl} label="Image du BOLO" />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="expiresAt">Expire le (optionnel)</Label>
        <Input id="expiresAt" name="expiresAt" type="date" defaultValue={bolo?.expiresAt ?? undefined} />
      </div>

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {bolo ? "Enregistrer" : "Diffuser le BOLO"}
      </Button>
    </form>
  );
}

export function CreateBoloDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Diffuser un BOLO
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Diffuser un BOLO</DialogTitle>
        </DialogHeader>
        <BoloForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditBoloDialog({ bolo }: { bolo: ExistingBolo }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Modifier">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le BOLO</DialogTitle>
        </DialogHeader>
        <BoloForm bolo={bolo} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function SimpleForm({
  action,
  boloId,
  label,
  icon,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  boloId: string;
  label: string;
  icon: React.ReactNode;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="boloId" value={boloId} />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : icon}
        {label}
      </Button>
    </form>
  );
}

export function CloseBoloButton({ boloId }: { boloId: string }) {
  return (
    <SimpleForm action={closeBolo} boloId={boloId} label="Clôturer" icon={<CheckCircle2 className="size-4" />} />
  );
}

export function ReopenBoloButton({ boloId }: { boloId: string }) {
  return (
    <SimpleForm action={reopenBolo} boloId={boloId} label="Rouvrir" icon={<RotateCcw className="size-4" />} />
  );
}

export function DeleteBoloButton({ boloId }: { boloId: string }) {
  const [state, formAction] = useActionState(deleteBolo, initialState);
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Supprimer">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce BOLO ?</AlertDialogTitle>
          <AlertDialogDescription>
            Préférez la clôture si l&apos;avis a simplement été levé : elle en garde la trace.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="boloId" value={boloId} />
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
