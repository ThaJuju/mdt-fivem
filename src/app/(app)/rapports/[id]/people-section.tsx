"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CitizenPicker } from "@/components/citizen-picker";
import { AsyncPicker } from "@/components/async-picker";
import { INVOLVEMENT_ROLE_LABELS } from "@/lib/labels";
import { searchOfficers } from "../search";
import {
  addInvolvement,
  removeInvolvement,
  addOfficer,
  removeOfficer,
  type FormState,
} from "../actions";

const initialState: FormState = {};

export type InvolvementRow = {
  id: string;
  citizenId: string;
  citizenName: string;
  role: string;
  statement: string | null;
};

export type OfficerRow = {
  id: string;
  userId: string;
  name: string;
  badge: string | null;
  isLead: boolean;
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

export function InvolvementsSection({
  reportId,
  involvements,
  canEdit,
}: {
  reportId: string;
  involvements: InvolvementRow[];
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(addInvolvement, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) setOpen(false);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Personnes impliquées</h2>
        {canEdit ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="size-4" />
                Ajouter une personne
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une personne au rapport</DialogTitle>
              </DialogHeader>
              <form action={formAction} className="flex flex-col gap-4">
                <input type="hidden" name="reportId" value={reportId} />
                <div className="flex flex-col gap-2">
                  <Label>Citoyen</Label>
                  <CitizenPicker name="citizenId" />
                  {state.fieldErrors?.citizenId?.map((m) => (
                    <p key={m} className="text-sm text-destructive">
                      {m}
                    </p>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Rôle</Label>
                  <Select name="role" defaultValue="SUSPECT">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(INVOLVEMENT_ROLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="statement">Déclaration (optionnel)</Label>
                  <Textarea id="statement" name="statement" rows={3} />
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

      {involvements.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune personne rattachée à ce rapport.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {involvements.map((involvement) => (
            <div
              key={involvement.id}
              className="flex items-start justify-between gap-3 rounded-md border border-border bg-card p-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Link href={`/citoyens/${involvement.citizenId}`} className="text-sm hover:underline">
                    {involvement.citizenName}
                  </Link>
                  <Badge variant="secondary">
                    {INVOLVEMENT_ROLE_LABELS[involvement.role] ?? involvement.role}
                  </Badge>
                </div>
                {involvement.statement ? (
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{involvement.statement}</p>
                ) : null}
              </div>
              {canEdit ? (
                <RemoveButton
                  action={removeInvolvement}
                  reportId={reportId}
                  idName="involvementId"
                  idValue={involvement.id}
                  title="Retirer du rapport"
                />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function OfficersSection({
  reportId,
  officers,
  canEdit,
}: {
  reportId: string;
  officers: OfficerRow[];
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(addOfficer, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) setOpen(false);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Agents</h2>
        {canEdit ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="size-4" />
                Ajouter un agent
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un agent au rapport</DialogTitle>
              </DialogHeader>
              <form action={formAction} className="flex flex-col gap-4">
                <input type="hidden" name="reportId" value={reportId} />
                <div className="flex flex-col gap-2">
                  <Label>Agent</Label>
                  <AsyncPicker
                    name="userId"
                    search={searchOfficers}
                    placeholder="Nom, matricule…"
                    emptyLabel="Choisir un agent"
                  />
                  {state.fieldErrors?.userId?.map((m) => (
                    <p key={m} className="text-sm text-destructive">
                      {m}
                    </p>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="isLead" name="isLead" />
                  <Label htmlFor="isLead" className="font-normal">
                    Agent principal
                  </Label>
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

      <div className="flex flex-wrap gap-2">
        {officers.map((officer) => (
          <div
            key={officer.id}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
          >
            <span className="text-sm">{officer.name}</span>
            {officer.badge ? <span className="font-mono text-xs text-muted-foreground">{officer.badge}</span> : null}
            {officer.isLead ? <Badge variant="secondary">Principal</Badge> : null}
            {canEdit ? (
              <RemoveButton
                action={removeOfficer}
                reportId={reportId}
                idName="officerId"
                idValue={officer.id}
                title="Retirer l'agent"
              />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
