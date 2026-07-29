import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { MembershipStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { clientIp, isSecureRequest } from "./client-ip";
import { ActionError } from "./errors";
import { domainAllowsDepartment } from "./permissions";
import { SESSION_COOKIE_NAME } from "./session-constants";

export { SESSION_COOKIE_NAME };
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14; // 14 jours

export type ActorMembership = {
  id: string;
  departmentId: string;
  departmentName: string;
  departmentShortName: string;
  departmentColor: string;
  departmentType: string;
  gradeId: string;
  gradeName: string;
  gradeLevel: number;
  badgeNumber: string;
  callsign: string | null;
  isPrimary: boolean;
  status: MembershipStatus;
};

export type Actor = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  permissions: Set<string>;
  memberships: ActorMembership[];
};

// ── Mots de passe ──────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return argon2Hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await argon2Verify(passwordHash, password);
  } catch {
    return false;
  }
}

let decoyHash: Promise<string> | null = null;

/**
 * Vérifie le mot de passe contre un hachage factice, et retourne toujours
 * faux.
 *
 * Sans cela, un identifiant inexistant répond tout de suite tandis qu'un
 * identifiant valide coûte le temps d'un Argon2 : l'écart suffit à énumérer
 * les comptes du serveur. On paie donc le même prix dans les deux cas.
 *
 * Le hachage factice est calculé une fois, à la première tentative sur un
 * compte inconnu, à partir d'un mot de passe aléatoire que personne ne
 * connaît — aucun secret en dur dans le code.
 */
export async function verifyAgainstDecoy(password: string): Promise<false> {
  decoyHash ??= hashPassword(randomBytes(32).toString("hex"));
  await verifyPassword(await decoyHash, password);
  return false;
}

// ── Sessions ────────────────────────────────────────────────────────────

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function clientInfo() {
  const headerList = await headers();
  return {
    ip: await clientIp(),
    userAgent: headerList.get("user-agent"),
  };
}

/** Crée une session, pose le cookie httpOnly et met à jour la date de dernière connexion. */
export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const { ip, userAgent } = await clientInfo();

  await prisma.$transaction([
    prisma.session.create({
      data: { userId, tokenHash, expiresAt, ip, userAgent },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    }),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    // `Secure` seulement si la requête est réellement arrivée en HTTPS : se
    // fier à `NODE_ENV === "production"` était un piège, car en HTTP simple
    // (LAN, IP directe) le navigateur refuse un cookie `Secure` et l'agent
    // semble déconnecté à chaque clic. Derrière nginx en TLS, il redevient
    // `Secure` sans rien changer ici.
    secure: await isSecureRequest(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Détruit la session courante côté base et supprime le cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Déconnecte toutes les sessions d'un compte *sauf* celle qui exécute la
 * requête en cours.
 *
 * À appeler dès que le mot de passe change : sans cela, un cookie volé reste
 * valable quatorze jours après que la victime a réagi, et changer son mot de
 * passe — le seul réflexe que tout le monde a — ne servait à rien.
 *
 * Retourne le nombre de sessions fermées, pour le journal d'audit.
 */
export async function revokeOtherSessions(userId: string): Promise<number> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const { count } = await prisma.session.deleteMany({
    where: {
      userId,
      ...(token ? { NOT: { tokenHash: hashToken(token) } } : {}),
    },
  });
  return count;
}

/**
 * Déconnecte toutes les sessions d'un compte, sans exception.
 *
 * Utilisé par les actions d'administration : réinitialiser le mot de passe
 * de quelqu'un ou désactiver son compte doit couper l'accès *maintenant*, pas
 * à l'expiration du cookie. L'admin agissant sur un autre compte que le sien,
 * il n'y a pas de session à épargner.
 */
export async function revokeAllSessions(userId: string): Promise<number> {
  const { count } = await prisma.session.deleteMany({ where: { userId } });
  return count;
}

/**
 * Le service « courant » d'un acteur : son adhésion principale si elle est
 * active, sinon la première adhésion active trouvée. C'est ce service unique
 * qui détermine à la fois les permissions et le cloisonnement — d'où ce
 * sélecteur partagé, pour que `computePermissions()` et `can()` ne puissent
 * jamais désigner deux services différents.
 */
function activePrimaryMembership<T extends { status: MembershipStatus; isPrimary: boolean }>(
  memberships: T[],
): T | undefined {
  const active = memberships.filter((membership) => membership.status === "ACTIVE");
  return active.find((membership) => membership.isPrimary) ?? active[0];
}

function computePermissions(
  memberships: { status: MembershipStatus; isPrimary: boolean; grade: { permissions: string[] } }[],
): Set<string> {
  const current = activePrimaryMembership(memberships);
  const permissions = new Set<string>();
  if (!current) return permissions;
  for (const permission of current.grade.permissions) {
    permissions.add(permission);
  }
  return permissions;
}

/**
 * Résout l'utilisateur courant depuis le cookie de session et calcule ses
 * permissions effectives du service principal actif. Les droits d'une
 * seconde affectation ne traversent jamais le contexte courant.
 * Mémoïsé pour la durée de la requête via `React.cache`.
 */
export const getActor = cache(async (): Promise<Actor | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        include: {
          memberships: { include: { department: true, grade: true } },
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const { user } = session;
  if (!user.isActive) return null;

  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    isSuperAdmin: user.isSuperAdmin,
    mustChangePassword: user.mustChangePassword,
    permissions: computePermissions(user.memberships),
    memberships: user.memberships.map((m) => ({
      id: m.id,
      departmentId: m.departmentId,
      departmentName: m.department.name,
      departmentShortName: m.department.shortName,
      departmentColor: m.department.color,
      departmentType: m.department.type,
      gradeId: m.gradeId,
      gradeName: m.grade.name,
      gradeLevel: m.grade.level,
      badgeNumber: m.badgeNumber,
      callsign: m.callsign,
      isPrimary: m.isPrimary,
      status: m.status,
    })),
  };
});

/** Retourne l'acteur courant ou redirige vers la page de connexion. */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/connexion");
  return actor;
}

// ── Permissions ────────────────────────────────────────────────────────

/**
 * Le cloisonnement par service se lit désormais dans le catalogue
 * (`restrictedTo`), pas dans une liste codée en dur ici : déclarer un domaine
 * réservé suffit, sans repasser par ce fichier.
 */
export function can(actor: Actor | null, permission: string): boolean {
  if (!actor) return false;
  if (actor.isSuperAdmin) return true;
  const domain = permission.split(".")[0];
  const primary = activePrimaryMembership(actor.memberships);
  if (!domainAllowsDepartment(domain, primary?.departmentType)) return false;
  return actor.permissions.has(permission);
}

/**
 * Garde d'entrée obligatoire pour toute server action. `isSuperAdmin`
 * court-circuite le contrôle. Lève une `ActionError` (message français,
 * affichable tel quel) si l'acteur est absent ou n'a pas la permission.
 */
export function assertCan(actor: Actor | null, permission: string): asserts actor is Actor {
  if (!actor) {
    throw new ActionError("Vous devez être connecté pour effectuer cette action.");
  }
  if (!can(actor, permission)) {
    throw new ActionError("Vous n'avez pas la permission nécessaire pour effectuer cette action.");
  }
}

/**
 * Équivalent de `assertCan` pour les *pages* : au lieu de lever une erreur
 * (qui produirait un 500 illisible), redirige vers une page d'accès refusé
 * qui explique quelle permission manque. `assertCan` reste la garde des
 * server actions.
 */
export function requirePagePermission(actor: Actor, permission: string): void {
  if (!can(actor, permission)) {
    redirect(`/acces-refuse?p=${encodeURIComponent(permission)}`);
  }
}
