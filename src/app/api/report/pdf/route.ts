import { NextResponse } from "next/server";
import { generateReportPdf, isReportData } from "@/lib/pdf/generate";
import { isAuthenticated } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  try {
    const payload: unknown = await request.json();
    const data = payload && typeof payload === "object" && "report" in payload ? (payload as { report: unknown }).report : payload;
    const analysis = payload && typeof payload === "object" && "analysis" in payload && typeof (payload as { analysis?: unknown }).analysis === "string" ? (payload as { analysis: string }).analysis.slice(0, 1400) : "";
    if (!isReportData(data)) return NextResponse.json({ error: "Données de rapport invalides." }, { status: 400 });
    const pdf = await generateReportPdf(data, analysis);
    return new NextResponse(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="cynes-instagram-${data.period.start}-${data.period.end}.pdf"`, "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Le rapport PDF n’a pas pu être généré." }, { status: 500 });
  }
}
