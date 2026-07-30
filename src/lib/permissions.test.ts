import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSIONS,
  PERMISSIONS_CATALOG,
  domainAllowsDepartment,
  isValidPermission,
  permissionLabel,
} from "./permissions";

/**
 * Permissions attribuables depuis le panel admin mais qu'aucun contrôle
 * n'exerce encore : elles se cochent, elles n'ouvrent rien.
 *
 * Toute entrée ici est une promesse faite à l'administrateur et non tenue.
 * La liste est vide, et doit le rester : ajouter une permission au catalogue
 * sans jamais l'appeler fait échouer la suite. C'est exactement la dérive
 * qu'avait connue `citizens.delete` — déclarée, cochable, sans aucun effet.
 */
const KNOWN_UNWIRED: string[] = [];

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.tsx?$/.test(full) && !full.endsWith(".test.ts")) found.push(full);
  }
  return found;
}

/** Tout `src/`, sauf le catalogue lui-même : s'y citer ne compte pas. */
const sources = sourceFiles(path.join(import.meta.dirname, ".."))
  .filter((file) => !file.endsWith(path.join("lib", "permissions.ts")))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

describe("catalogue des permissions", () => {
  it("ne déclare aucun doublon", () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });

  it("nomme chaque permission `domaine.action`", () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(permission).toMatch(/^[a-z_]+\.[a-z_]+(\.[a-z_]+)?$/);
    }
  });

  it("donne un libellé français à chaque permission", () => {
    for (const permission of ALL_PERMISSIONS) {
      const label = permissionLabel(permission);
      expect(label).not.toBe(permission);
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("valide ce qu'il déclare, et rien d'autre", () => {
    for (const permission of ALL_PERMISSIONS) expect(isValidPermission(permission)).toBe(true);
    expect(isValidPermission("citizens.inventer")).toBe(false);
    expect(isValidPermission("inconnu.view")).toBe(false);
    expect(isValidPermission("")).toBe(false);
  });

  /**
   * C'est le test qui aurait attrapé `citizens.delete` le jour où elle a été
   * déclarée : une permission qu'aucun `can()`, `assertCan()` ou
   * `requirePagePermission()` ne cite ne protège rien.
   */
  it("n'ajoute pas de permission que personne n'exerce", () => {
    const unwired = ALL_PERMISSIONS.filter((permission) => !sources.includes(`"${permission}"`));
    expect(unwired.sort()).toEqual([...KNOWN_UNWIRED].sort());
  });
});

describe("cloisonnement déclaré dans le catalogue", () => {
  it("réserve les domaines police aux services POLICE", () => {
    for (const domain of ["citizens", "vehicles", "weapons", "penalcode", "warrants", "bolos", "charges"]) {
      expect(domainAllowsDepartment(domain, "POLICE")).toBe(true);
      expect(domainAllowsDepartment(domain, "EMS")).toBe(false);
      expect(domainAllowsDepartment(domain, "DOJ")).toBe(false);
    }
  });

  it("réserve le domaine médical à l'EMS", () => {
    expect(domainAllowsDepartment("medical", "EMS")).toBe(true);
    expect(domainAllowsDepartment("medical", "POLICE")).toBe(false);
  });

  it("laisse ouverts les domaines sans restriction", () => {
    for (const domain of ["reports", "dispatch", "hr", "admin"]) {
      expect(domainAllowsDepartment(domain, "POLICE")).toBe(true);
      expect(domainAllowsDepartment(domain, "EMS")).toBe(true);
      expect(domainAllowsDepartment(domain, undefined)).toBe(true);
    }
  });

  it("refuse tout domaine cloisonné à un acteur sans service", () => {
    const restricted = PERMISSIONS_CATALOG.filter((domain) => domain.restrictedTo);
    expect(restricted.length).toBeGreaterThan(0);
    for (const domain of restricted) {
      expect(domainAllowsDepartment(domain.key, undefined)).toBe(false);
    }
  });

  it("ignore un domaine inconnu plutôt que de l'ouvrir par défaut", () => {
    // Un domaine non déclaré n'est pas cloisonné : c'est `can()` qui refusera,
    // faute de permission correspondante.
    expect(domainAllowsDepartment("inconnu", "POLICE")).toBe(true);
  });
});
