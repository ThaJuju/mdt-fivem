import { Badge } from "@/components/ui/badge";
import { AddGradeDialog, EditGradeDialog } from "../grade-dialogs";
import { DeleteGradeButton } from "../delete-grade-button";
import type { ExistingGrade } from "../grade-form";

export function GradesSection({
  departmentId,
  grades,
}: {
  departmentId: string;
  grades: (ExistingGrade & { memberCount: number })[];
}) {
  const sorted = [...grades].sort((a, b) => a.level - b.level);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Grades</h2>
        <AddGradeDialog departmentId={departmentId} />
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun grade : ce département ne peut recevoir aucune affectation tant qu&apos;il n&apos;a pas au
          moins un grade.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((grade) => (
            <div
              key={grade.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">Niv. {grade.level}</span>
                <span className="text-sm">{grade.name}</span>
                {grade.isDefault ? <Badge variant="secondary">Par défaut</Badge> : null}
                <span className="text-xs text-muted-foreground">
                  {grade.permissions.length} permission{grade.permissions.length > 1 ? "s" : ""} ·{" "}
                  {grade.memberCount} membre{grade.memberCount > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <EditGradeDialog departmentId={departmentId} grade={grade} />
                <DeleteGradeButton departmentId={departmentId} gradeId={grade.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
