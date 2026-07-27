"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActor, verifyPassword, hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { changePasswordSchema } from "@/lib/validations/auth";

export type ChangePasswordState = {
  error?: string;
  fieldErrors?: Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string[]>>;
};

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const actor = await getActor();
  if (!actor) redirect("/connexion");

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } });
  const currentOk = await verifyPassword(user.passwordHash, parsed.data.currentPassword);
  if (!currentOk) {
    return { fieldErrors: { currentPassword: ["Mot de passe actuel incorrect."] } };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: actor.id },
    data: { passwordHash, mustChangePassword: false },
  });
  await audit(actor, "auth.password_changed", { entity: "User", entityId: actor.id });

  redirect("/");
}
