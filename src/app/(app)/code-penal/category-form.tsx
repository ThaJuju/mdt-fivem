"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveCategory, type FormState } from "./actions";

export type ExistingCategory = { id: string; name: string; order: number };

const initialState: FormState = {};

export function CategoryForm({
  category,
  onSuccess,
}: {
  category?: ExistingCategory;
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(saveCategory, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nom de la catégorie</Label>
        <Input id="name" name="name" defaultValue={category?.name} autoFocus />
        {state.fieldErrors?.name?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="order">Ordre d&apos;affichage</Label>
        <Input id="order" name="order" type="number" defaultValue={category?.order ?? 0} />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {category ? "Enregistrer" : "Créer la catégorie"}
      </Button>
    </form>
  );
}
