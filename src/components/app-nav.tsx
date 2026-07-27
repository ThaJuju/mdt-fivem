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
    <nav className="flex h-11 items-center gap-1 border-b border-border bg-card px-3 overflow-x-auto">
      {items.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
              isActive
                ? "bg-department/15 text-department"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
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
