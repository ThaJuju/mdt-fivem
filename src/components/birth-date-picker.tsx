"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseDate(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function BirthDatePicker({
  id,
  name = "dob",
  defaultValue,
  className,
}: {
  id: string;
  name?: string;
  defaultValue?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(() => parseDate(defaultValue));
  const today = new Date();

  return (
    <>
      <input type="hidden" name={name} value={date ? format(date, "yyyy-MM-dd") : ""} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label="Choisir la date de naissance"
            className={cn(
              "h-9 w-full justify-start gap-2 bg-input/30 px-3 text-left font-normal",
              !date && "text-muted-foreground",
              className,
            )}
          >
            <CalendarDays className="size-4 text-department" />
            <span className="flex-1">
              {date ? format(date, "dd MMMM yyyy", { locale: fr }) : "Choisir une date"}
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-2">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date ?? new Date(1990, 0, 1)}
            onSelect={(selected) => {
              if (!selected) return;
              setDate(selected);
              setOpen(false);
            }}
            captionLayout="dropdown"
            startMonth={new Date(1900, 0, 1)}
            endMonth={today}
            disabled={{ after: today }}
            locale={fr}
          />
          <p className="border-t border-border/70 px-2 pt-2 text-center text-[0.6875rem] text-muted-foreground">
            Sélectionnez d’abord l’année et le mois, puis le jour.
          </p>
        </PopoverContent>
      </Popover>
    </>
  );
}
