"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Play, Square, Pin } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AsyncPicker } from "@/components/async-picker";
import { searchStaff } from "./search";
import {
  saveCertification,
  grantCertification,
  revokeCertification,
  startShift,
  endShift,
  saveAnnouncement,
  deleteAnnouncement,
  type FormState,
} from "./actions";

const initialState: FormState = {};

export type DepartmentLite = { id: string; shortName: string; name: string };

export type CertificationRow = {
  id: string;
  name: string;
  description: string | null;
  departmentShortName: string;
  validMonths: number | null;
  holders: { id: string; name: string; expiresAt: string | null }[];
};

export type ShiftRow = {
  id: string;
  userName: string;
  departmentShortName: string;
  startedAt: string;
  endedAt: string | null;
};

export type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  departmentShortName: string | null;
  authorName: string;
  isPinned: boolean;
  createdAt: string;
};

// ── Certifications ─────────────────────────────────────────────────────

export function CertificationsSection({
  certifications,
  departments,
  canManage,
}: {
  certifications: CertificationRow[];
  departments: DepartmentLite[];
  canManage: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [createState, createAction, isCreating] = useActionState(saveCertification, initialState);
  const [grantState, grantAction, isGranting] = useActionState(grantCertification, initialState);
  const [revokeState, revokeAction] = useActionState(revokeCertification, initialState);

  useEffect(() => {
    if (createState !== initialState && !createState.error && !createState.fieldErrors) setCreateOpen(false);
    if (createState.error) toast.error(createState.error);
  }, [createState]);

  useEffect(() => {
    if (grantState !== initialState && !grantState.error && !grantState.fieldErrors) setGrantOpen(false);
    if (grantState.error) toast.error(grantState.error);
  }, [grantState]);

  useEffect(() => {
    if (revokeState.error) toast.error(revokeState.error);
  }, [revokeState]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">Formations et certifications</h2>
        {canManage ? (
          <div className="flex gap-2">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="size-4" />
                  Créer une formation
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer une formation</DialogTitle>
                </DialogHeader>
                <form action={createAction} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="cert-name">Nom</Label>
                    <Input id="cert-name" name="name" placeholder="Conduite rapide, taser…" />
                    {createState.fieldErrors?.name?.map((m) => (
                      <p key={m} className="text-sm text-destructive">
                        {m}
                      </p>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Département</Label>
                    <Select name="departmentId" defaultValue={departments[0]?.id}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.shortName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="validMonths">Validité en mois (vide = permanente)</Label>
                    <Input id="validMonths" name="validMonths" type="number" min={1} className="w-32" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="cert-desc">Description</Label>
                    <Textarea id="cert-desc" name="description" rows={2} />
                  </div>
                  <Button type="submit" disabled={isCreating} className="w-fit">
                    {isCreating ? <Loader2 className="size-4 animate-spin" /> : null}
                    Créer
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {certifications.length > 0 ? (
              <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="size-4" />
                    Délivrer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Délivrer une formation</DialogTitle>
                  </DialogHeader>
                  <form action={grantAction} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <Label>Agent</Label>
                      <AsyncPicker
                        name="userId"
                        search={searchStaff}
                        placeholder="Nom, matricule…"
                        emptyLabel="Choisir un agent"
                      />
                      {grantState.fieldErrors?.userId?.map((m) => (
                        <p key={m} className="text-sm text-destructive">
                          {m}
                        </p>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Formation</Label>
                      <Select name="certificationId" defaultValue={certifications[0]?.id}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {certifications.map((certification) => (
                            <SelectItem key={certification.id} value={certification.id}>
                              {certification.name} ({certification.departmentShortName})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      L&apos;échéance est calculée depuis la durée de validité de la formation.
                    </p>
                    <Button type="submit" disabled={isGranting} className="w-fit">
                      {isGranting ? <Loader2 className="size-4 animate-spin" /> : null}
                      Délivrer
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            ) : null}
          </div>
        ) : null}
      </div>

      {certifications.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Aucune formation définie. Créez-en une pour pouvoir la délivrer aux agents.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {certifications.map((certification) => (
            <div key={certification.id} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{certification.name}</span>
                <Badge variant="secondary">{certification.departmentShortName}</Badge>
                {certification.validMonths ? (
                  <span className="text-xs text-muted-foreground">
                    valable {certification.validMonths} mois
                  </span>
                ) : null}
              </div>
              {certification.description ? (
                <p className="text-sm text-muted-foreground">{certification.description}</p>
              ) : null}
              {certification.holders.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun agent formé.</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {certification.holders.map((holder) => {
                    const expired = holder.expiresAt ? new Date(holder.expiresAt) < new Date() : false;
                    return (
                      <li key={holder.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className={expired ? "text-muted-foreground line-through" : ""}>
                          {holder.name}
                          {holder.expiresAt
                            ? ` — ${expired ? "expirée le" : "jusqu'au"} ${format(new Date(holder.expiresAt), "dd/MM/yyyy", { locale: fr })}`
                            : ""}
                        </span>
                        {canManage ? (
                          <form action={revokeAction}>
                            <input type="hidden" name="userCertificationId" value={holder.id} />
                            <button type="submit" className="text-muted-foreground hover:text-foreground">
                              <Trash2 className="size-3.5" />
                            </button>
                          </form>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Service ────────────────────────────────────────────────────────────

export function ShiftsSection({
  shifts,
  openShift,
  departments,
  canViewAll,
}: {
  shifts: ShiftRow[];
  openShift: ShiftRow | null;
  departments: DepartmentLite[];
  canViewAll: boolean;
}) {
  const [startState, startAction, isStarting] = useActionState(startShift, initialState);
  const [endState, endAction, isEnding] = useActionState(endShift, initialState);

  useEffect(() => {
    if (startState.error) toast.error(startState.error);
    if (endState.error) toast.error(endState.error);
  }, [startState, endState]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">Heures de service</h2>

      <div className="rounded-md border border-border bg-card p-3">
        {openShift ? (
          <form action={endAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="shiftId" value={openShift.id} />
            <span className="text-sm">
              En service depuis{" "}
              <span className="font-mono">
                {format(new Date(openShift.startedAt), "HH:mm", { locale: fr })}
              </span>{" "}
              ({openShift.departmentShortName})
            </span>
            <Button type="submit" size="sm" variant="outline" disabled={isEnding}>
              {isEnding ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />}
              Terminer le service
            </Button>
          </form>
        ) : departments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Vous n&apos;êtes affecté à aucun service : impossible de pointer.
          </p>
        ) : (
          <form action={startAction} className="flex flex-wrap items-center gap-3">
            <Select name="departmentId" defaultValue={departments[0]?.id}>
              <SelectTrigger size="sm" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.shortName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" size="sm" disabled={isStarting}>
              {isStarting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Prendre son service
            </Button>
          </form>
        )}
      </div>

      {shifts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune prise de service enregistrée.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted-foreground">
              <tr>
                {canViewAll ? <th className="p-2 font-medium">Agent</th> : null}
                <th className="p-2 font-medium">Service</th>
                <th className="p-2 font-medium">Début</th>
                <th className="p-2 font-medium">Fin</th>
                <th className="p-2 font-medium">Durée</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr key={shift.id} className="border-b border-border last:border-0">
                  {canViewAll ? <td className="p-2">{shift.userName}</td> : null}
                  <td className="p-2 font-mono text-xs">{shift.departmentShortName}</td>
                  <td className="p-2 font-mono text-xs">
                    {format(new Date(shift.startedAt), "dd/MM HH:mm", { locale: fr })}
                  </td>
                  <td className="p-2 font-mono text-xs">
                    {shift.endedAt ? format(new Date(shift.endedAt), "dd/MM HH:mm", { locale: fr }) : "—"}
                  </td>
                  <td className="p-2 font-mono text-xs">
                    {shift.endedAt
                      ? formatDistanceStrict(new Date(shift.endedAt), new Date(shift.startedAt), {
                          locale: fr,
                        })
                      : "en cours"}
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

// ── Annonces ───────────────────────────────────────────────────────────

export function AnnouncementsSection({
  announcements,
  departments,
  canManage,
}: {
  announcements: AnnouncementRow[];
  departments: DepartmentLite[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(saveAnnouncement, initialState);
  const [deleteState, deleteAction] = useActionState(deleteAnnouncement, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) setOpen(false);
    if (state.error) toast.error(state.error);
  }, [state]);

  useEffect(() => {
    if (deleteState.error) toast.error(deleteState.error);
  }, [deleteState]);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Annonces internes</h2>
        {canManage ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="size-4" />
                Publier une annonce
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Publier une annonce</DialogTitle>
              </DialogHeader>
              <form action={formAction} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ann-title">Titre</Label>
                  <Input id="ann-title" name="title" />
                  {state.fieldErrors?.title?.map((m) => (
                    <p key={m} className="text-sm text-destructive">
                      {m}
                    </p>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ann-content">Contenu</Label>
                  <Textarea id="ann-content" name="content" rows={5} />
                  {state.fieldErrors?.content?.map((m) => (
                    <p key={m} className="text-sm text-destructive">
                      {m}
                    </p>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Destinataires</Label>
                  <Select name="departmentId" defaultValue="">
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les services" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.shortName} uniquement
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="isPinned" name="isPinned" />
                  <Label htmlFor="isPinned" className="font-normal">
                    Épingler en haut
                  </Label>
                </div>
                <Button type="submit" disabled={isPending} className="w-fit">
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Publier
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {announcements.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Aucune annonce. Publiez-en une pour informer les équipes.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {announcements.map((announcement) => (
            <article key={announcement.id} className="flex flex-col gap-1 rounded-md border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {announcement.isPinned ? <Pin className="size-3.5 text-department" /> : null}
                  <span className="font-medium">{announcement.title}</span>
                  <Badge variant="secondary">{announcement.departmentShortName ?? "Tous services"}</Badge>
                </div>
                {canManage ? (
                  <form action={deleteAction}>
                    <input type="hidden" name="announcementId" value={announcement.id} />
                    <Button type="submit" size="sm" variant="ghost" title="Supprimer">
                      <Trash2 className="size-4" />
                    </Button>
                  </form>
                ) : null}
              </div>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{announcement.content}</p>
              <span className="text-xs text-muted-foreground">
                {announcement.authorName} ·{" "}
                {format(new Date(announcement.createdAt), "dd/MM/yyyy", { locale: fr })}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
