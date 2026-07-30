import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetAllRateLimits,
  consumeRateLimit,
  formatRetryDelay,
  hasRateLimitKey,
  peekRateLimit,
  resetRateLimit,
  seedRateLimit,
  type RateLimitRule,
} from "./rate-limit";

const RULE: RateLimitRule = { limit: 5, windowMs: 15 * 60 * 1000 };

beforeEach(() => {
  __resetAllRateLimits();
});

/**
 * Contrat tel qu'il est réellement utilisé : les appelants décident avec
 * `peekRateLimit()` *avant* de payer l'opération, et `consumeRateLimit()`
 * enregistre. Le verdict que renvoie `consumeRateLimit` est celui d'*après*
 * écriture — il refuse donc dès l'unité qui atteint la limite, ce qui n'est
 * pas la même chose que la décision d'admission.
 */
describe("consumeRateLimit", () => {
  it("tolère `limit` unités dans la fenêtre, et bloque la suivante", () => {
    for (let i = 0; i < RULE.limit; i += 1) {
      expect(peekRateLimit("agent@1.2.3.4", RULE).ok).toBe(true);
      consumeRateLimit("agent@1.2.3.4", RULE);
    }
    const refused = peekRateLimit("agent@1.2.3.4", RULE);
    expect(refused.ok).toBe(false);
    expect(refused.retryAfterMs).toBeGreaterThan(0);
    expect(refused.retryAfterMs).toBeLessThanOrEqual(RULE.windowMs);
  });

  it("compte chaque clé séparément", () => {
    for (let i = 0; i < RULE.limit; i += 1) consumeRateLimit("agent@1.2.3.4", RULE);
    expect(peekRateLimit("agent@1.2.3.4", RULE).ok).toBe(false);
    // Verrouiller un identifiant ne doit pas verrouiller les autres : sinon
    // n'importe qui bloquerait le compte d'un agent en cinq essais.
    expect(peekRateLimit("agent@5.6.7.8", RULE).ok).toBe(true);
    expect(peekRateLimit("autre@1.2.3.4", RULE).ok).toBe(true);
  });

  it("facture une opération à son poids, pour les envois au mégaoctet", () => {
    const quota: RateLimitRule = { limit: 10, windowMs: 60_000 };
    consumeRateLimit("uploads@1.2.3.4", quota, 4);
    expect(peekRateLimit("uploads@1.2.3.4", quota).ok).toBe(true);
    consumeRateLimit("uploads@1.2.3.4", quota, 5);
    expect(peekRateLimit("uploads@1.2.3.4", quota).ok).toBe(true);
    // 4 + 5 + 2 dépasse les 10 unités tolérées.
    consumeRateLimit("uploads@1.2.3.4", quota, 2);
    expect(peekRateLimit("uploads@1.2.3.4", quota).ok).toBe(false);
  });
});

describe("peekRateLimit", () => {
  it("consulte sans rien consommer", () => {
    for (let i = 0; i < RULE.limit; i += 1) {
      expect(peekRateLimit("agent@1.2.3.4", RULE).ok).toBe(true);
    }
    expect(consumeRateLimit("agent@1.2.3.4", RULE).ok).toBe(true);
  });

  it("annonce le refus avant de payer l'opération", () => {
    for (let i = 0; i < RULE.limit; i += 1) consumeRateLimit("agent@1.2.3.4", RULE);
    expect(peekRateLimit("agent@1.2.3.4", RULE).ok).toBe(false);
  });
});

describe("resetRateLimit", () => {
  it("efface le compteur : les échecs ne pénalisent pas qui finit par réussir", () => {
    for (let i = 0; i < RULE.limit; i += 1) consumeRateLimit("agent@1.2.3.4", RULE);
    expect(peekRateLimit("agent@1.2.3.4", RULE).ok).toBe(false);

    resetRateLimit("agent@1.2.3.4");
    expect(peekRateLimit("agent@1.2.3.4", RULE).ok).toBe(true);
  });
});

/**
 * Second étage : la base sert de mémoire longue et réamorce un compteur que
 * le processus ne connaît pas encore. Sans cela, redémarrer le serveur rendait
 * ses cinq tentatives à qui venait de les épuiser.
 */
describe("seedRateLimit", () => {
  it("réamorce une clé inconnue avec des échecs retrouvés ailleurs", () => {
    expect(hasRateLimitKey("agent@1.2.3.4")).toBe(false);
    const now = Date.now();
    const seeded = seedRateLimit(
      "agent@1.2.3.4",
      Array.from({ length: RULE.limit }, (_, i) => now - i * 1000),
      RULE,
    );
    expect(seeded).toBe(true);
    expect(peekRateLimit("agent@1.2.3.4", RULE).ok).toBe(false);
  });

  it("ne touche pas une clé déjà suivie : la mémoire est plus à jour que la base", () => {
    consumeRateLimit("agent@1.2.3.4", RULE);
    const seeded = seedRateLimit("agent@1.2.3.4", [Date.now(), Date.now()], RULE);
    expect(seeded).toBe(false);
    // Une seule unité consommée, pas trois : l'amorçage n'a rien ajouté.
    for (let i = 1; i < RULE.limit; i += 1) {
      expect(peekRateLimit("agent@1.2.3.4", RULE).ok).toBe(true);
      consumeRateLimit("agent@1.2.3.4", RULE);
    }
    expect(peekRateLimit("agent@1.2.3.4", RULE).ok).toBe(false);
  });

  it("ignore les horodatages sortis de la fenêtre", () => {
    const old = Date.now() - RULE.windowMs - 1000;
    expect(seedRateLimit("agent@1.2.3.4", [old, old, old, old, old, old], RULE)).toBe(false);
    expect(peekRateLimit("agent@1.2.3.4", RULE).ok).toBe(true);
  });

  it("n'amorce rien quand il n'y a aucun échec à reprendre", () => {
    expect(seedRateLimit("agent@1.2.3.4", [], RULE)).toBe(false);
    expect(hasRateLimitKey("agent@1.2.3.4")).toBe(false);
  });
});

describe("hasRateLimitKey", () => {
  it("dit si le processus suit déjà la clé, pour éviter une requête inutile", () => {
    expect(hasRateLimitKey("agent@1.2.3.4")).toBe(false);
    consumeRateLimit("agent@1.2.3.4", RULE);
    expect(hasRateLimitKey("agent@1.2.3.4")).toBe(true);
    resetRateLimit("agent@1.2.3.4");
    expect(hasRateLimitKey("agent@1.2.3.4")).toBe(false);
  });
});

describe("formatRetryDelay", () => {
  it("formate une attente affichable telle quelle", () => {
    expect(formatRetryDelay(1_000)).toBe("1 seconde");
    expect(formatRetryDelay(30_000)).toBe("30 secondes");
    expect(formatRetryDelay(60_000)).toBe("1 minute");
    expect(formatRetryDelay(9 * 60_000)).toBe("9 minutes");
  });
});
