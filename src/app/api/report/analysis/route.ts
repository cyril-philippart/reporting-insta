import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth/session";
import { generateReportAnalysis } from "@/lib/ai/analysis";
import type { ReportData } from "@/lib/reporting/types";

export async function POST(request: Request) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  try {
    const report = await request.json() as ReportData;
    return NextResponse.json({ analysis: await generateReportAnalysis(report) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "L’analyse IA est indisponible." }, { status: 502 });
  }
}
