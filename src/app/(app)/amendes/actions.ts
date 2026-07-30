"use server";

import { revalidatePath } from "next/cache";
import { assertCan, requireActor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { fineAmount } from "@/lib/fines";

export type FineActionState = { error?: string; success?: boolean };

export async function collectFine(
  _previousState: FineActionState,
  formData: FormData,
): Promise<FineActionState> {
  try {
    const actor = await requireActor();
    assertCan(actor, "charges.collect");
    const chargeId = String(formData.get("chargeId") ?? "");

    const charge = await prisma.charge.findUnique({
      where: { id: chargeId },
      select: {
        id: true,
        citizenId: true,
        reportId: true,
        isPaid: true,
        isGuilty: true,
        fine: true,
        count: true,
        report: { select: { status: true } },
      },
    });
    if (!charge) return { error: "Cette amende n'existe plus." };
    if (!charge.isGuilty || charge.report.status !== "APPROVED") {
      return { error: "Seule une amende retenue sur un rapport validé peut être encaissée." };
    }
    if (charge.isPaid) return { error: "Cette amende a déjà été encaissée." };

    const paidAt = new Date();
    const updated = await prisma.charge.updateMany({
      where: { id: charge.id, isPaid: false },
      data: { isPaid: true, paidAt, paidById: actor.id },
    });
    if (updated.count !== 1) return { error: "Cette amende vient déjà d'être encaissée." };

    await audit(actor, "charge.collect", {
      entity: "Charge",
      entityId: charge.id,
      metadata: { citizenId: charge.citizenId, amount: fineAmount(charge) },
    });
    revalidatePath("/amendes");
    revalidatePath(`/citoyens/${charge.citizenId}`);
    revalidatePath(`/rapports/${charge.reportId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof ActionError) return { error: error.message };
    throw error;
  }
}
