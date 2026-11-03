import type { DailyView } from "./types";

export function calculateEvolution(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function checkConsistency(daily: DailyView[], total: number | null) {
  if (total === null || daily.some((item) => item.value === null)) {
    return { status: "unavailable" as const, dailySum: null };
  }
  const dailySum = daily.reduce((sum, item) => sum + (item.value ?? 0), 0);
  return { status: dailySum === total ? "consistent" as const : "mismatch" as const, dailySum };
}

export function prorateMonthlyValue(value: number | null, coveredDays: number, totalDays: number): number | null {
  if (value === null || coveredDays <= 0 || totalDays < coveredDays) return null;
  return Math.round((value / coveredDays) * totalDays);
}
