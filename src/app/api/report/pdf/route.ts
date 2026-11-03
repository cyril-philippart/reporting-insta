import { chromium } from "playwright";
import { NextResponse } from "next/server";
import { renderReportHtml } from "@/lib/pdf/template";
import type { ReportData } from "@/lib/reporting/types";
import { isAuthenticated } from "@/lib/auth/session";

function isReportData(value: unknown): value is ReportData {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ReportData>;
  const metrics = item.metrics;
  return Boolean(item.account?.username && item.period?.start && item.period?.end && metrics && Object.values(metrics).length === 6 && Object.values(metrics).every((metric) => Array.isArray(metric?.daily)) && Array.isArray(item.topContent));
}

export async function POST(request: Request) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  try {
    const payload: unknown = await request.json();
    const data = payload && typeof payload === "object" && "report" in payload ? (payload as { report: unknown }).report : payload;
    const analysis = payload && typeof payload === "object" && "analysis" in payload && typeof (payload as { analysis?: unknown }).analysis === "string" ? (payload as { analysis: string }).analysis.slice(0, 1400) : "";
    if (!isReportData(data)) return NextResponse.json({ error: "Données de rapport invalides." }, { status: 400 });
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.setContent(renderReportHtml(data, analysis), { waitUntil: "load" });
      const pdf = await page.pdf({ format: "A4", landscape: false, printBackground: true });
      return new NextResponse(new Uint8Array(pdf), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="cynes-instagram-${data.period.start}-${data.period.end}.pdf"`, "Cache-Control": "no-store" },
      });
    } finally { await browser.close(); }
  } catch {
    return NextResponse.json({ error: "Le rapport PDF n’a pas pu être généré." }, { status: 500 });
  }
}
