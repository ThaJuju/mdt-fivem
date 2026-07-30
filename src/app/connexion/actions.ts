"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clientIp, clientIpKey } from "@/lib/client-ip";
import { hydrateLoginCounters, recordLoginAttempt } from "@/lib/login-attempts";
import { verifyPassword, verifyAgainstDecoy, createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  consumeRateLimit,
  formatRetryDelay,
  peekRateLimit,
  resetRateLimit,
  type RateLimitRule,
} from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations/auth";

export type LoginState = {
  error?: string;
  fieldErrors?: Partial<Record<"username" | "password", string[]>>;
};

/**
 * Seuls les *échecs* sont comptés, et les compteurs sont remis à zéro dès
 * qu'une connexion aboutit : quelqu'un qui finit par retrouver son mot de
 * passe n'est pas puni pour ses tâtonnements.
 *
 * Trois compteurs superposés, parce qu'aucun ne suffit seul :
 *
 * - **identifiant + adresse** (5) : le cas ordinaire. Bloquer ce couple plutôt
 *   que l'identifiant seul évite le verrouillage malveillant — sans quoi
 *   n'importe qui pourrait bloquer le compte d'un agent en cinq essais ratés
 *   depuis chez lui, ce qui transforme la protection en arme.
 * - **adresse seule** (20) : contre le balayage de beaucoup de comptes depuis
 *   une même source.
 * - **identifiant seul** (30) : filet de sécurité contre une attaque répartie
 *   sur plusieurs adresses. Le seuil est haut, précisément pour qu'un
 *   verrouillage volontaire coûte cher à provoquer.
 *
 * La solidité des deux premiers repose entièrement sur `clientIp()`, qui ne
 * fait confiance qu'à l'entrée écrite par le reverse proxy. En production
 * derrière nginx correctement configuré (voir `deploy/nginx.conf.example`),
 * l'adresse n'est pas falsifiable et les trois compteurs mordent réellement.
 * Sans proxy, `clientIp()` renvoie « inconnue » pour tout le monde : le
 * compteur par couple dégénère alors en compteur par identifiant, ce qui reste
 * la protection utile.
 */
const PER_USER_AND_IP: RateLimitRule = { limit: 5, windowMs: 15 * 60 * 1000 };
const PER_IP: RateLimitRule = { limit: 20, windowMs: 15 * 60 * 1000 };
const PER_USERNAME: RateLimitRule = { limit: 30, windowMs: 15 * 60 * 1000 };

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
  const ipValue = await clientIp();
  const ip = await clientIpKey();
  const account = username.toLowerCase();
  const counters = [
    [`login:pair:${account}:${ip}`, PER_USER_AND_IP],
    [`login:ip:${ip}`, PER_IP],
    [`login:user:${account}`, PER_USERNAME],
  ] as const;

  // Mémoire longue : au premier passage sur une clé que ce processus ne
  // connaît pas — après un redémarrage, typiquement — les échecs encore
  // comptables sont relus en base. Sans cela, redémarrer le serveur rendait
  // ses cinq tentatives à qui venait de les épuiser.
  await hydrateLoginCounters(counters, { identifier: account, ip: ipValue });

  // Refus *avant* toute requête et tout Argon2 : un hachage coûte
  // volontairement cher, le marteler serait à soi seul un déni de service.
  for (const [key, rule] of counters) {
    const verdict = peekRateLimit(key, rule);
    if (!verdict.ok) {
      return {
        error:
          `Trop de tentatives de connexion. Réessayez dans ${formatRetryDelay(verdict.retryAfterMs)}.`,
      };
    }
  }

  const user = await prisma.user.findUnique({ where: { username } });
  // Un identifiant inconnu doit coûter le même temps qu'un identifiant réel,
  // sans quoi la durée de la réponse révèle quels comptes existent.
  const passwordOk = user
    ? await verifyPassword(user.passwordHash, password)
    : await verifyAgainstDecoy(password);

  if (!user || !user.isActive || !passwordOk) {
    for (const [key, rule] of counters) consumeRateLimit(key, rule);
    // Seules les tentatives réellement vérifiées sont enregistrées : celles
    // que la limitation a refusées plus haut n'ont pas coûté d'Argon2 et les
    // compter deux fois fausserait le réamorçage.
    await recordLoginAttempt({ identifier: account, ip: ipValue, succeeded: false });
    await audit(user ? { id: user.id } : null, "auth.login_failed", { metadata: { username, ip } });
    return { error: "Identifiant ou mot de passe incorrect." };
  }

  for (const [key] of counters) resetRateLimit(key);
  // Enregistré aussi : c'est ce succès qui, relu après un redémarrage, remet
  // les compteurs à zéro comme `resetRateLimit()` vient de le faire ici.
  await recordLoginAttempt({ identifier: account, ip: ipValue, succeeded: true });

  await createSession(user.id);
  await audit({ id: user.id }, "auth.login");

  const destination = user.mustChangePassword
    ? "/changer-mot-de-passe"
    : (safeReturnPath(formData.get("depuis")) ?? "/");
  redirect(destination);
}
