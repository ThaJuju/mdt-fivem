import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { AddLicenseDialog, EditLicenseDialog } from "./license-dialogs";
import { DeleteLicenseButton } from "./delete-license-button";
import type { ExistingLicense } from "./license-form";

const STATUS_LABELS: Record<string, string> = {
  VALID: "Valide",
  SUSPENDED: "Suspendue",
  REVOKED: "Révoquée",
  EXPIRED: "Expirée",
};

export function LicensesSection({
  citizenId,
  licenses,
  canManage,
}: {
  citizenId: string;
  licenses: ExistingLicense[];
  canManage: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Licences</h2>
        {canManage ? <AddLicenseDialog citizenId={citizenId} /> : null}
      </div>
      {licenses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune licence enregistrée.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {licenses.map((license) => (
            <div
              key={license.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-3"
            >
              <div className="flex flex-col">
                <span className="text-sm capitalize">{license.type}</span>
                <span className="text-xs text-muted-foreground">
                  Délivrée le {format(new Date(license.issuedAt), "dd/MM/yyyy", { locale: fr })}
                  {license.expiresAt
                    ? ` · expire le ${format(new Date(license.expiresAt), "dd/MM/yyyy", { locale: fr })}`
                    : ""}
                  {license.points > 0 ? ` · ${license.points} points` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={license.status === "VALID" ? "outline" : "secondary"}>
                  {STATUS_LABELS[license.status] ?? license.status}
                </Badge>
                {canManage ? (
                  <div className="flex items-center gap-1">
                    <EditLicenseDialog citizenId={citizenId} license={license} />
                    <DeleteLicenseButton citizenId={citizenId} licenseId={license.id} />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
