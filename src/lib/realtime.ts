import "server-only";

import type { Server as SocketServer } from "socket.io";

export const DISPATCH_CHANNEL = "dispatch:update";

/**
 * Diffuse un simple signal « quelque chose a changé » aux postes connectés.
 * Volontairement sans charge utile : chaque client recharge ensuite ses
 * données par le rendu serveur habituel, donc les permissions restent
 * appliquées. Un client ne peut rien apprendre par le socket lui-même.
 *
 * Sans serveur maison (ex. `next dev` seul), `io` est absent et la fonction
 * ne fait rien : l'application reste utilisable, sans temps réel.
 */
export function broadcastDispatchUpdate(): void {
  const globalWithIo = globalThis as typeof globalThis & { __mdtIo?: SocketServer };
  globalWithIo.__mdtIo?.emit(DISPATCH_CHANNEL);
}
