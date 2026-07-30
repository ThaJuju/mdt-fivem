import "server-only";

import type { ReportStatus, ReportType } from "@prisma/client";
import { prisma } from "./prisma";
import { can, type Actor } from "./auth";
import { ActionError } from "./errors";

export type EditableReport = {
  authorId: string;
  status: ReportStatus;
  type: ReportType;
};

/**
 * Un rapport n'est modifiable que par son auteur (`reports.edit`) ou par
 * quelqu'un disposant de `reports.edit_any`. Un rapport validé est verrouillé
 * pour tout le monde sauf `reports.edit_any`.
 *
 * Ce contrôle vit ici, et non dans `rapports/actions.ts`, parce qu'il ne
 * concerne pas que le module police : le volet médical d'une intervention est
 * une modification de rapport comme une autre, et doit passer par la même
 * porte. Le manquer revenait à laisser n'importe quel ambulancier réécrire le
 * triage de l'intervention d'un collègue.
 */
export async function assertCanEditReport(actor: Actor, reportId: string): Promise<EditableReport> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { authorId: true, status: true, type: true },
  });
  if (!report) throw new ActionError("Ce rapport n'existe pas ou a été supprimé.");

  const isAuthor = report.authorId === actor.id;
  const canEditAny = can(actor, "reports.edit_any");

  if (!canEditAny) {
    if (!isAuthor || !can(actor, "reports.edit")) {
      throw new ActionError("Vous ne pouvez modifier que vos propres rapports.");
    }
    if (report.status === "APPROVED") {
      throw new ActionError("Ce rapport est validé : il ne peut plus être modifié.");
    }
  }
  return report;
}
