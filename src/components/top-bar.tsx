"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActor } from "./actor-provider";
import { GlobalSearch } from "./global-search";
import { logout } from "@/app/actions";

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
      className="flex h-12 shrink-0 items-center justify-between border-b-2 px-4"
      style={{
        borderBottomColor: statusBorderColor(unit?.status),
        backgroundColor: isPanic ? "color-mix(in srgb, var(--alert) 12%, var(--card))" : "var(--card)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono text-sm font-semibold tracking-wide text-department">
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
          <span className="flex items-center gap-2 border-l border-border pl-3 font-mono text-xs">
            <span className="font-semibold">{unit.callsign}</span>
            <span className={isPanic ? "font-semibold text-alert" : "text-muted-foreground"}>
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

      <div className="flex items-center gap-1 sm:gap-3">
        <GlobalSearch />
        <span className="hidden font-mono text-xs text-muted-foreground tabular-nums md:inline">
          {timeLabel}
        </span>
        <span className="hidden text-sm sm:inline">
          {actor.firstName} {actor.lastName}
        </span>
        <Button asChild variant="ghost" size="icon" title="Changer le mot de passe">
          <Link href="/changer-mot-de-passe">
            <KeyRound className="size-4" />
          </Link>
        </Button>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="icon" title="Se déconnecter">
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
