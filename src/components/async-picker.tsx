"use client";

import { useState, useTransition, useRef } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

export type PickerOption = { id: string; label: string; hint: string };

/**
 * Sélecteur générique alimenté par une server action de recherche.
 * `CitizenPicker` fait la même chose pour les citoyens ; celui-ci sert aux
 * véhicules et aux agents.
 */
export function AsyncPicker({
  name,
  search,
  placeholder,
  emptyLabel,
  monospace = false,
}: {
  name: string;
  search: (query: string) => Promise<PickerOption[]>;
  placeholder: string;
  emptyLabel: string;
  monospace?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PickerOption | null>(null);
  const [results, setResults] = useState<PickerOption[]>([]);
  const [isPending, startTransition] = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(query: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      startTransition(async () => setResults(await search(query)));
    }, 250);
  }

  return (
    <>
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className={selected && monospace ? "font-mono" : ""}>
              {selected ? selected.label : emptyLabel}
            </span>
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0">
          <Command shouldFilter={false}>
            <CommandInput placeholder={placeholder} onValueChange={handleSearch} />
            <CommandList>
              <CommandEmpty>{isPending ? "Recherche…" : "Aucun résultat."}</CommandEmpty>
              <CommandGroup>
                {results.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => {
                      setSelected(option);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("size-4", selected?.id === option.id ? "opacity-100" : "opacity-0")} />
                    <span className={monospace ? "font-mono" : ""}>{option.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{option.hint}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
