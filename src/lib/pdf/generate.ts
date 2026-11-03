import { chromium } from "playwright";
import type { ReportData } from "@/lib/reporting/types";
import { renderReportHtml } from "./template";

export function isReportData(value: unknown): value is ReportData {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ReportData>;
  const metrics = item.metrics;
  return Boolean(
    item.account?.username
      && item.period?.start
      && item.period?.end
      && metrics
      && Object.values(metrics).length === 6
      && Object.values(metrics).every((metric) => Array.isArray(metric?.daily))
      && Array.isArray(item.topContent),
  );
}

export async function generateReportPdf(data: ReportData, analysis: string) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(renderReportHtml(data, analysis), { waitUntil: "load" });
    return await page.pdf({ format: "A4", landscape: false, printBackground: true });
  } finally {
    await browser.close();
  }
}
