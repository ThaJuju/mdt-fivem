"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRIAGE_LABELS, EMS_OUTCOME_LABELS, triageClass } from "@/lib/medical-labels";
import { saveEmsDetail, type FormState } from "@/app/(app)/medical/actions";

const initialState: FormState = {};

export type EmsDetailRow = {
  triage: string;
  chiefComplaint: string | null;
  injuries: string | null;
  treatment: string | null;
  medications: string | null;
  outcome: string;
  hospital: string | null;
  arrivedAt: string | null;
  clearedAt: string | null;
};

/**
 * Volet médical d'un rapport. Rapports EMS et police partagent la table
 * `Report` ; ce bloc n'apparaît que sur les interventions médicales.
 */
export function EmsSection({
  reportId,
  detail,
  canEdit,
}: {
  reportId: string;
  detail: EmsDetailRow | null;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(saveEmsDetail, initialState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  if (!canEdit) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Volet médical</h2>
        {detail ? (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-4 text-sm">
            <span className={`w-fit rounded px-1.5 py-0.5 text-xs ${triageClass(detail.triage)}`}>
              {TRIAGE_LABELS[detail.triage] ?? detail.triage}
            </span>
            {detail.chiefComplaint ? <p>Motif : {detail.chiefComplaint}</p> : null}
            {detail.injuries ? <p>Lésions : {detail.injuries}</p> : null}
            {detail.treatment ? <p>Soins : {detail.treatment}</p> : null}
            <p className="text-muted-foreground">
              Issue : {EMS_OUTCOME_LABELS[detail.outcome] ?? detail.outcome}
              {detail.hospital ? ` · ${detail.hospital}` : ""}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun volet médical renseigné.</p>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">Volet médical</h2>
      <form action={formAction} className="flex flex-col gap-4 rounded-md border border-border bg-card p-4">
        <input type="hidden" name="reportId" value={reportId} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label>Triage</Label>
            <Select name="triage" defaultValue={detail?.triage ?? "GREEN"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRIAGE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Issue</Label>
            <Select name="outcome" defaultValue={detail?.outcome ?? "TREATED_ON_SCENE"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EMS_OUTCOME_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="chiefComplaint">Motif d&apos;appel</Label>
          <Input id="chiefComplaint" name="chiefComplaint" defaultValue={detail?.chiefComplaint ?? ""} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="injuries">Lésions constatées</Label>
            <Textarea id="injuries" name="injuries" rows={3} defaultValue={detail?.injuries ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="treatment">Soins prodigués</Label>
            <Textarea id="treatment" name="treatment" rows={3} defaultValue={detail?.treatment ?? ""} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ems-medications">Médicaments administrés</Label>
          <Textarea id="ems-medications" name="medications" rows={2} defaultValue={detail?.medications ?? ""} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="hospital">Hôpital</Label>
            <Input id="hospital" name="hospital" defaultValue={detail?.hospital ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="arrivedAt">Arrivée sur place</Label>
            <Input
              id="arrivedAt"
              name="arrivedAt"
              type="datetime-local"
              defaultValue={detail?.arrivedAt ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="clearedAt">Fin d&apos;intervention</Label>
            <Input
              id="clearedAt"
              name="clearedAt"
              type="datetime-local"
              defaultValue={detail?.clearedAt ?? ""}
            />
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Enregistrer le volet médical
        </Button>
      </form>
    </section>
  );
}
