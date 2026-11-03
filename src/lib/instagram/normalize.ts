import type { InstagramMetric } from "@/lib/reporting/types";

type InsightsPayload = { data?: Array<{ name?: string; total_value?: { value?: unknown } }> };

export function normalizeTotal(payload: InsightsPayload, metric: InstagramMetric): number | null {
  const item = payload.data?.find((entry) => entry.name === metric);
  const value = item?.total_value?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeFollowerAdds(payload: InsightsPayload): number | null {
  const item = payload.data?.find((entry) => entry.name === "follows_and_unfollows");
  const totalValue = item?.total_value as { breakdowns?: Array<{ dimension_keys?: string[]; results?: Array<{ dimension_values?: string[]; value?: unknown }> }> } | undefined;
  const result = totalValue?.breakdowns?.flatMap((breakdown) => breakdown.results ?? []).find((entry) => entry.dimension_values?.includes("FOLLOWER"));
  return typeof result?.value === "number" && Number.isFinite(result.value) ? result.value : null;
}
