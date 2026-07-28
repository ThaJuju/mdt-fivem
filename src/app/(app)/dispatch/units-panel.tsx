"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus, LogIn, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createUnit, setUnitStatus, joinUnit, leaveUnit, deleteUnit, type FormState } from "./actions";
import { UNIT_STATUS_LABELS, unitStatusClass, type UnitRow } from "./types";

const initialState: FormState = {};

function CreateUnitDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createUnit, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) setOpen(false);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" />
          Créer une unité
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une unité</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="callsign">Indicatif</Label>
            <Input id="callsign" name="callsign" placeholder="1-ADAM-12" className="font-mono" />
            {state.fieldErrors?.callsign?.map((m) => (
              <p key={m} className="text-sm text-destructive">
                {m}
              </p>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Type</Label>
            <Input id="type" name="type" placeholder="patrouille, ambulance…" />
            {state.fieldErrors?.type?.map((m) => (
              <p key={m} className="text-sm text-destructive">
                {m}
              </p>
            ))}
          </div>
          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Créer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UnitStatusSelect({ unitId, status }: { unitId: string; status: string }) {
  const [state, formAction] = useActionState(setUnitStatus, initialState);
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="unitId" value={unitId} />
      <Select name="status" defaultValue={status}>
        <SelectTrigger size="sm" className="h-7 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(UNIT_STATUS_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button type="submit" className="sr-only">
        Appliquer le statut
      </button>
    </form>
  );
}

function UnitMembershipButton({ unitId, isMember }: { unitId: string; isMember: boolean }) {
  const [state, formAction, isPending] = useActionState(isMember ? leaveUnit : joinUnit, initialState);
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="unitId" value={unitId} />
      <Button type="submit" size="sm" variant="ghost" disabled={isPending} title={isMember ? "Quitter" : "Rejoindre"}>
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isMember ? (
          <LogOut className="size-4" />
        ) : (
          <LogIn className="size-4" />
        )}
      </Button>
    </form>
  );
}

function DeleteUnitButton({ unitId }: { unitId: string }) {
  const [state, formAction, isPending] = useActionState(deleteUnit, initialState);
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="unitId" value={unitId} />
      <Button type="submit" size="sm" variant="ghost" disabled={isPending} title="Supprimer l'unité">
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}

export function UnitsPanel({
  units,
  actorId,
  canManage,
}: {
  units: UnitRow[];
  actorId: string;
  canManage: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Unités</h2>
        {canManage ? <CreateUnitDialog /> : null}
      </div>

      {units.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Aucune unité en service. Créez-en une puis rejoignez-la pour prendre votre poste.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {units.map((unit) => {
            const isMember = unit.members.some((member) => member.userId === actorId);
            return (
              <div key={unit.id} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{unit.callsign}</span>
                    <span
                      className={cn("rounded px-1.5 py-0.5 text-xs", unitStatusClass(unit.status))}
                    >
                      {UNIT_STATUS_LABELS[unit.status] ?? unit.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{unit.type}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UnitStatusSelect unitId={unit.id} status={unit.status} />
                    <UnitMembershipButton unitId={unit.id} isMember={isMember} />
                    {canManage ? <DeleteUnitButton unitId={unit.id} /> : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {unit.members.length === 0 ? (
                    <span>Aucun agent à bord</span>
                  ) : (
                    unit.members.map((member) => (
                      <span key={member.userId}>
                        {member.name}
                        {member.isLead ? " (chef)" : ""}
                      </span>
                    ))
                  )}
                  {unit.assignedCallNumbers.length > 0 ? (
                    <span className="font-mono">
                      · appel{unit.assignedCallNumbers.length > 1 ? "s" : ""}{" "}
                      {unit.assignedCallNumbers.map((n) => `#${n}`).join(", ")}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
