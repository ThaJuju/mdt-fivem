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

/**
 * Le middleware pose `?depuis=<chemin>` quand il intercepte une page demandée
 * sans session. On y renvoie l'agent après connexion, plutôt que de le lâcher
 * sur le tableau de bord alors qu'il visait une fiche précise.
 *
 * Seuls les chemins internes sont acceptés : un `//evil.example` ou une URL
 * absolue serait une redirection ouverte, qui permettrait d'envoyer quelqu'un
 * sur un faux MDT juste après sa connexion.
 */
function safeReturnPath(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.startsWith("/connexion")) return null;
  return raw;
}

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

  const destination = user.mustChangePassword
    ? "/changer-mot-de-passe"
    : (safeReturnPath(formData.get("depuis")) ?? "/");
  redirect(destination);
}
