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
import {
  createUnit, setUnitStatus, joinUnit, leaveUnit, deleteUnit,
  createUnitType, deleteUnitType, type FormState,
} from "./actions";
import { UNIT_STATUS_LABELS, unitStatusClass, type UnitRow, type UnitTypeOption } from "./types";

const initialState: FormState = {};

function CreateUnitDialog({ unitTypes }: { unitTypes: UnitTypeOption[] }) {
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
            <Label>Type</Label>
            <Select name="typeId">
              <SelectTrigger><SelectValue placeholder="Sélectionner un type" /></SelectTrigger>
              <SelectContent>
                {unitTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {state.fieldErrors?.typeId?.map((m) => (
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

function ManageUnitTypesDialog({ unitTypes }: { unitTypes: UnitTypeOption[] }) {
  const [createState, createAction, isCreating] = useActionState(createUnitType, initialState);
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteUnitType, initialState);
  useEffect(() => {
    if (createState.error) toast.error(createState.error);
    if (deleteState.error) toast.error(deleteState.error);
  }, [createState, deleteState]);
  return (
    <Dialog>
      <DialogTrigger asChild><Button size="sm" variant="ghost">Types</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Types d&apos;unités du service</DialogTitle></DialogHeader>
        <form action={createAction} className="flex gap-2">
          <Input name="name" placeholder="Nouveau type" />
          <Button type="submit" disabled={isCreating}>Ajouter</Button>
        </form>
        {createState.fieldErrors?.name?.map((message) => <p key={message} className="text-sm text-destructive">{message}</p>)}
        <div className="flex flex-col gap-2">
          {unitTypes.map((type) => (
            <div key={type.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
              {type.name}
              <form action={deleteAction}>
                <input type="hidden" name="typeId" value={type.id} />
                <Button type="submit" size="sm" variant="ghost" disabled={isDeleting}><Trash2 className="size-4" /></Button>
              </form>
            </div>
          ))}
        </div>
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
  actorDepartmentId,
  unitTypes,
}: {
  units: UnitRow[];
  actorId: string;
  canManage: boolean;
  actorDepartmentId: string | null;
  unitTypes: UnitTypeOption[];
}) {
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const departments = Array.from(
    new Map(units.map((unit) => [unit.departmentId, {
      id: unit.departmentId,
      name: unit.departmentName,
      shortName: unit.departmentShortName,
    }])).values(),
  );
  const visibleUnits = departmentFilter === "all"
    ? units
    : units.filter((unit) => unit.departmentId === departmentFilter);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Unités</h2>
        {canManage ? <div className="flex items-center gap-1"><ManageUnitTypesDialog unitTypes={unitTypes} /><CreateUnitDialog unitTypes={unitTypes} /></div> : null}
      </div>

      <div className="flex flex-wrap gap-1">
        <Button type="button" size="sm" variant={departmentFilter === "all" ? "secondary" : "ghost"} onClick={() => setDepartmentFilter("all")}>Tous</Button>
        {departments.map((department) => (
          <Button key={department.id} type="button" size="sm" variant={departmentFilter === department.id ? "secondary" : "ghost"} onClick={() => setDepartmentFilter(department.id)}>
            {department.shortName}
          </Button>
        ))}
      </div>

      {units.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Aucune unité en service. Créez-en une puis rejoignez-la pour prendre votre poste.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleUnits.map((unit, index) => {
            const isMember = unit.members.some((member) => member.userId === actorId);
            const isOwnDepartment = unit.departmentId === actorDepartmentId;
            const showDepartmentHeading = index === 0 || visibleUnits[index - 1]?.departmentId !== unit.departmentId;
            return (
              <div key={unit.id} className="contents">
              {showDepartmentHeading ? <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{unit.departmentName}</h3> : null}
              <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
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
                    {isOwnDepartment ? <UnitStatusSelect unitId={unit.id} status={unit.status} /> : null}
                    {isOwnDepartment ? <UnitMembershipButton unitId={unit.id} isMember={isMember} /> : null}
                    {canManage && isOwnDepartment ? <DeleteUnitButton unitId={unit.id} /> : null}
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
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
