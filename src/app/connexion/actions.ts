"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { loginSchema } from "@/lib/validations/auth";

export type LoginState = {
  error?: string;
  fieldErrors?: Partial<Record<"username" | "password", string[]>>;
};

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { username, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username } });
  const passwordOk = user ? await verifyPassword(user.passwordHash, password) : false;

  if (!user || !user.isActive || !passwordOk) {
    await audit(user ? { id: user.id } : null, "auth.login_failed", { metadata: { username } });
    return { error: "Identifiant ou mot de passe incorrect." };
  }

  await createSession(user.id);
  await audit({ id: user.id }, "auth.login");

  const destination = user.mustChangePassword ? "/changer-mot-de-passe" : "/";
  redirect(destination);
}
