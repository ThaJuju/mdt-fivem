"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { publishInterservicePost, type InterserviceFormState } from "./actions";

const initialState: InterserviceFormState = {};

export function InterserviceForm() {
  const [state, formAction, isPending] = useActionState(publishInterservicePost, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) {
      toast.success("Information publiée aux deux services.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="interservice-title">Objet</Label>
        <Input id="interservice-title" name="title" placeholder="Ex. Zone temporairement inaccessible" />
        {state.fieldErrors?.title?.map((message) => <p key={message} className="text-xs text-destructive">{message}</p>)}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="interservice-content">Information à partager</Label>
        <Textarea
          id="interservice-content"
          name="content"
          rows={5}
          placeholder="Contexte, localisation, consignes et éléments utiles à l’autre service…"
        />
        {state.fieldErrors?.content?.map((message) => <p key={message} className="text-xs text-destructive">{message}</p>)}
      </div>
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Publier en interservices
      </Button>
    </form>
  );
}
