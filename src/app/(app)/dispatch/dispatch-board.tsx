"use client";

import { useDispatchSync } from "@/components/use-dispatch-sync";
import { cn } from "@/lib/utils";
import { CallsPanel } from "./calls-panel";
import { UnitsPanel } from "./units-panel";
import type { CallRow, UnitRow, StatusCodeOption } from "./types";

export function DispatchBoard({
  calls,
  units,
  statusCodes,
  actorId,
  canCreate,
  canEdit,
  canClose,
  canAssign,
  canManageUnits,
}: {
  calls: CallRow[];
  units: UnitRow[];
  statusCodes: StatusCodeOption[];
  actorId: string;
  canCreate: boolean;
  canEdit: boolean;
  canClose: boolean;
  canAssign: boolean;
  canManageUnits: boolean;
}) {
  const { connected } = useDispatchSync();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Dispatch</h1>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn("size-2 rounded-full", connected ? "bg-department" : "bg-muted-foreground")}
            aria-hidden
          />
          {connected ? "Synchronisé avec les autres postes" : "Hors synchronisation — rechargez la page"}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <CallsPanel
          calls={calls}
          units={units}
          statusCodes={statusCodes}
          canCreate={canCreate}
          canEdit={canEdit}
          canClose={canClose}
          canAssign={canAssign}
        />
        <UnitsPanel units={units} actorId={actorId} canManage={canManageUnits} />
      </div>
    </div>
  );
}
