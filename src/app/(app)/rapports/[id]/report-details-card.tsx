"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REPORT_TYPE_LABELS } from "@/lib/labels";
import { type ExistingReport, ReportForm } from "../report-form";

export function ReportDetailsCard({
  departments,
  report,
  canEdit,
}: {
  departments: { id: string; shortName: string; name: string }[];
  report: ExistingReport;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const department = departments.find((item) => item.id === report.departmentId);

  const fields = [
    ["Type de rapport", REPORT_TYPE_LABELS[report.type] ?? report.type],
    ["Service", department ? `${department.shortName} — ${department.name}` : "—"],
    [
      "Date et heure des faits",
      new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(report.occurredAt)),
    ],
    ["Lieu", report.location || "Non renseigné"],
  ];

  return (
    <Card>
      <CardHeader className="border-b border-border/70 pb-4">
        <CardTitle>Rapport</CardTitle>
        {canEdit ? (
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
              {editing ? "Annuler" : "Modifier"}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {!editing ? (
          <div className="flex flex-col gap-6">
            <dl className="grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2">
              {fields.map(([label, value]) => (
                <div key={label} className="border-l border-border/80 pl-3">
                  <dt className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    {label}
                  </dt>
                  <dd className="mt-1.5 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                Récit
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{report.content}</p>
            </div>
          </div>
        ) : (
          <ReportForm
            departments={departments}
            report={report}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}
