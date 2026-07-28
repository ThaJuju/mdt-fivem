"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatJailTime, formatMoney } from "@/lib/labels";
import { ChargeForm, type OffenseOption, type InvolvedCitizen } from "./charge-form";
import { updateCharge, removeCharge, type FormState } from "../actions";

export type ChargeRow = {
  id: string;
  citizenId: string;
  citizenName: string;
  offenseCode: string;
  offenseName: string;
  count: number;
  fine: number;
  jailMinutes: number;
  points: number;
  isGuilty: boolean;
  isPaid: boolean;
  notes: string | null;
};

const initialState: FormState = {};

function EditChargeDialog({ reportId, charge }: { reportId: string; charge: ChargeRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(updateCharge, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) setOpen(false);
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Ajuster la charge">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajuster la charge</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={charge.id} />
          <input type="hidden" name="reportId" value={reportId} />
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{charge.offenseCode}</span> — {charge.offenseName}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`count-${charge.id}`}>Occurrences</Label>
              <Input id={`count-${charge.id}`} name="count" type="number" min={1} defaultValue={charge.count} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`fine-${charge.id}`}>Amende ($)</Label>
              <Input id={`fine-${charge.id}`} name="fine" type="number" min={0} defaultValue={charge.fine} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`jail-${charge.id}`}>Prison (min)</Label>
              <Input
                id={`jail-${charge.id}`}
                name="jailMinutes"
                type="number"
                min={0}
                defaultValue={charge.jailMinutes}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`points-${charge.id}`}>Points</Label>
              <Input id={`points-${charge.id}`} name="points" type="number" min={0} defaultValue={charge.points} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id={`guilty-${charge.id}`} name="isGuilty" defaultChecked={charge.isGuilty} />
            <Label htmlFor={`guilty-${charge.id}`} className="font-normal">
              Retenue contre la personne
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id={`paid-${charge.id}`} name="isPaid" defaultChecked={charge.isPaid} />
            <Label htmlFor={`paid-${charge.id}`} className="font-normal">
              Amende réglée
            </Label>
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

function RemoveChargeButton({ reportId, chargeId }: { reportId: string; chargeId: string }) {
  const [state, formAction, isPending] = useActionState(removeCharge, initialState);
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="chargeId" value={chargeId} />
      <Button type="submit" size="sm" variant="ghost" disabled={isPending} title="Retirer la charge">
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}

function AddChargeDialog({
  reportId,
  offenses,
  citizens,
}: {
  reportId: string;
  offenses: OffenseOption[];
  citizens: InvolvedCitizen[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" />
          Ajouter une charge
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une charge</DialogTitle>
        </DialogHeader>
        <ChargeForm
          reportId={reportId}
          offenses={offenses}
          citizens={citizens}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function ChargesSection({
  reportId,
  charges,
  offenses,
  citizens,
  canManage,
}: {
  reportId: string;
  charges: ChargeRow[];
  offenses: OffenseOption[];
  citizens: InvolvedCitizen[];
  canManage: boolean;
}) {
  // Seules les charges retenues comptent dans le total.
  const retained = charges.filter((charge) => charge.isGuilty);
  const totals = retained.reduce(
    (acc, charge) => ({
      fine: acc.fine + charge.fine * charge.count,
      jailMinutes: acc.jailMinutes + charge.jailMinutes * charge.count,
      points: acc.points + charge.points * charge.count,
    }),
    { fine: 0, jailMinutes: 0, points: 0 },
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">Charges</h2>
        {canManage ? <AddChargeDialog reportId={reportId} offenses={offenses} citizens={citizens} /> : null}
      </div>

      {charges.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune charge retenue. Ajoutez-en une pour calculer la peine encourue.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted-foreground">
                <tr>
                  <th className="p-2 font-medium">Personne</th>
                  <th className="p-2 font-medium">Infraction</th>
                  <th className="p-2 text-right font-medium">×</th>
                  <th className="p-2 text-right font-medium">Amende</th>
                  <th className="p-2 text-right font-medium">Prison</th>
                  <th className="p-2 text-right font-medium">Points</th>
                  {canManage ? <th className="w-20 p-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {charges.map((charge) => (
                  <tr
                    key={charge.id}
                    className={`border-b border-border last:border-0 ${charge.isGuilty ? "" : "text-muted-foreground"}`}
                  >
                    <td className="p-2">{charge.citizenName}</td>
                    <td className="p-2">
                      <span className="font-mono">{charge.offenseCode}</span> — {charge.offenseName}
                      {!charge.isGuilty ? <span className="ml-2 text-xs">(non retenue)</span> : null}
                      {charge.isPaid ? <span className="ml-2 text-xs">(réglée)</span> : null}
                    </td>
                    <td className="p-2 text-right font-mono">{charge.count}</td>
                    <td className="p-2 text-right font-mono">{formatMoney(charge.fine * charge.count)}</td>
                    <td className="p-2 text-right font-mono">{formatJailTime(charge.jailMinutes * charge.count)}</td>
                    <td className="p-2 text-right font-mono">{charge.points * charge.count || "—"}</td>
                    {canManage ? (
                      <td className="p-2">
                        <div className="flex justify-end gap-1">
                          <EditChargeDialog reportId={reportId} charge={charge} />
                          <RemoveChargeButton reportId={reportId} chargeId={charge.id} />
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border font-medium">
                <tr>
                  <td className="p-2" colSpan={3}>
                    Total encouru
                  </td>
                  <td className="p-2 text-right font-mono">{formatMoney(totals.fine)}</td>
                  <td className="p-2 text-right font-mono">{formatJailTime(totals.jailMinutes)}</td>
                  <td className="p-2 text-right font-mono">{totals.points || "—"}</td>
                  {canManage ? <td /> : null}
                </tr>
              </tfoot>
            </table>
          </div>
          {retained.length !== charges.length ? (
            <p className="text-xs text-muted-foreground">
              Le total ne compte que les {retained.length} charge{retained.length > 1 ? "s" : ""} retenue
              {retained.length > 1 ? "s" : ""}.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
