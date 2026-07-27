"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActor } from "./actor-provider";
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

/**
 * Barre de statut persistante, façon console radio. Pour l'instant elle
 * n'affiche que l'identité et l'affectation ; la phase 5 y branchera le
 * 10-code courant et l'appel assigné (couleur pilotée par le statut d'unité).
 */
export function TopBar() {
  const actor = useActor();
  const now = useClock();
  const primary = actor.memberships.find((m) => m.isPrimary) ?? actor.memberships[0];

  const timeLabel = now
    ? new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now)
    : "--:--:--";

  return (
    <header
      className="flex h-12 shrink-0 items-center justify-between border-b-2 px-4"
      style={{ borderBottomColor: "var(--department-accent)", backgroundColor: "var(--card)" }}
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
      </div>

      <div className="flex items-center gap-1 sm:gap-3">
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
