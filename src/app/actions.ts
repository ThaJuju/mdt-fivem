"use server";

import { redirect } from "next/navigation";
import { destroySession, getActor } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function logout(): Promise<void> {
  const actor = await getActor();
  if (actor) {
    await audit(actor, "auth.logout");
  }
  await destroySession();
  redirect("/connexion");
}
