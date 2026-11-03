import { describe, expect, it } from "vitest";
import { daysInclusive, formatDayMonth, formatPeriodLabel, listDays, previousPeriod, validateInsightsPeriod } from "./dates";

describe("périodes", () => {
  it("compte les bornes inclusivement", () => expect(daysInclusive("2026-09-01", "2026-09-07")).toBe(7));
  it("produit chaque journée sans dépendre du fuseau local", () => expect(listDays("2026-09-29", "2026-10-01")).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]));
  it("calcule la période précédente de même durée", () => expect(previousPeriod("2026-09-08", "2026-09-14")).toEqual({ start: "2026-09-01", end: "2026-09-07" }));
  it("rejette une comparaison hors rétention", () => expect(() => validateInsightsPeriod("2026-08-01", "2026-09-20", "2026-10-09")).toThrow(/90 jours/));
});

describe("formatPeriodLabel", () => {
  it("formate une date sans l'annee", () => {
    expect(formatDayMonth("2026-09-30")).toBe("30 septembre");
  });
  it("affiche le mois et l'annee pour une periode dans un meme mois", () => {
    expect(formatPeriodLabel("2026-09-01", "2026-09-30")).toBe("Septembre 2026");
  });

  it("affiche les dates pour une periode sur deux mois", () => {
    expect(formatPeriodLabel("2026-08-28", "2026-09-03")).toBe("Du 28 août 2026 au 3 septembre 2026");
  });
});
