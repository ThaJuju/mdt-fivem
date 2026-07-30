import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `clientIp()` lit les en-têtes via `next/headers`, qui n'existe pas hors
 * d'une requête : on le remplace par une table d'en-têtes qu'on pilote depuis
 * chaque test.
 */
const currentHeaders = new Map<string, string>();

vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (name: string) => currentHeaders.get(name.toLowerCase()) ?? null,
  }),
}));

const { clientIp, clientIpKey, isSecureRequest } = await import("./client-ip");

function setHeaders(values: Record<string, string>) {
  currentHeaders.clear();
  for (const [name, value] of Object.entries(values)) currentHeaders.set(name.toLowerCase(), value);
}

const originalHops = process.env.TRUSTED_PROXY_HOPS;
const originalSecure = process.env.SESSION_COOKIE_SECURE;

beforeEach(() => {
  currentHeaders.clear();
  delete process.env.TRUSTED_PROXY_HOPS;
  delete process.env.SESSION_COOKIE_SECURE;
});

afterEach(() => {
  if (originalHops === undefined) delete process.env.TRUSTED_PROXY_HOPS;
  else process.env.TRUSTED_PROXY_HOPS = originalHops;
  if (originalSecure === undefined) delete process.env.SESSION_COOKIE_SECURE;
  else process.env.SESSION_COOKIE_SECURE = originalSecure;
});

describe("clientIp", () => {
  /**
   * Le test qui compte : nginx **ajoute** son entrée à la fin de ce que le
   * client a envoyé. Lire `[0]` reviendrait à indexer la limitation de débit
   * et le journal d'audit sur une valeur choisie par l'attaquant.
   */
  it("retient la dernière entrée de x-forwarded-for, pas la première", async () => {
    setHeaders({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" });
    expect(await clientIp()).toBe("203.0.113.7");
  });

  it("ignore une chaîne forgée par le client quand un seul proxy est déclaré", async () => {
    setHeaders({ "x-forwarded-for": "9.9.9.9, 8.8.8.8, 203.0.113.7" });
    expect(await clientIp()).toBe("203.0.113.7");
  });

  it("compte les entrées depuis la droite selon TRUSTED_PROXY_HOPS", async () => {
    process.env.TRUSTED_PROXY_HOPS = "2";
    setHeaders({ "x-forwarded-for": "1.2.3.4, 198.51.100.5, 203.0.113.7" });
    expect(await clientIp()).toBe("198.51.100.5");
  });

  it("renvoie null quand la chaîne est plus courte que le nombre de proxys déclarés", async () => {
    process.env.TRUSTED_PROXY_HOPS = "3";
    setHeaders({ "x-forwarded-for": "203.0.113.7" });
    expect(await clientIp()).toBeNull();
  });

  it("tolère les espaces et les entrées vides", async () => {
    setHeaders({ "x-forwarded-for": " 1.2.3.4 ,, 203.0.113.7 " });
    expect(await clientIp()).toBe("203.0.113.7");
  });

  it("retombe sur x-real-ip quand x-forwarded-for est absent", async () => {
    setHeaders({ "x-real-ip": "203.0.113.7" });
    expect(await clientIp()).toBe("203.0.113.7");
  });

  it("renvoie null sans aucun en-tête de proxy", async () => {
    setHeaders({});
    expect(await clientIp()).toBeNull();
  });

  it("donne une clé de limitation utilisable même sans adresse", async () => {
    setHeaders({});
    expect(await clientIpKey()).toBe("inconnue");
  });
});

describe("isSecureRequest", () => {
  it("est faux sans x-forwarded-proto : en HTTP clair le cookie Secure serait refusé", async () => {
    setHeaders({});
    expect(await isSecureRequest()).toBe(false);
  });

  it("est vrai quand le proxy annonce https", async () => {
    setHeaders({ "x-forwarded-proto": "https" });
    expect(await isSecureRequest()).toBe(true);
  });

  it("lit la dernière entrée si un intermédiaire concatène", async () => {
    setHeaders({ "x-forwarded-proto": "http, https" });
    expect(await isSecureRequest()).toBe(true);
  });

  it("se laisse forcer par SESSION_COOKIE_SECURE", async () => {
    setHeaders({ "x-forwarded-proto": "http" });
    process.env.SESSION_COOKIE_SECURE = "true";
    expect(await isSecureRequest()).toBe(true);

    setHeaders({ "x-forwarded-proto": "https" });
    process.env.SESSION_COOKIE_SECURE = "false";
    expect(await isSecureRequest()).toBe(false);
  });
});
