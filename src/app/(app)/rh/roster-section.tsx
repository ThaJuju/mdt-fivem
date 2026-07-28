"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, UserPlus, ArrowUpDown, UserMinus, Gavel } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { AsyncPicker } from "@/components/async-picker";
import { searchHireCandidates } from "./search";
import { hireAgent, promoteAgent, terminateAgent, addDiscipline, type FormState } from "./actions";

const initialState: FormState = {};

const DISCIPLINE_LABELS: Record<string, string> = {
  COMMENDATION: "Félicitations",
  VERBAL_WARNING: "Avertissement oral",
  WRITTEN_WARNING: "Avertissement écrit",
  SUSPENSION: "Suspension",
  DEMOTION: "Rétrogradation",
  TERMINATION: "Licenciement",
};

export type DepartmentOption = {
  id: string;
  name: string;
  shortName: string;
  grades: { id: string; name: string; level: number }[];
};

export type RosterRow = {
  membershipId: string;
  userId: string;
  name: string;
  departmentId: string;
  departmentShortName: string;
  gradeName: string;
  gradeLevel: number;
  badgeNumber: string;
  callsign: string | null;
  status: string;
  hiredAt: string;
  disciplines: { id: string; type: string; reason: string; createdAt: string }[];
  certifications: { id: string; name: string; expiresAt: string | null }[];
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "En poste",
  LOA: "Congé",
  SUSPENDED: "Suspendu",
  TERMINATED: "Parti",
};

function HireDialog({ departments }: { departments: DepartmentOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(hireAgent, initialState);
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? "");

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) setOpen(false);
    if (state.error) toast.error(state.error);
  }, [state]);

  const grades = departments.find((d) => d.id === departmentId)?.grades ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" />
          Recruter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recruter un agent</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="departmentId" value={departmentId} />
          <div className="flex flex-col gap-2">
            <Label>Compte</Label>
            <AsyncPicker
              name="userId"
              search={searchHireCandidates}
              placeholder="Nom ou identifiant…"
              emptyLabel="Choisir un compte"
            />
            {state.fieldErrors?.userId?.map((m) => (
              <p key={m} className="text-sm text-destructive">
                {m}
              </p>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Département</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.shortName} — {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Grade</Label>
            <Select name="gradeId" defaultValue={grades.find((g) => g.level === 1)?.id}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="badgeNumber">Matricule</Label>
              <Input id="badgeNumber" name="badgeNumber" className="font-mono" />
              {state.fieldErrors?.badgeNumber?.map((m) => (
                <p key={m} className="text-sm text-destructive">
                  {m}
                </p>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="callsign">Indicatif</Label>
              <Input id="callsign" name="callsign" className="font-mono" />
            </div>
          </div>
          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Recruter
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PromoteDialog({ row, departments }: { row: RosterRow; departments: DepartmentOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(promoteAgent, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) setOpen(false);
    if (state.error) toast.error(state.error);
  }, [state]);

  const grades = departments.find((d) => d.id === row.departmentId)?.grades ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Changer de grade">
          <ArrowUpDown className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Changer le grade de {row.name}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="membershipId" value={row.membershipId} />
          <div className="flex flex-col gap-2">
            <Label>Nouveau grade</Label>
            <Select name="gradeId" defaultValue={grades.find((g) => g.name === row.gradeName)?.id}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...grades]
                  .sort((a, b) => a.level - b.level)
                  .map((grade) => (
                    <SelectItem key={grade.id} value={grade.id}>
                      {grade.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Les permissions de l&apos;agent suivent immédiatement son nouveau grade.
          </p>
          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Appliquer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DisciplineDialog({ row }: { row: RosterRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(addDiscipline, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) setOpen(false);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Sanction ou félicitations">
          <Gavel className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dossier disciplinaire — {row.name}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="userId" value={row.userId} />
          <div className="flex flex-col gap-2">
            <Label>Nature</Label>
            <Select name="type" defaultValue="VERBAL_WARNING">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DISCIPLINE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Motif</Label>
            <Textarea id="reason" name="reason" rows={3} />
            {state.fieldErrors?.reason?.map((m) => (
              <p key={m} className="text-sm text-destructive">
                {m}
              </p>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="durationDays">Durée en jours (suspension)</Label>
            <Input id="durationDays" name="durationDays" type="number" min={1} className="w-28" />
          </div>
          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Enregistrer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TerminateButton({ row }: { row: RosterRow }) {
  const [state, formAction] = useActionState(terminateAgent, initialState);
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Mettre fin à l'affectation">
          <UserMinus className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mettre fin à l&apos;affectation de {row.name} ?</AlertDialogTitle>
          <AlertDialogDescription>
            L&apos;agent perd immédiatement les permissions liées à ce grade. Son historique est conservé.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="membershipId" value={row.membershipId} />
            <AlertDialogAction
              type="submit"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer
            </AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RosterSection({
  roster,
  departments,
  canHire,
  canPromote,
  canTerminate,
  canDiscipline,
}: {
  roster: RosterRow[];
  departments: DepartmentOption[];
  canHire: boolean;
  canPromote: boolean;
  canTerminate: boolean;
  canDiscipline: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Effectif</h2>
        {canHire && departments.length > 0 ? <HireDialog departments={departments} /> : null}
      </div>

      {roster.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
          Aucun agent en poste. Recrutez un compte existant pour constituer l&apos;effectif.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                <th className="p-2 font-medium">Agent</th>
                <th className="p-2 font-medium">Service</th>
                <th className="p-2 font-medium">Grade</th>
                <th className="p-2 font-medium">Matricule</th>
                <th className="p-2 font-medium">Depuis</th>
                <th className="p-2 font-medium">Statut</th>
                <th className="w-28 p-2" />
              </tr>
            </thead>
            <tbody>
              {roster.map((row) => (
                <tr key={row.membershipId} className="border-b border-border last:border-0">
                  <td className="p-2">
                    <div className="flex flex-col">
                      <span>{row.name}</span>
                      {row.certifications.length > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {row.certifications.map((c) => c.name).join(", ")}
                        </span>
                      ) : null}
                      {row.disciplines.length > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {row.disciplines.length} entrée{row.disciplines.length > 1 ? "s" : ""} au dossier
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-2 font-mono text-xs">{row.departmentShortName}</td>
                  <td className="p-2">{row.gradeName}</td>
                  <td className="p-2 font-mono">
                    #{row.badgeNumber}
                    {row.callsign ? ` · ${row.callsign}` : ""}
                  </td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {format(new Date(row.hiredAt), "dd/MM/yyyy", { locale: fr })}
                  </td>
                  <td className="p-2">
                    <Badge variant={row.status === "ACTIVE" ? "outline" : "secondary"}>
                      {STATUS_LABELS[row.status] ?? row.status}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <div className="flex justify-end gap-1">
                      {canPromote ? <PromoteDialog row={row} departments={departments} /> : null}
                      {canDiscipline ? <DisciplineDialog row={row} /> : null}
                      {canTerminate && row.status !== "TERMINATED" ? <TerminateButton row={row} /> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
