"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCitizenNote, type FormState } from "../actions";

const initialState: FormState = {};

export function DeleteNoteButton({ citizenId, noteId }: { citizenId: string; noteId: string }) {
  const [, formAction, isPending] = useActionState(deleteCitizenNote, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="citizenId" value={citizenId} />
      <input type="hidden" name="noteId" value={noteId} />
      <Button type="submit" variant="ghost" size="icon" disabled={isPending} title="Supprimer la note">
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}
