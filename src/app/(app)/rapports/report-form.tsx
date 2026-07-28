"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiImageField } from "@/components/multi-image-field";
import { readDraft, writeDraft, clearDraft } from "@/lib/draft-storage";
import { REPORT_TYPE_LABELS } from "@/lib/labels";
import { createReport, updateReport, type FormState } from "./actions";

export type ExistingReport = {
  id: string;
  type: string;
  title: string;
  content: string;
  location: string | null;
  occurredAt: string;
  departmentId: string;
};

const initialState: FormState = {};

const DRAFT_KEY = "rapport-nouveau";

type DraftValues = {
  type: string;
  title: string;
  content: string;
  location: string;
  occurredAt: string;
  departmentId: string;
  photos: string[];
};

export function ReportForm({
  departments,
  report,
  readOnly = false,
  allowPhotos = false,
}: {
  departments: { id: string; shortName: string; name: string }[];
  report?: ExistingReport;
  readOnly?: boolean;
  /**
   * Uniquement à la rédaction : une fois le rapport créé, les photos passent
   * par la section « Pièces jointes », qui permet de les nommer et décrire.
   */
  allowPhotos?: boolean;
}) {
  const action = report ? updateReport : createReport;
  const [state, formAction, isPending] = useActionState(action, initialState);

  // Le brouillon ne concerne que la rédaction : modifier un rapport existant
  // travaille déjà sur des données enregistrées.
  const isDrafting = !report;
  const [values, setValues] = useState<DraftValues>({
    type: report?.type ?? "INCIDENT",
    title: report?.title ?? "",
    content: report?.content ?? "",
    location: report?.location ?? "",
    occurredAt: report?.occurredAt ?? "",
    departmentId: report?.departmentId ?? departments[0]?.id ?? "",
    photos: [],
  });
  const [restored, setRestored] = useState(!isDrafting);

  // Restauration au montage, avant toute saisie.
  useEffect(() => {
    if (!isDrafting) return;
    const draft = readDraft<DraftValues>(DRAFT_KEY);
    if (draft) setValues((current) => ({ ...current, ...draft }));
    setRestored(true);
  }, [isDrafting]);

  // Sauvegarde à chaque changement, une fois la restauration faite (sinon on
  // écraserait le brouillon avec les valeurs par défaut au premier rendu).
  useEffect(() => {
    if (!isDrafting || !restored) return;
    writeDraft(DRAFT_KEY, values);
  }, [isDrafting, restored, values]);

  // Une erreur de validation renvoie le formulaire : le brouillon effacé à la
  // soumission doit être réécrit, sinon la saisie serait perdue en quittant.
  useEffect(() => {
    if (!isDrafting) return;
    if (state.error || state.fieldErrors) writeDraft(DRAFT_KEY, values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function set<K extends keyof DraftValues>(key: K, value: DraftValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      action={formAction}
      onSubmit={() => {
        if (isDrafting) clearDraft(DRAFT_KEY);
      }}
      className="flex flex-col gap-4"
    >
      {report ? <input type="hidden" name="id" value={report.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Type de rapport</Label>
          <Select name="type" value={values.type} onValueChange={(v) => set("type", v)} disabled={readOnly}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Service</Label>
          <Select
            name="departmentId"
            value={values.departmentId}
            onValueChange={(v) => set("departmentId", v)}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir un service" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.shortName} — {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.fieldErrors?.departmentId?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Titre</Label>
        <Input id="title" name="title" value={values.title} onChange={(e) => set("title", e.target.value)} readOnly={readOnly} />
        {state.fieldErrors?.title?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="occurredAt">Date et heure des faits</Label>
          <Input
            id="occurredAt"
            name="occurredAt"
            type="datetime-local"
            value={values.occurredAt}
            onChange={(e) => set("occurredAt", e.target.value)}
            readOnly={readOnly}
          />
          {state.fieldErrors?.occurredAt?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="location">Lieu</Label>
          <Input id="location" name="location" value={values.location} onChange={(e) => set("location", e.target.value)} readOnly={readOnly} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="content">Récit</Label>
        <Textarea
          id="content"
          name="content"
          value={values.content}
          onChange={(e) => set("content", e.target.value)}
          rows={12}
          readOnly={readOnly}
          placeholder="Décrivez les faits, dans l'ordre chronologique."
        />
        {state.fieldErrors?.content?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
      </div>

      {allowPhotos && !readOnly ? (
        <div className="flex flex-col gap-2">
          <Label>Photos (optionnel)</Label>
          <MultiImageField name="evidenceUrls" value={values.photos} onChange={(p) => set("photos", p)} />
          <p className="text-xs text-muted-foreground">
            Elles seront jointes au rapport. Vous pourrez les nommer et en ajouter d&apos;autres une fois
            le rapport créé.
          </p>
        </div>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {!readOnly ? (
        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {report ? "Enregistrer le rapport" : "Créer le rapport"}
        </Button>
      ) : null}
    </form>
  );
}
