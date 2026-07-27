"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Champ de recherche qui pousse sa valeur dans l'URL (debounce 300ms), lu ensuite côté serveur. */
export function SearchBox({
  paramName = "q",
  placeholder = "Rechercher…",
}: {
  paramName?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(searchParams.get(paramName) ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get(paramName)]);

  function handleChange(next: string) {
    setValue(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set(paramName, next);
      else params.delete(paramName);
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
  }

  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        className="pl-8"
        aria-label={placeholder}
      />
    </div>
  );
}
