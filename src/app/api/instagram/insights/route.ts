import { NextRequest, NextResponse } from "next/server";
import { getInstagramReport, InstagramApiError } from "@/lib/instagram/client";
import { validateInsightsPeriod } from "@/lib/reporting/dates";
import { isAuthenticated } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  try {
    const start = request.nextUrl.searchParams.get("start") ?? "";
    const end = request.nextUrl.searchParams.get("end") ?? "";
    validateInsightsPeriod(start, end);
    const accountId = request.nextUrl.searchParams.get("accountId") ?? undefined;
    return NextResponse.json(await getInstagramReport(start, end, accountId));
  } catch (error) {
    const status = error instanceof InstagramApiError ? error.status : 400;
    const message = error instanceof InstagramApiError
      ? error.message
      : error instanceof Error ? error.message : "Requête invalide.";
    return NextResponse.json({ error: message }, { status });
  }
}
