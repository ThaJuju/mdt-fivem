"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions";
import { clearAllDrafts } from "@/lib/draft-storage";
import { useActor } from "./actor-provider";
import { GlobalSearch } from "./global-search";
import { PanicButton } from "./panic-button";
import { UserAvatar } from "./user-avatar";

export type UnitStatusInfo = {
  id: string;
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

function useClock(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function AppNav({ unit }: { unit: UnitStatusInfo | null }) {
  const actor = useActor();
  const pathname = usePathname();
  const now = useClock();
  const primary = actor.memberships.find((membership) => membership.isPrimary) ?? actor.memberships[0];
  const isPanic = unit?.status === "PANIC";

  const primaryType = primary?.departmentType;
  const items = NAV_ITEMS.filter((item) => {
    if (actor.isSuperAdmin) return true;
    if (item.scope === "ADMIN") return false;
    if (item.scope !== "SHARED" && item.scope !== primaryType) return false;
    return !item.permission || actor.permissions.includes(item.permission);
  });

  const timeLabel = now
    ? new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(now)
    : "--:--";

  return (
    <nav
      className={cn(
        "relative z-30 flex h-16 shrink-0 items-center gap-2 border-b bg-card/90 px-3 shadow-[0_12px_40px_rgb(0_0_0/0.24)] backdrop-blur-xl sm:px-5",
        isPanic ? "border-alert bg-alert/10" : "border-department/45",
      )}
    >
      <div className="flex shrink-0 items-center gap-2 border-r border-border/70 pr-2 sm:pr-3">
        <span className="flex h-9 items-center gap-2 rounded-md border border-department/35 bg-department/10 px-2.5 font-mono text-xs font-semibold tracking-[0.12em] text-department">
          <Radio className="size-3.5" />
          {primary?.departmentShortName ?? "MDT"}
        </span>
        {unit ? (
          <span
            className={cn(
              "hidden h-9 items-center gap-2 rounded-md border px-2.5 font-mono text-xs md:flex",
              isPanic
                ? "border-alert/60 bg-alert/15 text-alert"
                : "border-border/70 bg-background/40 text-muted-foreground",
            )}
            title={`${UNIT_STATUS_LABELS[unit.status] ?? unit.status}${unit.callNumber ? ` · appel #${unit.callNumber}` : ""}`}
          >
            <span className={cn("status-dot", isPanic && "!bg-alert")} aria-hidden />
            <strong className="font-semibold text-foreground">{unit.callsign}</strong>
            <span>{UNIT_STATUS_LABELS[unit.status] ?? unit.status}</span>
          </span>
        ) : null}
        {/* Le 10-99 se déclenche depuis toutes les pages, pas seulement le
            tableau de dispatch : c'est le seul bouton qui doit toujours être
            à portée de clic. */}
        {unit ? <PanicButton unitId={unit.id} isPanicking={isPanic} /> : null}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {items.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-[0.8125rem] font-medium whitespace-nowrap transition-all duration-200",
                isActive
                  ? "border-department/25 bg-department/12 text-department shadow-[0_0_20px_color-mix(in_srgb,var(--department-accent)_9%,transparent),0_1px_0_rgb(255_255_255/0.04)_inset]"
                  : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-accent/65 hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4", isActive && "drop-shadow-[0_0_7px_var(--department-accent)]")} />
              <span className="hidden xl:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-1 border-l border-border/70 pl-2 sm:gap-1.5 sm:pl-3">
        <GlobalSearch />
        <span className="hidden font-mono text-xs tracking-[0.08em] text-muted-foreground tabular-nums 2xl:inline">
          {timeLabel}
        </span>
        <Button asChild variant="ghost" className="h-10 gap-2 px-2" title="Mon compte">
          <Link href="/mon-compte">
            <UserAvatar
              firstName={actor.firstName}
              lastName={actor.lastName}
              avatarUrl={actor.avatarUrl}
              size="sm"
            />
            <span className="hidden max-w-32 truncate text-xs font-medium text-foreground 2xl:inline">
              {actor.firstName} {actor.lastName}
            </span>
          </Link>
        </Button>
        <form action={logout} onSubmit={() => clearAllDrafts()}>
          <Button type="submit" variant="ghost" size="icon" title="Se déconnecter">
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </nav>
  );
}
