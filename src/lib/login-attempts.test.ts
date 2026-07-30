import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetAllRateLimits,
  consumeRateLimit,
  peekRateLimit,
  type RateLimitRule,
} from "./rate-limit";

const findMany = vi.fn();
const create = vi.fn();
vi.mock("./prisma", () => ({ prisma: { loginAttempt: { findMany, create } } }));

const { hydrateLoginCounters, recordLoginAttempt } = await import("./login-attempts");

const PAIR: RateLimitRule = { limit: 5, windowMs: 15 * 60 * 1000 };
const PER_IP: RateLimitRule = { limit: 20, windowMs: 15 * 60 * 1000 };
const PER_USER: RateLimitRule = { limit: 30, windowMs: 15 * 60 * 1000 };

const IDENTIFIER = "jdupont";
const IP = "203.0.113.7";
const PAIR_KEY = `login:pair:${IDENTIFIER}:${IP}`;
const IP_KEY = `login:ip:${IP}`;
const USER_KEY = `login:user:${IDENTIFIER}`;

const counters = [
  [PAIR_KEY, PAIR],
  [IP_KEY, PER_IP],
  [USER_KEY, PER_USER],
] as const;

function attempt(overrides: Partial<{ identifier: string; ip: string | null; succeeded: boolean; ago: number }> = {}) {
  const { identifier = IDENTIFIER, ip = IP, succeeded = false, ago = 60_000 } = overrides;
  return { identifier, ip, succeeded, createdAt: new Date(Date.now() - ago) };
}

beforeEach(() => {
  __resetAllRateLimits();
  findMany.mockReset();
  create.mockReset();
});

describe("hydrateLoginCounters", () => {
  it("reconstitue le compteur du couple identifiant+adresse après un redémarrage", async () => {
    findMany.mockResolvedValue(
      Array.from({ length: PAIR.limit }, (_, i) => attempt({ ago: (i + 1) * 1000 })),
    );

    expect(peekRateLimit(PAIR_KEY, PAIR).ok).toBe(true);
    await hydrateLoginCounters(counters, { identifier: IDENTIFIER, ip: IP });
    expect(peekRateLimit(PAIR_KEY, PAIR).ok).toBe(false);
  });

  /**
   * L'invariant qui compte : un succès remet tout à zéro, en base comme en
   * mémoire. Sans lui, un agent qui a fini par retrouver son mot de passe
   * serait puni de ses tâtonnements au prochain redémarrage.
   */
  it("ignore les échecs antérieurs à la dernière connexion réussie", async () => {
    findMany.mockResolvedValue([
      ...Array.from({ length: PAIR.limit }, (_, i) => attempt({ ago: 600_000 - i * 1000 })),
      attempt({ succeeded: true, ago: 300_000 }),
      attempt({ ago: 60_000 }),
    ]);

    await hydrateLoginCounters(counters, { identifier: IDENTIFIER, ip: IP });
    // Un seul échec reste comptable : il reste de la marge.
    expect(peekRateLimit(PAIR_KEY, PAIR).ok).toBe(true);
    for (let i = 1; i < PAIR.limit; i += 1) consumeRateLimit(PAIR_KEY, PAIR);
    expect(peekRateLimit(PAIR_KEY, PAIR).ok).toBe(false);
  });

  it("répartit les tentatives entre les trois compteurs", async () => {
    findMany.mockResolvedValue([
      // Même identifiant, autre adresse : compte pour l'identifiant seul.
      ...Array.from({ length: 6 }, () => attempt({ ip: "198.51.100.5" })),
      // Même adresse, autre identifiant : compte pour l'adresse seule.
      ...Array.from({ length: 6 }, () => attempt({ identifier: "autre" })),
    ]);

    await hydrateLoginCounters(counters, { identifier: IDENTIFIER, ip: IP });

    // Aucune tentative sur le couple exact : son compteur reste vierge.
    expect(peekRateLimit(PAIR_KEY, PAIR).ok).toBe(true);
    for (let i = 0; i < PAIR.limit; i += 1) consumeRateLimit(PAIR_KEY, PAIR);
    expect(peekRateLimit(PAIR_KEY, PAIR).ok).toBe(false);
  });

  it("ne consulte pas la base quand les trois clés sont déjà suivies", async () => {
    for (const [key, rule] of counters) consumeRateLimit(key, rule);
    await hydrateLoginCounters(counters, { identifier: IDENTIFIER, ip: IP });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("ne cherche pas par adresse quand elle est inconnue", async () => {
    findMany.mockResolvedValue([]);
    await hydrateLoginCounters(counters, { identifier: IDENTIFIER, ip: null });
    const where = findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([{ identifier: IDENTIFIER }]);
  });

  /**
   * Une panne de base ne doit pas verrouiller tout le monde : on retombe sur
   * le compteur mémoire, qui reste la protection utile.
   */
  it("laisse passer si la base est indisponible", async () => {
    findMany.mockRejectedValue(new Error("base injoignable"));
    await expect(hydrateLoginCounters(counters, { identifier: IDENTIFIER, ip: IP })).resolves.toBeUndefined();
    expect(peekRateLimit(PAIR_KEY, PAIR).ok).toBe(true);
  });
});

describe("recordLoginAttempt", () => {
  it("enregistre l'identifiant, l'adresse et l'issue", async () => {
    create.mockResolvedValue({});
    await recordLoginAttempt({ identifier: IDENTIFIER, ip: IP, succeeded: false });
    expect(create).toHaveBeenCalledWith({ data: { identifier: IDENTIFIER, ip: IP, succeeded: false } });
  });

  it("n'empêche jamais de se connecter si l'écriture échoue", async () => {
    create.mockRejectedValue(new Error("base injoignable"));
    await expect(
      recordLoginAttempt({ identifier: IDENTIFIER, ip: IP, succeeded: true }),
    ).resolves.toBeUndefined();
  });
});
