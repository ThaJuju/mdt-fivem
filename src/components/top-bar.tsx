"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, KeyRound, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActor } from "./actor-provider";
import { GlobalSearch } from "./global-search";
import { logout } from "@/app/actions";
import { clearAllDrafts } from "@/lib/draft-storage";

function useClock(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export type UnitStatusInfo = {
  callsign: string;
  status: string;
  callNumber: number | null;
  callCode: string | null;
};

const UNIT_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Disponible",
  BUSY: "Occupé",
  EN_ROUTE: "En route",
  ON_SCENE: "Sur place",
  PANIC: "10-99",
  OFF_DUTY: "Hors service",
};

/**
 * La barre change de couleur avec le statut de l'unité : c'est le seul
 * repère visible depuis tous les modules. Le rouge d'alerte est réservé au
 * 10-99 — un agent en danger doit se distinguer au premier coup d'œil.
 */
function statusBorderColor(status: string | undefined): string {
  if (status === "PANIC") return "var(--alert)";
  if (status === "OFF_DUTY") return "var(--border)";
  return "var(--department-accent)";
}

/** Barre de statut persistante, façon console radio. */
export function TopBar({ unit }: { unit: UnitStatusInfo | null }) {
  const actor = useActor();
  const now = useClock();
  const primary = actor.memberships.find((m) => m.isPrimary) ?? actor.memberships[0];

  const timeLabel = now
    ? new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now)
    : "--:--:--";

  const isPanic = unit?.status === "PANIC";

  return (
    <header
      className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b px-3 shadow-[0_12px_40px_rgb(0_0_0/0.32)] backdrop-blur-xl sm:px-5"
      style={{
        borderBottomColor: statusBorderColor(unit?.status),
        backgroundColor: isPanic ? "color-mix(in srgb, var(--alert) 12%, var(--card))" : "color-mix(in srgb, var(--card) 92%, transparent)",
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 items-center gap-2 rounded-md border border-department/35 bg-department/10 px-3 font-mono text-xs font-semibold tracking-[0.14em] text-department shadow-[0_0_24px_color-mix(in_srgb,var(--department-accent)_10%,transparent)]">
          <Radio className="size-3.5" />
          {primary ? primary.departmentShortName : "MDT"}
        </span>
        {primary ? (
          <span className="hidden items-center gap-2 truncate font-mono text-xs text-muted-foreground sm:flex">
            <span>{primary.gradeName}</span>
            <span aria-hidden>·</span>
            <span>#{primary.badgeNumber}</span>
            {primary.callsign ? (
              <>
                <span aria-hidden>·</span>
                <span>{primary.callsign}</span>
              </>
            ) : null}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Aucune affectation</span>
        )}

        {unit ? (
          <span className="flex h-8 items-center gap-2 rounded-md border border-border/70 bg-background/45 px-2.5 font-mono text-xs">
            <span className="status-dot" aria-hidden />
            <span className="font-semibold tracking-wide text-foreground">{unit.callsign}</span>
            <span
              className={
                isPanic
                  ? "border border-alert/70 bg-alert/15 px-1.5 py-0.5 font-semibold text-alert"
                  : "text-muted-foreground"
              }
            >
              {UNIT_STATUS_LABELS[unit.status] ?? unit.status}
            </span>
            {unit.callNumber ? (
              <span className="hidden text-muted-foreground sm:inline">
                · appel #{unit.callNumber}
                {unit.callCode ? ` (${unit.callCode})` : ""}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        <GlobalSearch />
        <span className="hidden rounded-md border border-border/60 bg-background/45 px-2.5 py-1.5 font-mono text-xs font-medium tracking-[0.08em] text-muted-foreground tabular-nums md:inline">
          {timeLabel}
        </span>
        <span className="hidden text-xs font-medium text-foreground sm:inline">
          {actor.firstName} {actor.lastName}
        </span>
        <Button asChild variant="ghost" size="icon" title="Changer le mot de passe">
          <Link href="/changer-mot-de-passe">
            <KeyRound className="size-4" />
          </Link>
        </Button>
        {/* Les brouillons restent dans le navigateur : on les efface en partant,
            pour ne rien laisser au collègue suivant sur un poste partagé. */}
        <form action={logout} onSubmit={() => clearAllDrafts()}>
          <Button type="submit" variant="ghost" size="icon" title="Se déconnecter">
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
