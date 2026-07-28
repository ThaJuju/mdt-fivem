"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AsyncPicker } from "@/components/async-picker";
import { EVIDENCE_KIND_LABELS } from "@/lib/labels";
import { searchVehiclesForReport } from "../search";
import {
  addEvidence,
  removeEvidence,
  addReportVehicle,
  removeReportVehicle,
  type FormState,
} from "../actions";

const initialState: FormState = {};

export type EvidenceRow = {
  id: string;
  label: string;
  description: string | null;
  kind: string;
  url: string | null;
};

export type ReportVehicleRow = {
  id: string;
  vehicleId: string;
  plate: string;
  makeModel: string;
  role: string | null;
};

function RemoveButton({
  action,
  reportId,
  idName,
  idValue,
  title,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  reportId: string;
  idName: string;
  idValue: string;
  title: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name={idName} value={idValue} />
      <Button type="submit" size="sm" variant="ghost" disabled={isPending} title={title}>
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}

export function ReportVehiclesSection({
  reportId,
  vehicles,
  canEdit,
}: {
  reportId: string;
  vehicles: ReportVehicleRow[];
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(addReportVehicle, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) setOpen(false);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Véhicules</h2>
        {canEdit ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="size-4" />
                Ajouter un véhicule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un véhicule au rapport</DialogTitle>
              </DialogHeader>
              <form action={formAction} className="flex flex-col gap-4">
                <input type="hidden" name="reportId" value={reportId} />
                <div className="flex flex-col gap-2">
                  <Label>Véhicule</Label>
                  <AsyncPicker
                    name="vehicleId"
                    search={searchVehiclesForReport}
                    placeholder="Plaque, marque…"
                    emptyLabel="Choisir un véhicule"
                    monospace
                  />
                  {state.fieldErrors?.vehicleId?.map((m) => (
                    <p key={m} className="text-sm text-destructive">
                      {m}
                    </p>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="role">Rôle (optionnel)</Label>
                  <Input id="role" name="role" placeholder="véhicule du suspect, véhicule volé…" />
                </div>
                <Button type="submit" disabled={isPending} className="w-fit">
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Ajouter
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {vehicles.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun véhicule rattaché à ce rapport.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3"
            >
              <div className="flex items-center gap-3">
                <Link href={`/vehicules/${vehicle.vehicleId}`} className="font-mono text-sm hover:underline">
                  {vehicle.plate}
                </Link>
                <span className="text-sm text-muted-foreground">{vehicle.makeModel}</span>
                {vehicle.role ? <Badge variant="secondary">{vehicle.role}</Badge> : null}
              </div>
              {canEdit ? (
                <RemoveButton
                  action={removeReportVehicle}
                  reportId={reportId}
                  idName="reportVehicleId"
                  idValue={vehicle.id}
                  title="Retirer le véhicule"
                />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function EvidenceSection({
  reportId,
  evidence,
  canEdit,
}: {
  reportId: string;
  evidence: EvidenceRow[];
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(addEvidence, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) setOpen(false);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Pièces jointes</h2>
        {canEdit ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="size-4" />
                Ajouter une pièce
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une pièce au dossier</DialogTitle>
              </DialogHeader>
              <form action={formAction} className="flex flex-col gap-4">
                <input type="hidden" name="reportId" value={reportId} />
                <div className="flex flex-col gap-2">
                  <Label htmlFor="label">Libellé</Label>
                  <Input id="label" name="label" placeholder="Photo du véhicule, relevé…" />
                  {state.fieldErrors?.label?.map((m) => (
                    <p key={m} className="text-sm text-destructive">
                      {m}
                    </p>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Nature</Label>
                  <Select name="kind" defaultValue="IMAGE">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EVIDENCE_KIND_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="url">Lien (optionnel)</Label>
                  <Input id="url" name="url" placeholder="https://…" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="description">Description (optionnel)</Label>
                  <Textarea id="description" name="description" rows={2} />
                </div>
                <Button type="submit" disabled={isPending} className="w-fit">
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Ajouter
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {evidence.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune pièce au dossier.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {evidence.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-md border border-border bg-card p-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{item.label}</span>
                  <Badge variant="secondary">{EVIDENCE_KIND_LABELS[item.kind] ?? item.kind}</Badge>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Ouvrir
                      <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
                {item.description ? (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
              {canEdit ? (
                <RemoveButton
                  action={removeEvidence}
                  reportId={reportId}
                  idName="evidenceId"
                  idValue={item.id}
                  title="Retirer la pièce"
                />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
