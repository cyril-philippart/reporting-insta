import type { ReportData } from "@/lib/reporting/types";

type OpenAIResponse = { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };

export async function generateReportAnalysis(report: ReportData): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("La clé OPENAI_API_KEY n’est pas configurée.");
  const facts = {
    account: report.account.username,
    period: report.period,
    metrics: Object.fromEntries(Object.entries(report.metrics).map(([key, value]) => [key, { total: value.total, previousTotal: value.previousTotal, evolution: value.evolution }])),
    topContent: report.topContent.map((item) => ({ type: item.type, views: item.views, reach: item.reach, interactions: item.interactions })),
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-6-luna",
      instructions: "Tu rédiges une analyse professionnelle de performances Instagram pour un rapport client. Utilise exclusivement les faits JSON fournis. N’invente aucune donnée. Ne cite aucun chiffre exact : commente uniquement les tendances, les progressions, les reculs et les contenus dominants. Rédige un seul paragraphe en français, clair, sobre et naturel, de 70 à 110 mots. Aucun titre, aucune liste, aucun markdown.",
      input: JSON.stringify(facts),
      max_output_tokens: 220,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("L’analyse IA n’a pas pu être générée.");
  const payload = await response.json() as OpenAIResponse;
  const text = payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text?.trim();
  if (!text) throw new Error("L’analyse IA est indisponible.");
  return text.slice(0, 1400);
}
