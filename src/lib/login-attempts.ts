import "server-only";

import { prisma } from "./prisma";
import { hasRateLimitKey, seedRateLimit, type RateLimitRule } from "./rate-limit";

/**
 * Mémoire longue de la limitation de connexion.
 *
 * La `Map` de `rate-limit.ts` reste le premier étage — elle absorbe les
 * rafales sans une requête par tentative, et c'est délibéré : compter les
 * essais refusés dans PostgreSQL ferait de la protection elle-même le vecteur
 * d'attaque. Ce module lui ajoute un second étage, en base, pour deux raisons
 * qui n'ont rien à voir avec le multi-instance :
 *
 * 1. **Les compteurs survivent au redémarrage.** Sans cela, un attaquant qui
 *    provoque un redémarrage — ou qui attend simplement un déploiement —
 *    récupère ses cinq tentatives.
 * 2. **Un administrateur peut enfin voir les tentatives échouées** sur un
 *    compte, ce qu'aucun écran ne permettait.
 *
 * Ce n'est pas une réponse au multi-instance : deux processus continueraient
 * de doubler les quotas dans leur fenêtre courante. Voir `CLAUDE.md`.
 */

/** Une tentative dont on garde la trace : identifiant saisi, adresse, issue. */
export type AttemptRecord = {
  identifier: string;
  ip: string | null;
  succeeded: boolean;
};

export async function recordLoginAttempt(attempt: AttemptRecord): Promise<void> {
  try {
    await prisma.loginAttempt.create({ data: attempt });
  } catch {
    // Journaliser la tentative ne doit jamais empêcher de se connecter, ni
    // renseigner l'attaquant par une erreur différente. Le compteur en
    // mémoire, lui, a déjà fait son travail.
  }
}

/**
 * Horodatages des échecs encore comptables pour une clé donnée.
 *
 * Un succès remet tout à zéro, en base comme en mémoire : on ne retient que
 * les échecs postérieurs à la dernière réussite. Sans cette règle, un agent
 * qui a fini par retrouver son mot de passe serait puni de ses tâtonnements
 * au prochain redémarrage — exactement ce que `resetRateLimit()` évite en
 * fonctionnement normal.
 */
function failuresSinceLastSuccess(
  attempts: { succeeded: boolean; createdAt: Date }[],
): number[] {
  const failures: number[] = [];
  for (const attempt of attempts) {
    if (attempt.succeeded) failures.length = 0;
    else failures.push(attempt.createdAt.getTime());
  }
  return failures;
}

/**
 * Réamorce les compteurs en mémoire depuis la base, au premier passage sur
 * une clé que le processus ne connaît pas encore.
 *
 * Une seule requête, et seulement quand c'est utile : dès que les trois clés
 * sont suivies en mémoire — c'est-à-dire dès la deuxième tentative — on ne
 * touche plus à la base.
 */
export async function hydrateLoginCounters(
  counters: readonly (readonly [string, RateLimitRule])[],
  scope: { identifier: string; ip: string | null },
): Promise<void> {
  const cold = counters.filter(([key]) => !hasRateLimitKey(key));
  if (cold.length === 0) return;

  const windowMs = Math.max(...cold.map(([, rule]) => rule.windowMs));
  const since = new Date(Date.now() - windowMs);

  try {
    const attempts = await prisma.loginAttempt.findMany({
      where: {
        createdAt: { gte: since },
        OR: [
          { identifier: scope.identifier },
          ...(scope.ip ? [{ ip: scope.ip }] : []),
        ],
      },
      orderBy: { createdAt: "asc" },
      select: { identifier: true, ip: true, succeeded: true, createdAt: true },
      // Au-delà, la clé est de toute façon largement au-dessus de sa limite.
      take: 500,
    });
    if (attempts.length === 0) return;

    const byPair = attempts.filter(
      (attempt) => attempt.identifier === scope.identifier && scope.ip !== null && attempt.ip === scope.ip,
    );
    const byIp = scope.ip === null ? [] : attempts.filter((attempt) => attempt.ip === scope.ip);
    const byIdentifier = attempts.filter((attempt) => attempt.identifier === scope.identifier);

    // L'ordre suit celui des compteurs de `login()` : couple, adresse,
    // identifiant.
    const buckets = [byPair, byIp, byIdentifier];
    for (const [index, [key, rule]] of counters.entries()) {
      if (hasRateLimitKey(key)) continue;
      seedRateLimit(key, failuresSinceLastSuccess(buckets[index] ?? []), rule);
    }
  } catch {
    // Base indisponible : on retombe sur le seul compteur mémoire, qui reste
    // la protection utile. Refuser la connexion ici transformerait une panne
    // de base en verrouillage général.
  }
}
