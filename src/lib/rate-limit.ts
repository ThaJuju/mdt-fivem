import "server-only";

/**
 * Limitation de débit à fenêtre glissante, en mémoire.
 *
 * L'application tourne dans un processus Node unique (`server.ts` héberge
 * Next et Socket.io ensemble) : un compteur en mémoire voit donc réellement
 * toutes les requêtes, sans Redis ni table dédiée. Si le déploiement passe un
 * jour à plusieurs instances derrière un répartiteur, ce module est le seul
 * endroit à réécrire.
 *
 * Volontairement hors base : le but est d'arrêter un flot de requêtes *avant*
 * qu'il ne coûte quoi que ce soit. Compter les tentatives dans PostgreSQL
 * ferait de la protection elle-même le vecteur d'attaque — chaque essai
 * refusé provoquerait une écriture.
 */

export type RateLimitRule = {
  /** Nombre d'unités tolérées à l'intérieur de la fenêtre. */
  limit: number;
  /** Largeur de la fenêtre glissante, en millisecondes. */
  windowMs: number;
};

export type RateLimitVerdict = {
  ok: boolean;
  /** Attente avant que la clé redevienne utilisable ; 0 quand `ok` est vrai. */
  retryAfterMs: number;
};

/** Horodatages des unités consommées, par clé. Une unité = une entrée. */
const hits = new Map<string, number[]>();

const SWEEP_INTERVAL_MS = 60_000;
/**
 * Plafond du nombre de clés suivies. Une clé dérivée de `x-forwarded-for` est
 * sous contrôle du client quand l'application n'est pas derrière un proxy de
 * confiance : sans plafond, un attaquant ferait grossir la table indéfiniment
 * en changeant d'en-tête à chaque requête.
 */
const MAX_KEYS = 20_000;

let lastSweep = 0;

/** Retire les horodatages sortis de la fenêtre et les clés devenues vides. */
function sweep(now: number, windowMs: number): void {
  for (const [key, timestamps] of hits) {
    const kept = timestamps.filter((timestamp) => now - timestamp < windowMs);
    if (kept.length === 0) hits.delete(key);
    else hits.set(key, kept);
  }
}

/**
 * Ramène la table sous son plafond en supprimant les clés les moins récemment
 * actives. On ne jette jamais une clé « chaude » : la limitation reste donc
 * effective pour qui est réellement en train de marteler, même sous saturation.
 */
function evictOldest(): void {
  if (hits.size <= MAX_KEYS) return;
  const byRecency = [...hits.entries()].sort(
    (a, b) => (a[1][a[1].length - 1] ?? 0) - (b[1][b[1].length - 1] ?? 0),
  );
  const toDrop = hits.size - Math.floor(MAX_KEYS * 0.75);
  for (let i = 0; i < toDrop; i += 1) {
    hits.delete(byRecency[i][0]);
  }
}

function currentHits(key: string, now: number, windowMs: number): number[] {
  const timestamps = hits.get(key) ?? [];
  return timestamps.filter((timestamp) => now - timestamp < windowMs);
}

function verdict(timestamps: number[], rule: RateLimitRule, now: number): RateLimitVerdict {
  if (timestamps.length < rule.limit) return { ok: true, retryAfterMs: 0 };
  // La plus ancienne unité encore comptée libère une place en sortant de la
  // fenêtre : c'est elle qui détermine l'attente annoncée.
  const oldest = timestamps[0];
  return { ok: false, retryAfterMs: Math.max(0, rule.windowMs - (now - oldest)) };
}

/**
 * Consulte l'état d'une clé sans rien consommer. À utiliser avant une
 * opération coûteuse, pour la refuser sans la payer.
 */
export function peekRateLimit(key: string, rule: RateLimitRule): RateLimitVerdict {
  const now = Date.now();
  return verdict(currentHits(key, now, rule.windowMs), rule, now);
}

/**
 * Consomme `weight` unités sur une clé et retourne l'état *après* écriture.
 *
 * `weight` permet de facturer une opération à sa taille réelle — un envoi de
 * 5 Mo coûte plus qu'un envoi de 50 Ko — plutôt que de compter les requêtes
 * toutes égales.
 */
export function consumeRateLimit(key: string, rule: RateLimitRule, weight = 1): RateLimitVerdict {
  const now = Date.now();

  if (now - lastSweep > SWEEP_INTERVAL_MS) {
    sweep(now, rule.windowMs);
    lastSweep = now;
  }

  const timestamps = currentHits(key, now, rule.windowMs);
  for (let i = 0; i < weight; i += 1) timestamps.push(now);
  hits.set(key, timestamps);
  evictOldest();

  return verdict(timestamps, rule, now);
}

/**
 * La clé est-elle déjà suivie en mémoire ?
 *
 * Sert à décider s'il faut aller chercher la mémoire longue en base : une clé
 * connue du processus n'a rien à y gagner, et c'est ce qui permet à la `Map`
 * de rester le premier étage — elle absorbe les rafales sans une requête par
 * tentative.
 */
export function hasRateLimitKey(key: string): boolean {
  return hits.has(key);
}

/**
 * Réamorce une clé à partir d'horodatages retrouvés ailleurs (typiquement la
 * table `LoginAttempt`), pour que les compteurs survivent à un redémarrage.
 *
 * **Ne fait rien si la clé est déjà suivie** : le compteur en mémoire est
 * toujours plus à jour que ce qu'on relit, et l'écraser reviendrait à effacer
 * les tentatives de la minute écoulée. Retourne `true` si l'amorçage a eu
 * lieu.
 */
export function seedRateLimit(key: string, timestamps: number[], rule: RateLimitRule): boolean {
  if (hits.has(key)) return false;
  const now = Date.now();
  const kept = timestamps.filter((timestamp) => now - timestamp < rule.windowMs).sort((a, b) => a - b);
  if (kept.length === 0) return false;
  hits.set(key, kept);
  evictOldest();
  return true;
}

/**
 * Efface le compteur d'une clé. Appelé après une authentification réussie :
 * les échecs qui précèdent ne doivent pas pénaliser quelqu'un qui a fini par
 * retrouver son mot de passe.
 */
export function resetRateLimit(key: string): void {
  hits.delete(key);
}

/** Formate une attente en français, pour un message d'erreur affichable tel quel. */
export function formatRetryDelay(retryAfterMs: number): string {
  const seconds = Math.ceil(retryAfterMs / 1000);
  if (seconds < 60) return `${seconds} seconde${seconds > 1 ? "s" : ""}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}

/** Remise à zéro complète — réservée aux tests. */
export function __resetAllRateLimits(): void {
  hits.clear();
  lastSweep = 0;
}
