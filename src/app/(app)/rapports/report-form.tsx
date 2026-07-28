"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiImageField } from "@/components/multi-image-field";
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

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {report ? <input type="hidden" name="id" value={report.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Type de rapport</Label>
          <Select name="type" defaultValue={report?.type ?? "INCIDENT"} disabled={readOnly}>
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
            defaultValue={report?.departmentId ?? departments[0]?.id}
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
        <Input id="title" name="title" defaultValue={report?.title} readOnly={readOnly} />
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
            defaultValue={report?.occurredAt}
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
          <Input id="location" name="location" defaultValue={report?.location ?? undefined} readOnly={readOnly} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="content">Récit</Label>
        <Textarea
          id="content"
          name="content"
          defaultValue={report?.content}
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
          <MultiImageField name="evidenceUrls" />
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
