import "server-only";

import { prisma } from "./prisma";
import { expireStaleRecords as sweep } from "./maintenance";

/**
 * Expiration paresseuse : plutôt que d'attendre la tâche d'entretien, les
 * mandats, BOLO et licences arrivés à échéance sont basculés au moment où on
 * ouvre un écran qui les affiche comme actifs. Un enregistrement périmé n'est
 * donc jamais présenté comme valide.
 *
 * À appeler depuis **toute** page qui affiche un de ces enregistrements comme
 * actif : liste des mandats, liste des BOLO, fiche citoyen. Le coût est de
 * trois `updateMany` sans effet quand il n'y a rien à faire.
 *
 * Le balayage lui-même vit dans `maintenance.ts`, parce que `server.ts` le
 * rejoue toutes les six heures avec son propre client Prisma : une seule
 * définition, deux déclencheurs.
 */
export async function expireStaleRecords(): Promise<void> {
  await sweep(prisma);
}
