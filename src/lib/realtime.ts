import "server-only";

import type { Server as SocketServer } from "socket.io";

export const DISPATCH_CHANNEL = "dispatch:update";
export const PANIC_CHANNEL = "dispatch:panic";

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
  io()?.emit(DISPATCH_CHANNEL);
}

/**
 * Canal séparé pour le 10-99.
 *
 * Le canal général n'est écouté que par le tableau de dispatch : un agent qui
 * rédige un rapport ou consulte une fiche n'apprenait jamais qu'un collègue
 * était en danger. Celui-ci est écouté par le gabarit de l'application, donc
 * depuis tous les modules.
 *
 * Même principe que le canal général : la charge utile se limite à
 * l'identifiant de l'unité, le client recharge ensuite par le rendu serveur
 * habituel. Rien de ce qui transite ici n'est une donnée métier, les
 * permissions restent appliquées au rendu.
 *
 * Émis dans les deux sens — déclenchement *et* levée — pour que le bandeau
 * disparaisse des autres postes quand l'alerte est terminée.
 */
export function broadcastPanic(unitId: string): void {
  io()?.emit(PANIC_CHANNEL, { unitId });
}

function io(): SocketServer | undefined {
  const globalWithIo = globalThis as typeof globalThis & { __mdtIo?: SocketServer };
  return globalWithIo.__mdtIo;
}
