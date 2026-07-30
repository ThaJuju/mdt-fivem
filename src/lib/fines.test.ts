import { describe, expect, it } from "vitest";
import { fineAmount, sumFineAmounts } from "./fines";

describe("fineAmount", () => {
  it("multiplie le barème unitaire par le nombre d'occurrences", () => {
    expect(fineAmount({ fine: 750, count: 3 })).toBe(2250);
  });

  it("additionne les montants réels et pas seulement les barèmes", () => {
    expect(sumFineAmounts([{ fine: 100, count: 2 }, { fine: 450, count: 1 }])).toBe(650);
  });
});
