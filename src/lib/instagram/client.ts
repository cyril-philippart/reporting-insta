import { addDays, daysInclusive, formatDate, listDays, previousPeriod } from "@/lib/reporting/dates";
import { readMonthlyHistory, saveMonthlyHistory, type HistoryRow } from "@/lib/history/store";
import { calculateEvolution, checkConsistency, prorateMonthlyValue } from "@/lib/reporting/statistics";
import type { DailyView, InstagramMetric, MetricData, MonthlyMetric, ReportData, TopContent } from "@/lib/reporting/types";
import { normalizeFollowerAdds, normalizeTotal } from "./normalize";
import { AsyncLocalStorage } from "node:async_hooks";
import { getAccountToken } from "@/lib/accounts/store";

const GRAPH_URL = "https://graph.instagram.com";
const API_VERSION = process.env.INSTAGRAM_API_VERSION ?? "v25.0";
const tokenContext = new AsyncLocalStorage<string>();

export class InstagramApiError extends Error {
  constructor(public readonly status = 502, message = "Instagram n’a pas pu fournir les statistiques demandées.") {
    super(message);
  }
}

type MetaErrorPayload = {
  error?: { code?: number; message?: string; type?: string };
};

function toSafeApiError(status: number, payload: MetaErrorPayload): InstagramApiError {
  const metaError = payload.error;
  if (metaError?.code === 200 && metaError.message === "API access blocked.") {
    return new InstagramApiError(403, "Meta bloque actuellement l’accès API. Vérifiez l’état de l’application, les autorisations du token et les éventuelles alertes de sécurité Meta.");
  }
  if (metaError?.code === 190 || status === 401) {
    return new InstagramApiError(401, "Le token Instagram est invalide ou expiré. Générez un nouveau token avec les autorisations Insights.");
  }
  if (status === 429) {
    return new InstagramApiError(429, "La limite de requêtes Instagram est atteinte. Réessayez dans quelques minutes.");
  }
  return new InstagramApiError(502);
}

function getToken() {
  const token = tokenContext.getStore() ?? process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new InstagramApiError(503);
  return token;
}

async function graphRequest<T>(path: string, params: Record<string, string>, attempts = 2): Promise<T> {
  const url = new URL(`${GRAPH_URL}/${API_VERSION}${path}`);
  Object.entries({ ...params, access_token: getToken() }).forEach(([key, value]) => url.searchParams.set(key, value));
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (response.ok) return response.json() as Promise<T>;
    const payload = await response.json().catch(() => ({})) as MetaErrorPayload;
    if ((response.status === 429 || response.status >= 500) && attempt + 1 < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      continue;
    }
    throw toSafeApiError(response.status, payload);
  }
  throw new InstagramApiError();
}

const SCALAR_METRICS = ["views", "reach", "total_interactions", "profile_views", "website_clicks"] as const;
const METRIC_NAMES: InstagramMetric[] = [...SCALAR_METRICS, "follows"];
const HISTORY_START_MONTH = "2026-07";

async function getTotals(start: string, end: string) {
  const params = { period: "day", metric_type: "total_value", since: start, until: addDays(end, 1) };
  const payload = await graphRequest<Parameters<typeof normalizeTotal>[0]>("/me/insights", {
    ...params, metric: SCALAR_METRICS.join(","),
  });
  const followPayload = await graphRequest<Parameters<typeof normalizeFollowerAdds>[0]>("/me/insights", {
    ...params, metric: "follows_and_unfollows", breakdown: "follow_type",
  });
  return {
    ...Object.fromEntries(SCALAR_METRICS.map((metric) => [metric, normalizeTotal(payload, metric)])),
    follows: normalizeFollowerAdds(followPayload),
  } as Record<InstagramMetric, number | null>;
}

async function mapLimited<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return output;
}

function monthEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return formatDate(new Date(Date.UTC(year, monthNumber, 0)));
}

function listMonths(startMonth: string, endDate: string) {
  const [year, month] = startMonth.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, 1));
  const endMonth = endDate.slice(0, 7);
  const months: string[] = [];
  while (formatDate(cursor).slice(0, 7) <= endMonth) {
    months.push(formatDate(cursor).slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

async function getMonthlyHistory(accountId: string): Promise<Record<InstagramMetric, MonthlyMetric[]>> {
  const today = formatDate(new Date());
  const earliestAvailable = addDays(today, -89);
  const cached = readMonthlyHistory(accountId);
  const completeCachedMonths = new Set(METRIC_NAMES.length
    ? Array.from(new Set(cached.map((row) => row.month))).filter((month) => cached.filter((row) => row.month === month).length === METRIC_NAMES.length)
    : []);
  const windows = listMonths(HISTORY_START_MONTH, today).flatMap((month) => {
    const start = `${month}-01`;
    const end = monthEnd(month);
    const current = month === today.slice(0, 7);
    if (!current && completeCachedMonths.has(month)) return [];
    const queryStart = start < earliestAvailable ? earliestAvailable : start;
    const queryEnd = end > today ? today : end;
    if (queryStart > queryEnd) return [];
    const coveredDays = daysInclusive(queryStart, queryEnd);
    const totalDays = daysInclusive(start, end);
    const status = month === HISTORY_START_MONTH && queryStart > start ? "estimated" as const : queryEnd < end ? "partial" as const : "meta" as const;
    return [{ month, queryStart, queryEnd, coveredDays, totalDays, status }];
  });

  const fetched = await mapLimited(windows, 2, async (window): Promise<HistoryRow[]> => {
    const totals = await getTotals(window.queryStart, window.queryEnd);
    return METRIC_NAMES.map((metric) => ({
      metric,
      month: window.month,
      value: window.status === "estimated" ? prorateMonthlyValue(totals[metric], window.coveredDays, window.totalDays) : totals[metric],
      status: window.status,
      coveredDays: window.coveredDays,
      totalDays: window.totalDays,
    }));
  });
  if (fetched.length) saveMonthlyHistory(accountId, fetched.flat());
  const rows = readMonthlyHistory(accountId);
  return Object.fromEntries(METRIC_NAMES.map((metric) => [metric, rows.filter((row) => row.metric === metric).map(({ month, value, status, coveredDays, totalDays }) => ({ month, value, status, coveredDays, totalDays }))])) as Record<InstagramMetric, MonthlyMetric[]>;
}

type MediaItem = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_product_type?: "FEED" | "REELS" | "STORY";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
};

async function listMediaForPeriod(start: string, end: string): Promise<MediaItem[]> {
  const fields = "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp";
  const collected: MediaItem[] = [];
  let after: string | undefined;
  for (let page = 0; page < 10; page += 1) {
    const response = await graphRequest<{ data?: MediaItem[]; paging?: { cursors?: { after?: string } } }>("/me/media", {
      fields, limit: "25", ...(after ? { after } : {}),
    });
    const items = response.data ?? [];
    collected.push(...items.filter((item) => item.media_product_type !== "STORY" && item.timestamp.slice(0, 10) >= start && item.timestamp.slice(0, 10) <= end));
    const oldest = items.at(-1)?.timestamp.slice(0, 10);
    after = response.paging?.cursors?.after;
    if (!after || !items.length || (oldest && oldest < start)) break;
  }
  return collected;
}

async function getTopContent(start: string, end: string): Promise<TopContent[]> {
  const media = await listMediaForPeriod(start, end);
  const enriched = await mapLimited(media, 3, async (item): Promise<TopContent> => {
    let insights: Record<string, number | null> = { views: null, reach: null, total_interactions: null };
    try {
      const payload = await graphRequest<{ data?: Array<{ name?: string; values?: Array<{ value?: unknown }> }> }>(`/${item.id}/insights`, { metric: "views,reach,total_interactions" });
      insights = Object.fromEntries(["views", "reach", "total_interactions"].map((name) => {
        const value = payload.data?.find((entry) => entry.name === name)?.values?.[0]?.value;
        return [name, typeof value === "number" && Number.isFinite(value) ? value : null];
      }));
    } catch (error) {
      if (error instanceof InstagramApiError && error.status === 429) throw error;
    }
    const type = item.media_product_type === "REELS" ? "Reel" : item.media_type === "CAROUSEL_ALBUM" ? "Carrousel" : "Publication";
    return { id: item.id, caption: item.caption ?? null, type, publishedAt: item.timestamp, imageUrl: item.thumbnail_url ?? item.media_url ?? null, permalink: item.permalink, views: insights.views, reach: insights.reach, interactions: insights.total_interactions };
  });
  return enriched.filter((item) => item.views !== null).sort((a, b) => (b.views ?? -1) - (a.views ?? -1)).slice(0, 3);
}

async function buildInstagramReport(start: string, end: string): Promise<ReportData> {
  const previous = previousPeriod(start, end);
  const [account, totals, previousTotals, topContent] = await Promise.all([
    graphRequest<{ id: string; username: string; followers_count?: number }>("/me", { fields: "id,username,followers_count" }).then((account) => ({ ...account, followersCount: typeof account.followers_count === "number" ? account.followers_count : null })),
    getTotals(start, end),
    getTotals(previous.start, previous.end),
    getTopContent(start, end),
  ]);
  const [dailyTotals, storedHistory] = await Promise.all([
    mapLimited(listDays(start, end), 3, async (date) => ({ date, totals: await getTotals(date, date) })),
    getMonthlyHistory(account.id),
  ]);
  const history = Object.fromEntries(METRIC_NAMES.map((metric) => [
    metric,
    storedHistory[metric].filter((point) => point.month <= end.slice(0, 7)),
  ])) as Record<InstagramMetric, MonthlyMetric[]>;
  const metrics = Object.fromEntries(METRIC_NAMES.map((metric) => {
    const daily: DailyView[] = dailyTotals.map(({ date, totals: values }) => ({ date, value: values[metric] }));
    const data: MetricData = {
      metric,
      total: totals[metric],
      previousTotal: previousTotals[metric],
      evolution: calculateEvolution(totals[metric], previousTotals[metric]),
      daily,
      consistency: metric === "reach"
        ? { status: "unavailable", dailySum: null }
        : checkConsistency(daily, totals[metric]),
    };
    return [metric, data];
  })) as Record<InstagramMetric, MetricData>;
  return {
    account,
    period: { start, end },
    previousPeriod: previous,
    metrics,
    history,
    topContent,
  };
}

export async function verifyInstagramToken(token: string) {
  return tokenContext.run(token, () => graphRequest<{id:string;username:string}>("/me", { fields:"id,username" }));
}
export async function getInstagramReport(start: string, end: string, accountId?: string): Promise<ReportData> {
  const token = accountId ? getAccountToken(accountId) : process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new InstagramApiError(404, "Compte Instagram introuvable.");
  return tokenContext.run(token, () => buildInstagramReport(start,end));
}
