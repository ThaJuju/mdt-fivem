"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PermissionChecklist } from "@/components/permission-checklist";
import { createGrade, updateGrade, type FormState } from "./actions";

export type ExistingGrade = {
  id: string;
  name: string;
  level: number;
  salary: number | null;
  isDefault: boolean;
  permissions: string[];
};

const initialState: FormState = {};

export function GradeForm({
  departmentId,
  grade,
  onSuccess,
}: {
  departmentId: string;
  grade?: ExistingGrade;
  onSuccess?: () => void;
}) {
  const action = grade ? updateGrade : createGrade;
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) {
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="departmentId" value={departmentId} />
      {grade ? <input type="hidden" name="id" value={grade.id} /> : null}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nom du grade</Label>
          <Input id="name" name="name" defaultValue={grade?.name} autoFocus />
          {state.fieldErrors?.name?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="level">Niveau</Label>
          <Input id="level" name="level" type="number" min={1} defaultValue={grade?.level ?? 1} />
          {state.fieldErrors?.level?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="salary">Salaire (optionnel)</Label>
        <Input id="salary" name="salary" type="number" min={0} defaultValue={grade?.salary ?? undefined} />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="isDefault" name="isDefault" defaultChecked={grade?.isDefault} />
        <Label htmlFor="isDefault" className="font-normal">
          Grade par défaut à l&apos;embauche dans ce département
        </Label>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Permissions</Label>
        <PermissionChecklist name="permissions" defaultValue={grade?.permissions} />
        {state.fieldErrors?.permissions?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {grade ? "Enregistrer" : "Créer le grade"}
      </Button>
    </form>
  );
}
