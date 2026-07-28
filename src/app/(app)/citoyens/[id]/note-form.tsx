"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { addCitizenNote, type FormState } from "../actions";

const initialState: FormState = {};

export function NoteForm({ citizenId }: { citizenId: string }) {
  const [state, formAction, isPending] = useActionState(addCitizenNote, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="citizenId" value={citizenId} />
      <Textarea name="content" placeholder="Ajouter une note…" rows={3} />
      {state.fieldErrors?.content?.map((m) => (
        <p key={m} className="text-sm text-destructive">
          {m}
        </p>
      ))}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox id="isFlagged" name="isFlagged" />
          <Label htmlFor="isFlagged" className="font-normal text-sm">
            Signaler (affichée en bandeau d&apos;alerte)
          </Label>
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Ajouter la note
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
