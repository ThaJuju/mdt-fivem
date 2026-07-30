"use client";

import { useState, useTransition, useRef } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { searchCitizens, type CitizenSearchResult } from "@/app/(app)/citoyens/search";

export function CitizenPicker({
  name,
  defaultValue,
  placeholder = "Aucun propriétaire",
  searchPlaceholder = "Rechercher un citoyen…",
}: {
  name: string;
  defaultValue?: { id: string; label: string };
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(defaultValue ?? null);
  const [results, setResults] = useState<CitizenSearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(query: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        const found = await searchCitizens(query);
        setResults(found);
      });
    }, 250);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && results.length === 0) handleSearch("");
  }

  return (
    <div className="flex items-center gap-2">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selected ? selected.label : placeholder}
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <Command shouldFilter={false}>
            <CommandInput placeholder={searchPlaceholder} onValueChange={handleSearch} />
            <CommandList>
              <CommandEmpty>{isPending ? "Recherche…" : "Aucun citoyen trouvé."}</CommandEmpty>
              <CommandGroup>
                {results.map((citizen) => (
                  <CommandItem
                    key={citizen.id}
                    value={citizen.id}
                    onSelect={() => {
                      setSelected({ id: citizen.id, label: citizen.label });
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("size-4", selected?.id === citizen.id ? "opacity-100" : "opacity-0")}
                    />
                    {citizen.label}
                    <span className="ml-auto font-mono text-xs text-muted-foreground">{citizen.dob}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected ? (
        <Button type="button" variant="ghost" size="icon" onClick={() => setSelected(null)} title="Retirer">
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
