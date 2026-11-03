import { describe, expect, it } from "vitest";
import { calculateEvolution, checkConsistency, prorateMonthlyValue } from "./statistics";

describe("statistiques", () => {
  it("calcule une hausse", () => expect(calculateEvolution(150, 100)).toBe(50));
  it("laisse l'évolution indisponible avec une base nulle", () => expect(calculateEvolution(12, 0)).toBeNull());
  it("détecte un total cohérent", () => expect(checkConsistency([{ date: "2026-09-01", value: 4 }, { date: "2026-09-02", value: 6 }], 10)).toEqual({ status: "consistent", dailySum: 10 }));
  it("ne transforme pas une journée absente en zéro", () => expect(checkConsistency([{ date: "2026-09-01", value: null }], 0)).toEqual({ status: "unavailable", dailySum: null }));
});

describe("prorata mensuel", () => {
  it("estime le mois complet", () => expect(prorateMonthlyValue(160, 16, 31)).toBe(310));
  it("conserve une donnee indisponible", () => expect(prorateMonthlyValue(null, 16, 31)).toBeNull());
});
