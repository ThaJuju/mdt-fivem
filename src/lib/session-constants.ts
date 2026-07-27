/**
 * Isolé de auth.ts pour rester importable depuis le middleware (runtime Edge,
 * incompatible avec le reste de auth.ts qui dépend de Prisma).
 */
export const SESSION_COOKIE_NAME = "mdt_session";
