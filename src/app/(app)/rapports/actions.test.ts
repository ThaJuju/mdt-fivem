import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Les lignes rattachées à un rapport ne se suppriment jamais par leur seul
 * identifiant.
 *
 * `assertCanEditReport()` autorise sur le `reportId` que le formulaire
 * annonce, et l'identifiant de la ligne vient du même formulaire. Tant que la
 * requête ne bornait pas la suppression au rapport autorisé, il suffisait
 * d'annoncer son propre brouillon et de désigner la charge, la personne
 * impliquée, l'agent ou la pièce jointe d'un rapport quelconque — validé
 * compris — pour l'effacer. C'est l'invariant qu'une simplification innocente
 * casse : ces tests échouent si le `reportId` disparaît de la clause.
 */

type DeleteManyArgs = { where: Record<string, unknown> };

const deleteManyCalls: Record<string, DeleteManyArgs[]> = {};
const findFirstCalls: Record<string, DeleteManyArgs[]> = {};

/** Nombre de lignes que `deleteMany` prétend avoir supprimées. */
let deleteManyCount = 1;
/** Ce que `findFirst` renvoie : `null` simule une ligne d'un autre rapport. */
let findFirstResult: Record<string, unknown> | null = { isPaid: false };

function model(name: string) {
  return {
    deleteMany: vi.fn(async (args: DeleteManyArgs) => {
      (deleteManyCalls[name] ??= []).push(args);
      return { count: deleteManyCount };
    }),
    findFirst: vi.fn(async (args: DeleteManyArgs) => {
      (findFirstCalls[name] ??= []).push(args);
      return findFirstResult;
    }),
    update: vi.fn(async () => ({})),
  };
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    reportInvolvement: model("reportInvolvement"),
    reportOfficer: model("reportOfficer"),
    reportVehicle: model("reportVehicle"),
    evidence: model("evidence"),
    charge: model("charge"),
  },
}));

vi.mock("@/lib/auth", () => ({
  requireActor: async () => ({ id: "actor-1", isSuperAdmin: false }),
  assertCan: () => {},
  can: () => true,
}));

// L'autorisation est accordée : c'est précisément la situation où le défaut
// jouait — un acteur légitime sur *un* rapport, agissant sur un autre.
vi.mock("@/lib/reports", () => ({
  assertCanEditReport: async () => ({ authorId: "actor-1", status: "DRAFT", type: "ARREST" }),
}));

vi.mock("@/lib/audit", () => ({ audit: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({ redirect: () => {} }));

const {
  removeInvolvement,
  removeOfficer,
  removeReportVehicle,
  removeEvidence,
  removeCharge,
  updateCharge,
} = await import("./actions");

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

beforeEach(() => {
  for (const key of Object.keys(deleteManyCalls)) delete deleteManyCalls[key];
  for (const key of Object.keys(findFirstCalls)) delete findFirstCalls[key];
  deleteManyCount = 1;
  findFirstResult = { isPaid: false };
});

describe("suppression d'une ligne rattachée à un rapport", () => {
  const cases = [
    ["removeInvolvement", removeInvolvement, "involvementId", "reportInvolvement"],
    ["removeOfficer", removeOfficer, "officerId", "reportOfficer"],
    ["removeReportVehicle", removeReportVehicle, "reportVehicleId", "reportVehicle"],
    ["removeEvidence", removeEvidence, "evidenceId", "evidence"],
  ] as const;

  for (const [label, action, idField, modelName] of cases) {
    it(`${label} borne la suppression au rapport autorisé`, async () => {
      await action({}, form({ reportId: "report-mine", [idField]: "child-of-other-report" }));
      expect(deleteManyCalls[modelName]).toHaveLength(1);
      expect(deleteManyCalls[modelName][0].where).toEqual({
        id: "child-of-other-report",
        reportId: "report-mine",
      });
    });

    it(`${label} refuse une ligne qui n'appartient pas au rapport`, async () => {
      deleteManyCount = 0;
      const state = await action({}, form({ reportId: "report-mine", [idField]: "child-elsewhere" }));
      expect(state.error).toBeTruthy();
    });
  }
});

describe("charges", () => {
  it("removeCharge relit la charge dans le rapport autorisé", async () => {
    await removeCharge({}, form({ reportId: "report-mine", chargeId: "charge-elsewhere" }));
    expect(findFirstCalls.charge[0].where).toMatchObject({
      id: "charge-elsewhere",
      reportId: "report-mine",
    });
  });

  it("removeCharge refuse une charge d'un autre rapport", async () => {
    findFirstResult = null;
    const state = await removeCharge({}, form({ reportId: "report-mine", chargeId: "charge-elsewhere" }));
    expect(state.error).toBeTruthy();
    expect(deleteManyCalls.charge).toBeUndefined();
  });

  it("removeCharge laisse une amende encaissée en place", async () => {
    findFirstResult = { isPaid: true };
    const state = await removeCharge({}, form({ reportId: "report-mine", chargeId: "charge-paid" }));
    expect(state.error).toContain("encaissée");
    expect(deleteManyCalls.charge).toBeUndefined();
  });

  it("updateCharge refuse une charge d'un autre rapport", async () => {
    findFirstResult = null;
    const state = await updateCharge(
      {},
      form({
        reportId: "report-mine",
        id: "charge-elsewhere",
        fine: "0",
        jailMinutes: "0",
        points: "0",
        count: "1",
      }),
    );
    expect(state.error).toBeTruthy();
  });
});
