"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  can,
  currentSessionId,
  destroySession,
  requireActor,
  revokeAllSessions,
  revokeOtherSessions,
} from "@/lib/auth";
import { audit } from "@/lib/audit";
import { ActionError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

function revalidateSessionPages(userId: string) {
  revalidatePath("/mon-compte");
  revalidatePath(`/admin/comptes/${userId}`);
}

export async function revokeSession(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true },
  });
  if (!session) return;
  if (session.userId !== actor.id && !can(actor, "admin.users.manage")) {
    throw new ActionError("Vous ne pouvez pas fermer cette session.");
  }

  const isCurrent = session.id === (await currentSessionId());
  await audit(actor, "session.revoke", {
    entity: "Session",
    entityId: session.id,
    metadata: { userId: session.userId, current: isCurrent },
  });

  if (isCurrent) {
    await destroySession();
    redirect("/connexion");
  }

  await prisma.session.delete({ where: { id: session.id } });
  revalidateSessionPages(session.userId);
}

export async function revokeOtherUserSessions(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const userId = String(formData.get("userId") ?? "");
  const isSelf = userId === actor.id;
  if (!isSelf && !can(actor, "admin.users.manage")) {
    throw new ActionError("Vous ne pouvez pas fermer ces sessions.");
  }

  const revoked = isSelf ? await revokeOtherSessions(userId) : await revokeAllSessions(userId);
  await audit(actor, "session.revoke", {
    entity: "User",
    entityId: userId,
    metadata: { revokedSessions: revoked, scope: isSelf ? "others" : "all" },
  });
  revalidateSessionPages(userId);
}
