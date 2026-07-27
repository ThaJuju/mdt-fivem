import { Badge } from "@/components/ui/badge";
import { AddMembershipDialog, EditMembershipDialog } from "./membership-dialogs";
import { RemoveMembershipButton } from "./remove-membership-button";
import type { DepartmentOption, ExistingMembership } from "./membership-form";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Actif",
  LOA: "Congé",
  SUSPENDED: "Suspendu",
  TERMINATED: "Licencié",
};

type MembershipRow = ExistingMembership & {
  departmentShortName: string;
  departmentColor: string;
  gradeName: string;
};

export function MembershipsSection({
  userId,
  memberships,
  departments,
}: {
  userId: string;
  memberships: MembershipRow[];
  departments: DepartmentOption[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Affectations</h2>
        <AddMembershipDialog userId={userId} departments={departments} />
      </div>
      {memberships.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune affectation : ce compte n&apos;a accès à aucun module tant qu&apos;il n&apos;appartient à
          aucun département.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {memberships.map((membership) => (
            <div
              key={membership.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: membership.departmentColor }}
                  aria-hidden
                />
                <div className="flex flex-col">
                  <span className="text-sm">
                    {membership.departmentShortName} — {membership.gradeName}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    #{membership.badgeNumber}
                    {membership.callsign ? ` · ${membership.callsign}` : ""}
                  </span>
                </div>
                {membership.isPrimary ? <Badge variant="secondary">Principale</Badge> : null}
                <Badge variant="outline">{STATUS_LABELS[membership.status] ?? membership.status}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <EditMembershipDialog userId={userId} departments={departments} membership={membership} />
                <RemoveMembershipButton userId={userId} membershipId={membership.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
