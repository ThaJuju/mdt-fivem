"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus, Radio, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  createCall,
  updateCallStatus,
  closeCall,
  addCallLog,
  assignUnit,
  unassignUnit,
  type FormState,
} from "./actions";
import {
  CALL_STATUS_LABELS,
  CALL_SOURCE_LABELS,
  priorityClass,
  type CallRow,
  type UnitRow,
  type StatusCodeOption,
} from "./types";

const initialState: FormState = {};

function NewCallDialog({ statusCodes }: { statusCodes: StatusCodeOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createCall, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) setOpen(false);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Créer un appel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un appel</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Origine</Label>
              <Select name="source" defaultValue="EMERGENCY">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CALL_SOURCE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Priorité</Label>
              <Select name="priority" defaultValue="3">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — urgence</SelectItem>
                  <SelectItem value="2">2 — prioritaire</SelectItem>
                  <SelectItem value="3">3 — courant</SelectItem>
                  <SelectItem value="4">4 — différé</SelectItem>
                  <SelectItem value="5">5 — information</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>10-code</Label>
              <Select name="code">
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {statusCodes.map((statusCode) => (
                    <SelectItem key={statusCode.code} value={statusCode.code}>
                      {statusCode.code} — {statusCode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" name="title" placeholder="Cambriolage en cours" />
            {state.fieldErrors?.title?.map((m) => (
              <p key={m} className="text-sm text-destructive">
                {m}
              </p>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-2">
              <Label htmlFor="location">Lieu</Label>
              <Input id="location" name="location" />
              {state.fieldErrors?.location?.map((m) => (
                <p key={m} className="text-sm text-destructive">
                  {m}
                </p>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="postal">Code postal</Label>
              <Input id="postal" name="postal" className="font-mono" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="callerName">Appelant</Label>
              <Input id="callerName" name="callerName" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="callerPhone">Téléphone</Label>
              <Input id="callerPhone" name="callerPhone" className="font-mono" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tags">Étiquettes (séparées par des virgules)</Label>
            <Input id="tags" name="tags" placeholder="arme, véhicule" />
          </div>

          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Créer l&apos;appel
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignUnitForm({ callId, units }: { callId: string; units: UnitRow[] }) {
  const [state, formAction, isPending] = useActionState(assignUnit, initialState);
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  const available = units.filter((unit) => unit.status !== "OFF_DUTY");
  if (available.length === 0) return null;

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="callId" value={callId} />
      <Select name="unitId">
        <SelectTrigger size="sm" className="h-7 w-40 text-xs">
          <SelectValue placeholder="Engager une unité" />
        </SelectTrigger>
        <SelectContent>
          {available.map((unit) => (
            <SelectItem key={unit.id} value={unit.id}>
              {unit.callsign}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Radio className="size-4" />}
        Engager
      </Button>
    </form>
  );
}

function UnassignButton({ callId, unitId }: { callId: string; unitId: string }) {
  const [, formAction, isPending] = useActionState(unassignUnit, initialState);
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="callId" value={callId} />
      <input type="hidden" name="unitId" value={unitId} />
      <button type="submit" disabled={isPending} className="ml-1 text-muted-foreground hover:text-foreground">
        <X className="size-3" />
      </button>
    </form>
  );
}

function CallStatusSelect({ callId, status }: { callId: string; status: string }) {
  const [state, formAction] = useActionState(updateCallStatus, initialState);
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="callId" value={callId} />
      <Select name="status" defaultValue={status}>
        <SelectTrigger size="sm" className="h-7 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(CALL_STATUS_LABELS)
            .filter(([value]) => value !== "CLOSED")
            .map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <button type="submit" className="sr-only">
        Appliquer
      </button>
    </form>
  );
}

function CloseCallDialog({ callId, callNumber }: { callId: string; callNumber: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(closeCall, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) setOpen(false);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Clôturer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clôturer l&apos;appel #{callNumber}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="callId" value={callId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor={`note-${callId}`}>Compte rendu</Label>
            <Textarea id={`note-${callId}`} name="closeNote" rows={3} placeholder="Issue de l'intervention." />
          </div>
          <p className="text-xs text-muted-foreground">
            Les unités engagées repasseront disponibles. Rédigez ensuite un rapport si l&apos;intervention le
            justifie.
          </p>
          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Clôturer l&apos;appel
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CallLogForm({ callId }: { callId: string }) {
  const [state, formAction, isPending] = useActionState(addCallLog, initialState);
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="callId" value={callId} />
      <Input name="message" placeholder="Ajouter au journal…" className="h-7 text-xs" />
      <Button type="submit" size="sm" variant="ghost" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : "Noter"}
      </Button>
    </form>
  );
}

export function CallsPanel({
  calls,
  units,
  statusCodes,
  canCreate,
  canEdit,
  canClose,
  canAssign,
}: {
  calls: CallRow[];
  units: UnitRow[];
  statusCodes: StatusCodeOption[];
  canCreate: boolean;
  canEdit: boolean;
  canClose: boolean;
  canAssign: boolean;
}) {
  const [openCallId, setOpenCallId] = useState<string | null>(null);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">File d&apos;appels</h2>
        {canCreate ? <NewCallDialog statusCodes={statusCodes} /> : null}
      </div>

      {calls.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Aucun appel en cours. Le calme règne sur Los Santos.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {calls.map((call) => {
            const isOpen = openCallId === call.id;
            return (
              <article
                key={call.id}
                className={cn(
                  "flex flex-col gap-2 rounded-md border-l-4 border border-border bg-card p-3",
                  priorityClass(call.priority),
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">#{call.number}</span>
                    <span className={cn("rounded border px-1.5 py-0.5 font-mono text-xs", priorityClass(call.priority))}>
                      P{call.priority}
                    </span>
                    {call.code ? <span className="font-mono text-xs">{call.code}</span> : null}
                    <span className="text-sm font-medium text-foreground">{call.title}</span>
                    <Badge variant="outline">{CALL_STATUS_LABELS[call.status] ?? call.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {canEdit ? <CallStatusSelect callId={call.id} status={call.status} /> : null}
                    {canClose ? <CloseCallDialog callId={call.id} callNumber={call.number} /> : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpenCallId(isOpen ? null : call.id)}
                    >
                      {isOpen ? "Replier" : "Détails"}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{call.location}</span>
                  {call.postal ? <span className="font-mono">{call.postal}</span> : null}
                  <span>· {CALL_SOURCE_LABELS[call.source] ?? call.source}</span>
                  <span>
                    · il y a{" "}
                    {formatDistanceToNow(new Date(call.createdAt), { locale: fr })}
                  </span>
                  {call.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {call.units.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Aucune unité engagée</span>
                  ) : (
                    call.units.map((unit) => (
                      <span
                        key={unit.id}
                        className="flex items-center rounded bg-secondary px-1.5 py-0.5 font-mono text-xs"
                      >
                        {unit.callsign}
                        {canAssign ? <UnassignButton callId={call.id} unitId={unit.id} /> : null}
                      </span>
                    ))
                  )}
                  {canAssign ? <AssignUnitForm callId={call.id} units={units} /> : null}
                </div>

                {isOpen ? (
                  <div className="flex flex-col gap-2 border-t border-border pt-2">
                    {call.description ? <p className="text-sm">{call.description}</p> : null}
                    {call.callerName || call.callerPhone ? (
                      <p className="text-xs text-muted-foreground">
                        Appelant : {call.callerName ?? "inconnu"}
                        {call.callerPhone ? ` · ${call.callerPhone}` : ""}
                      </p>
                    ) : null}

                    <div className="flex flex-col gap-1">
                      {call.logs.map((log) => (
                        <p key={log.id} className="text-xs text-muted-foreground">
                          <span className="font-mono">
                            {new Date(log.createdAt).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>{" "}
                          {log.authorName ? `${log.authorName} — ` : ""}
                          {log.message}
                        </p>
                      ))}
                    </div>

                    <CallLogForm callId={call.id} />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
