"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tous" },
  { value: "PENDING", label: "En attente" },
  { value: "ACTIVE", label: "Actifs" },
  { value: "EXECUTED", label: "Exécutés" },
  { value: "EXPIRED", label: "Expirés" },
  { value: "DENIED", label: "Refusés" },
];

export function WarrantFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "";

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("status", value);
    else params.delete("status");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => select(option.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            current === option.value
              ? "bg-department/15 text-department"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
