"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "En cours" },
  { value: "closed", label: "Clôturés" },
  { value: "all", label: "Tous" },
];

export function BoloFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("scope") ?? "active";

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "active") params.delete("scope");
    else params.set("scope", value);
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
