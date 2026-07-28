"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OFFENSE_TYPE_LABELS } from "@/lib/labels";
import { saveOffense, type FormState } from "./actions";

export type ExistingOffense = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  categoryId: string;
  type: string;
  fine: number;
  jailMinutes: number;
  points: number;
  bail: number | null;
  isActive: boolean;
};

const initialState: FormState = {};

export function OffenseForm({
  categories,
  offense,
  defaultCategoryId,
  onSuccess,
}: {
  categories: { id: string; name: string }[];
  offense?: ExistingOffense;
  defaultCategoryId?: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(saveOffense, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {offense ? <input type="hidden" name="id" value={offense.id} /> : null}

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            name="code"
            defaultValue={offense?.code}
            placeholder="P.C. 187"
            className="font-mono"
            autoFocus
          />
          {state.fieldErrors?.code?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="col-span-2 flex flex-col gap-2">
          <Label htmlFor="name">Intitulé</Label>
          <Input id="name" name="name" defaultValue={offense?.name} />
          {state.fieldErrors?.name?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Catégorie</Label>
          <Select name="categoryId" defaultValue={offense?.categoryId ?? defaultCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.fieldErrors?.categoryId?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label>Qualification</Label>
          <Select name="type" defaultValue={offense?.type ?? "MISDEMEANOR"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OFFENSE_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="fine">Amende ($)</Label>
          <Input id="fine" name="fine" type="number" min={0} defaultValue={offense?.fine ?? 0} />
          {state.fieldErrors?.fine?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="jailMinutes">Prison (min)</Label>
          <Input
            id="jailMinutes"
            name="jailMinutes"
            type="number"
            min={0}
            defaultValue={offense?.jailMinutes ?? 0}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="points">Points</Label>
          <Input id="points" name="points" type="number" min={0} defaultValue={offense?.points ?? 0} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bail">Caution ($)</Label>
          <Input id="bail" name="bail" type="number" min={0} defaultValue={offense?.bail ?? undefined} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={offense?.description ?? undefined} rows={2} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Checkbox id="isActive" name="isActive" defaultChecked={offense?.isActive ?? true} />
          <Label htmlFor="isActive" className="font-normal">
            Infraction active
          </Label>
        </div>
        <p className="pl-6 text-xs text-muted-foreground">
          Modifier ce barème n&apos;affecte que les futurs rapports : les charges déjà enregistrées
          conservent le leur.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {offense ? "Enregistrer" : "Créer l'infraction"}
      </Button>
    </form>
  );
}
