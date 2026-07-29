"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addMembership, updateMembership, type FormState } from "../actions";

export type DepartmentOption = {
  id: string;
  name: string;
  shortName: string;
  grades: { id: string; name: string; level: number }[];
};

export type ExistingMembership = {
  id: string;
  departmentId: string;
  gradeId: string;
  badgeNumber: string;
  callsign: string | null;
  isPrimary: boolean;
  status: string;
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ACTIVE", label: "Actif" },
  { value: "LOA", label: "Congé (LOA)" },
  { value: "SUSPENDED", label: "Suspendu" },
  { value: "TERMINATED", label: "Licencié" },
];

const initialState: FormState = {};

export function MembershipForm({
  userId,
  departments,
  membership,
  onSuccess,
}: {
  userId: string;
  departments: DepartmentOption[];
  membership?: ExistingMembership;
  onSuccess?: () => void;
}) {
  const action = membership ? updateMembership : addMembership;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [departmentId, setDepartmentId] = useState(membership?.departmentId ?? departments[0]?.id ?? "");
  const [gradeId, setGradeId] = useState(membership?.gradeId ?? "");

  /**
   * Changer de service invalide le grade choisi : les grades appartiennent à
   * un service. On repositionne sur le grade le plus bas du service d'arrivée,
   * plutôt que de laisser un grade d'un autre service que le serveur refusera.
   */
  function changeDepartment(nextDepartmentId: string) {
    setDepartmentId(nextDepartmentId);
    const grades = departments.find((d) => d.id === nextDepartmentId)?.grades ?? [];
    const lowest = [...grades].sort((a, b) => a.level - b.level)[0];
    setGradeId(nextDepartmentId === membership?.departmentId ? (membership?.gradeId ?? "") : (lowest?.id ?? ""));
  }

  useEffect(() => {
    if (state !== initialState && !state.error && !state.fieldErrors) {
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const selectedDepartment = departments.find((department) => department.id === departmentId);
  const sortedGrades = selectedDepartment
    ? [...selectedDepartment.grades].sort((a, b) => a.level - b.level)
    : [];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="userId" value={userId} />
      {membership ? <input type="hidden" name="id" value={membership.id} /> : null}
      <input type="hidden" name="departmentId" value={departmentId} />

      <div className="flex flex-col gap-2">
        <Label>Département</Label>
        <Select value={departmentId} onValueChange={changeDepartment}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un département" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.shortName} — {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Grade</Label>
        <Select name="gradeId" value={gradeId} onValueChange={setGradeId}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un grade" />
          </SelectTrigger>
          <SelectContent>
            {sortedGrades.map((grade) => (
              <SelectItem key={grade.id} value={grade.id}>
                {grade.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.gradeId?.map((m) => (
          <p key={m} className="text-sm text-destructive">
            {m}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="badgeNumber">Matricule</Label>
          <Input
            id="badgeNumber"
            name="badgeNumber"
            defaultValue={membership?.badgeNumber}
            className="font-mono"
          />
          {state.fieldErrors?.badgeNumber?.map((m) => (
            <p key={m} className="text-sm text-destructive">
              {m}
            </p>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="callsign">Indicatif (optionnel)</Label>
          <Input id="callsign" name="callsign" defaultValue={membership?.callsign ?? ""} className="font-mono" />
        </div>
      </div>

      {membership ? (
        <div className="flex flex-col gap-2">
          <Label>Statut</Label>
          <Select name="status" defaultValue={membership.status}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Checkbox id="isPrimary" name="isPrimary" defaultChecked={membership?.isPrimary} />
        <Label htmlFor="isPrimary" className="font-normal">
          Affectation principale
        </Label>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
        {membership ? "Enregistrer les modifications" : "Ajouter l'affectation"}
      </Button>
    </form>
  );
}
