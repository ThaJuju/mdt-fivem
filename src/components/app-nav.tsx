"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { useActor } from "./actor-provider";

export function AppNav() {
  const actor = useActor();
  const pathname = usePathname();

  const items = NAV_ITEMS.filter(
    (item) => !item.permission || actor.isSuperAdmin || actor.permissions.includes(item.permission),
  );

  return (
    <nav className="flex h-11 shrink-0 items-stretch gap-0.5 overflow-x-auto border-b border-border bg-card px-3">
      {items.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center gap-2 px-3 text-[0.8125rem] font-medium whitespace-nowrap transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-department after:opacity-0",
              isActive
                ? "bg-department/10 text-department after:opacity-100"
                : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
