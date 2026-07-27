import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { hash as argon2Hash, verify as argon2Verify } from "@node-rs/argon2";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { MembershipStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { ActionError } from "./errors";

export const SESSION_COOKIE_NAME = "mdt_session";
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
    ip: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
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
    secure: process.env.NODE_ENV === "production",
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

function computePermissions(
  memberships: { status: MembershipStatus; grade: { permissions: string[] } }[],
): Set<string> {
  const permissions = new Set<string>();
  for (const membership of memberships) {
    if (membership.status !== "ACTIVE") continue;
    for (const permission of membership.grade.permissions) {
      permissions.add(permission);
    }
  }
  return permissions;
}

/**
 * Résout l'utilisateur courant depuis le cookie de session et calcule ses
 * permissions effectives (union des grades de ses adhésions actives).
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

export function can(actor: Actor | null, permission: string): boolean {
  if (!actor) return false;
  if (actor.isSuperAdmin) return true;
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
