"use client";

import { useActionState, useEffect, useState } from "react";
import { Clock3, Loader2, LogIn, Radio, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startShift, endShift, type FormState } from "@/app/(app)/rh/actions";

const initialState: FormState = {};

function elapsedLabel(startedAt: string, now: number): string {
  const totalMinutes = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m`;
}

export function DashboardShift({
  department,
  openShift,
}: {
  department: { id: string; shortName: string; gradeName: string; callsign: string | null } | null;
  openShift: { id: string; departmentShortName: string; startedAt: string } | null;
}) {
  const [startState, startAction, isStarting] = useActionState(startShift, initialState);
  const [endState, endAction, isEnding] = useActionState(endShift, initialState);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (startState.error) toast.error(startState.error);
    if (endState.error) toast.error(endState.error);
  }, [startState, endState]);

  return (
    <section className="panel-surface relative overflow-hidden rounded-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-department to-transparent opacity-70" />
      <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
        <div>
          <p className="eyebrow">Statut opérationnel</p>
          <h2 className="mt-1 text-lg font-semibold">Prise de service</h2>
        </div>
        <span className={openShift ? "status-dot" : "size-2 rounded-full bg-muted-foreground/35"} />
      </div>

      <div className="p-5">
        {openShift ? (
          <div className="flex flex-col gap-5">
            <div className="rounded-lg border border-department/25 bg-department/[0.07] p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-md border border-department/25 bg-department/10 text-department">
                  <Radio className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold tracking-[0.12em] text-department uppercase">En service</p>
                  <p className="mt-1 font-mono text-lg font-semibold">{openShift.departmentShortName}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-semibold tabular-nums">{elapsedLabel(openShift.startedAt, now)}</p>
                  <p className="mt-1 text-[0.6875rem] text-muted-foreground">durée actuelle</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-md border border-border/70 bg-background/35 p-3">
                <p className="text-muted-foreground">Début de service</p>
                <p className="mt-1 font-mono font-semibold">
                  {new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(openShift.startedAt))}
                </p>
              </div>
              <div className="rounded-md border border-border/70 bg-background/35 p-3">
                <p className="text-muted-foreground">Indicatif</p>
                <p className="mt-1 truncate font-mono font-semibold">{department?.callsign ?? "Non attribué"}</p>
              </div>
            </div>
            <form action={endAction}>
              <input type="hidden" name="shiftId" value={openShift.id} />
              <Button type="submit" variant="outline" disabled={isEnding} className="h-10 w-full border-destructive/35 hover:bg-destructive/10 hover:text-destructive">
                {isEnding ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-3.5" />}
                Terminer mon service
              </Button>
            </form>
          </div>
        ) : department ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4 rounded-lg border border-border/70 bg-background/35 p-4">
              <span className="flex size-11 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                <Clock3 className="size-5" />
              </span>
              <div>
                <p className="font-medium">Vous êtes hors service</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {department.shortName} · {department.gradeName}
                  {department.callsign ? ` · ${department.callsign}` : ""}
                </p>
              </div>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              La prise de service démarre le suivi de vos heures et signale votre disponibilité opérationnelle.
            </p>
            <form action={startAction}>
              <input type="hidden" name="departmentId" value={department.id} />
              <Button type="submit" disabled={isStarting} className="h-11 w-full">
                {isStarting ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                Prendre mon service
              </Button>
            </form>
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">Aucune affectation active ne permet de prendre un service.</p>
        )}
      </div>
    </section>
  );
}
