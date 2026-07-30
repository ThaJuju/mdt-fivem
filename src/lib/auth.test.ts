import { describe, expect, it, vi } from "vitest";
import type { Actor, ActorMembership } from "./auth";

// `auth.ts` tire tout le contexte d'une requête Next et le client Prisma :
// `can()` et `assertCan()` sont pourtant purs. On neutralise le reste.
vi.mock("next/headers", () => ({ cookies: async () => null, headers: async () => null }));
vi.mock("next/navigation", () => ({ redirect: () => undefined }));
vi.mock("./prisma", () => ({ prisma: {} }));

const { can, assertCan } = await import("./auth");
const { ActionError } = await import("./errors");

function membership(overrides: Partial<ActorMembership> = {}): ActorMembership {
  return {
    id: "m1",
    departmentId: "d1",
    departmentName: "Los Santos Police Department",
    departmentShortName: "LSPD",
    departmentColor: "#1D4ED8",
    departmentType: "POLICE",
    gradeId: "g1",
    gradeName: "Officer",
    gradeLevel: 1,
    badgeNumber: "1234",
    callsign: null,
    isPrimary: true,
    status: "ACTIVE",
    ...overrides,
  };
}

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    id: "u1",
    username: "agent",
    firstName: "Jean",
    lastName: "Dupont",
    isSuperAdmin: false,
    mustChangePassword: false,
    permissions: new Set<string>(),
    memberships: [membership()],
    ...overrides,
  };
}

describe("can", () => {
  it("refuse un acteur absent", () => {
    expect(can(null, "citizens.view")).toBe(false);
  });

  it("accorde tout à un super-admin, y compris sans adhésion", () => {
    const superAdmin = actor({ isSuperAdmin: true, memberships: [], permissions: new Set() });
    expect(can(superAdmin, "citizens.view")).toBe(true);
    expect(can(superAdmin, "medical.edit")).toBe(true);
    expect(can(superAdmin, "admin.audit.view")).toBe(true);
  });

  it("accorde une permission détenue par le grade", () => {
    expect(can(actor({ permissions: new Set(["citizens.view"]) }), "citizens.view")).toBe(true);
  });

  it("refuse une permission non détenue", () => {
    expect(can(actor({ permissions: new Set(["citizens.view"]) }), "citizens.edit")).toBe(false);
  });
});

describe("cloisonnement par service", () => {
  it("refuse un domaine réservé à la police à un acteur EMS", () => {
    const medic = actor({
      permissions: new Set(["citizens.view"]),
      memberships: [membership({ departmentType: "EMS", departmentShortName: "EMS" })],
    });
    // La permission est bien détenue : c'est le service qui la neutralise.
    expect(medic.permissions.has("citizens.view")).toBe(true);
    expect(can(medic, "citizens.view")).toBe(false);
  });

  it("refuse le domaine médical à un acteur police", () => {
    const officer = actor({ permissions: new Set(["medical.view"]) });
    expect(can(officer, "medical.view")).toBe(false);
  });

  it("laisse passer un domaine non cloisonné", () => {
    const medic = actor({
      permissions: new Set(["reports.create"]),
      memberships: [membership({ departmentType: "EMS" })],
    });
    expect(can(medic, "reports.create")).toBe(true);
  });

  it("refuse tout domaine cloisonné à un acteur sans adhésion active", () => {
    const suspended = actor({
      permissions: new Set(["citizens.view", "reports.create"]),
      memberships: [membership({ status: "SUSPENDED" })],
    });
    expect(can(suspended, "citizens.view")).toBe(false);
    // Un domaine ouvert reste accessible : le cloisonnement ne porte que sur
    // les domaines qui le déclarent.
    expect(can(suspended, "reports.create")).toBe(true);
  });
});

describe("une seule adhésion à la fois", () => {
  /**
   * Règle non négociable : les permissions effectives sont celles d'**une**
   * adhésion — la principale si elle est active. Un agent affecté à deux
   * services n'additionne jamais leurs droits, il exerce avec la casquette
   * qu'il porte.
   */
  it("cloisonne selon l'adhésion principale, pas selon l'union des adhésions", () => {
    const double = actor({
      permissions: new Set(["citizens.view", "medical.view"]),
      memberships: [
        membership({ id: "m1", departmentType: "POLICE", isPrimary: true }),
        membership({ id: "m2", departmentType: "EMS", isPrimary: false }),
      ],
    });
    expect(can(double, "citizens.view")).toBe(true);
    expect(can(double, "medical.view")).toBe(false);
  });

  it("retombe sur la première adhésion active quand la principale ne l'est pas", () => {
    const double = actor({
      permissions: new Set(["citizens.view", "medical.view"]),
      memberships: [
        membership({ id: "m1", departmentType: "POLICE", isPrimary: true, status: "SUSPENDED" }),
        membership({ id: "m2", departmentType: "EMS", isPrimary: false, status: "ACTIVE" }),
      ],
    });
    expect(can(double, "medical.view")).toBe(true);
    expect(can(double, "citizens.view")).toBe(false);
  });
});

describe("assertCan", () => {
  it("passe silencieusement quand la permission est détenue", () => {
    expect(() => assertCan(actor({ permissions: new Set(["citizens.view"]) }), "citizens.view")).not.toThrow();
  });

  it("lève une ActionError lisible quand elle manque", () => {
    expect(() => assertCan(actor(), "citizens.view")).toThrow(ActionError);
  });

  it("lève une ActionError distincte pour un acteur absent", () => {
    expect(() => assertCan(null, "citizens.view")).toThrow(/connecté/);
  });
});
