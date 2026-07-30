/**
 * Motifs de refus qui ne sont *pas* une permission manquante.
 *
 * Le cloisonnement d'un dossier par service, ou le secret médical, ne se
 * corrigent pas en demandant un droit à un supérieur : le rapport appartient à
 * un autre service, ou porte un volet médical, et c'est tout. Les exprimer en
 * passant une permission inexistante à `requirePagePermission()` fonctionnait
 * — `can()` renvoie faux, la redirection a lieu — mais l'agent lisait
 * « __department.report » à l'écran et se voyait conseiller de réclamer un
 * droit qui n'existe pas.
 *
 * Ce module ne porte pas `server-only` : la page `/acces-refuse` en a besoin
 * pour rendre le texte, `auth.ts` pour le type du motif.
 */

export const ACCESS_DENIED_REASONS = {
  "autre-service":
    "Ce rapport appartient à un autre service. Seuls les agents qui y figurent comme intervenants peuvent le consulter.",
  "secret-medical":
    "Ce rapport contient un volet médical : il est réservé au service médical et aux agents qui étaient sur place.",
} as const;

export type AccessDeniedReason = keyof typeof ACCESS_DENIED_REASONS;

/**
 * Le motif arrive par l'URL, donc du navigateur : on ne rend que ce qu'on
 * reconnaît. Sans ce filtre, `/acces-refuse?motif=...` afficherait n'importe
 * quel texte fourni par un tiers sur une page de l'application.
 */
export function accessDeniedMessage(reason: string | undefined): string | null {
  if (!reason) return null;
  return reason in ACCESS_DENIED_REASONS
    ? ACCESS_DENIED_REASONS[reason as AccessDeniedReason]
    : null;
}
