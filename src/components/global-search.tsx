"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { globalSearch, type GlobalSearchGroup } from "@/app/(app)/recherche-globale";

/**
 * Recherche globale : une seule barre, résultats groupés par type.
 * La navigation clavier (flèches, entrée, échap) est fournie par cmdk.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<GlobalSearchGroup[]>([]);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleSearch(next: string) {
    setQuery(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        setGroups(await globalSearch(next));
      });
    }, 250);
  }

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setGroups([]);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-md border border-border/80 bg-background/55 px-3 text-xs text-muted-foreground shadow-[0_1px_0_rgb(255_255_255/0.03)_inset] transition-all hover:border-department/35 hover:bg-accent hover:text-foreground sm:min-w-40"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Rechercher…</span>
        <kbd className="hidden border-l border-border pl-2 font-mono text-[0.625rem] tracking-wide md:inline">Ctrl K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Nom, plaque, numéro de série…"
          value={query}
          onValueChange={handleSearch}
        />
        <CommandList>
          <CommandEmpty>
            {query.trim().length < 2
              ? "Saisissez au moins deux caractères."
              : isPending
                ? "Recherche…"
                : "Aucun résultat."}
          </CommandEmpty>
          {groups.map((group, index) => (
            <div key={group.type}>
              {index > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading={group.label}>
                {group.results.map((result) => (
                  <CommandItem key={result.id} value={`${group.type}-${result.id}`} onSelect={() => go(result.href)}>
                    {result.isAlert ? <AlertTriangle className="size-4 text-department" /> : null}
                    <span className={group.type === "citizens" ? "" : "font-mono"}>{result.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{result.subtitle}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
