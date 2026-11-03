import { formatDayMonth, formatPeriodLabel } from "@/lib/reporting/dates";
import { METRICS, METRIC_ORDER, type InstagramMetric, type MetricData, type MonthlyMetric, type ReportData } from "@/lib/reporting/types";

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]!);
const number = new Intl.NumberFormat("fr-FR");
const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });
const monthOnly = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" });

function chart(data: MonthlyMetric[]) {
  const values = data.map((point) => point.value);
  const available = values.filter((value): value is number => value !== null);
  if (!available.length) return '<div class="empty">Données quotidiennes indisponibles</div>';

  const width = 330;
  const height = 190;
  const left = 43;
  const right = 10;
  const top = 12;
  const bottom = 28;
  const max = Math.max(...available, 1);
  const x = (index: number) => left + index * ((width - left - right) / Math.max(values.length - 1, 1));
  const y = (value: number) => top + (max - value) * ((height - top - bottom) / max);
  const segments: string[] = [];
  let current: string[] = [];

  values.forEach((value, index) => {
    if (value === null) {
      if (current.length) segments.push(current.join(" "));
      current = [];
    } else {
      current.push(`${current.length ? "L" : "M"} ${x(index).toFixed(1)} ${y(value).toFixed(1)}`);
    }
  });
  if (current.length) segments.push(current.join(" "));

  const grids = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const gridY = top + ratio * (height - top - bottom);
    return `<line x1="${left}" y1="${gridY}" x2="${width - right}" y2="${gridY}" stroke="#e3e7ec"/><text x="${left - 6}" y="${gridY + 3}" text-anchor="end">${number.format(Math.round(max * (1 - ratio)))}</text>`;
  }).join("");

  const labelCount = Math.min(6, values.length);
  const labelIndexes = Array.from(new Set(Array.from({ length: labelCount }, (_, index) => Math.round(index * (values.length - 1) / Math.max(labelCount - 1, 1)))));
  const labels = labelIndexes.map((index) => {
    const point = data[index];
    const suffix = point.status === "partial" ? " …" : "";
    const label = `${new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${point.month}-01T00:00:00Z`)).replace(".", "")}${suffix}`;
    return `<text x="${x(index)}" y="${height - 5}" text-anchor="middle">${label}</text>`;
  }).join("");

  const dots = values.map((value, index) => value === null ? "" : `<circle cx="${x(index)}" cy="${y(value)}" r="3.2" fill="#45a7ee" stroke="#fff" stroke-width="1.4"/>`).join("");
  return `<svg viewBox="0 0 ${width} ${height}" role="img">${grids}${segments.map((path) => `<path d="${path}" fill="none" stroke="#45a7ee" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}${dots}${labels}</svg>`;
}

function arrow(up: boolean) {
  return `<svg class="trend-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="${up ? "M3.5 11.5 11.5 3.5M6 3.5h5.5V9" : "M3.5 4.5 11.5 12.5M6 12.5h5.5V7"}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function metricPanel(metric: InstagramMetric, data: MetricData, history: MonthlyMetric[], comparisonLabel: string) {
  const evolution = data.evolution;
  const variation = evolution === null ? "Évolution indisponible" : `${arrow(evolution >= 0)}${evolution >= 0 ? "+" : ""}${evolution.toFixed(1).replace(".", ",")} %`;
  const tone = evolution === null ? "neutral" : evolution >= 0 ? "positive" : "negative";
  return `<article class="metric-panel"><header class="metric-header"><h3>${escape(METRICS[metric].label)}</h3><p>${escape(METRICS[metric].description)}</p><div class="metric-summary"><strong>${data.total === null ? "—" : number.format(data.total)}</strong><b class="${tone}">${variation}</b><em>vs ${escape(comparisonLabel)}</em></div></header>${chart(history)}</article>`;
}

function contentCard(item: ReportData["topContent"][number], index: number) {
  return `<article class="content-card" style="height:200px">${item.imageUrl ? `<img src="${escape(item.imageUrl)}" alt="" style="height:108px">` : '<div class="image-empty" style="height:108px">Aperçu indisponible</div>'}<div class="content-body"><div class="content-meta">#${index + 1} · ${escape(item.type)} · ${longDate.format(new Date(item.publishedAt))}</div><p>${escape(item.caption || "Sans légende")}</p><div class="content-stats"><span>Vues <b>${item.views === null ? "—" : number.format(item.views)}</b></span><span>Couverture <b>${item.reach === null ? "—" : number.format(item.reach)}</b></span><span>Interactions <b>${item.interactions === null ? "—" : number.format(item.interactions)}</b></span></div></div></article>`;
}

export function renderReportHtml(data: ReportData, analysis = "") {
  const periodLabel = formatPeriodLabel(data.period.start, data.period.end);
  const comparisonMonth = monthOnly.format(new Date(`${data.previousPeriod.start}T00:00:00Z`));
  const comparisonLabel = comparisonMonth[0].toUpperCase() + comparisonMonth.slice(1);
  const followersCount = data.account?.followersCount;
  const followersLabel = typeof followersCount === "number" && Number.isFinite(followersCount) ? number.format(followersCount) : "Indisponible";
  const metricCards = METRIC_ORDER.map((metric) => {
    const item = data.metrics[metric];
    const evolution = item.evolution;
    const variation = evolution === null ? "—" : `${arrow(evolution >= 0)}${evolution >= 0 ? "+" : ""}${evolution.toFixed(1).replace(".", ",")} %`;
    const tone = evolution === null ? "neutral" : evolution >= 0 ? "positive" : "negative";
    return `<article class="kpi"><span style="font-weight:700;color:#172033">${escape(METRICS[metric].label)}</span><div><strong>${item.total === null ? "—" : number.format(item.total)}</strong><b class="${tone}">${variation}</b></div></article>`;
  }).join("");
  const analysisBlock = analysis ? `<section class="analysis"><h2>Analyse de la période</h2><p>${escape(analysis)}</p></section>` : "";
  const topContent = data.topContent.length
    ? data.topContent.slice(0, 3).map(contentCard).join("")
    : '<div class="no-content">Aucun contenu disponible sur cette période.</div>';

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
  .analysis{margin:18px 0 6px;padding:18px 20px;border-left:3px solid #45a7ee;background:#f5f9fc;break-inside:avoid}.analysis h2{margin:0 0 9px;font-size:15px}.analysis p{margin:0;font-size:11px;line-height:18px;color:#384456}
  .page{width:794px!important;min-height:1123px!important;padding:30px 34px 24px!important}.topbar{padding-bottom:14px!important}.section-title{margin:18px 0 10px!important}.overview{margin-bottom:5px}.charts{gap:14px!important}.metric-panel{height:316px!important;padding:16px 16px 10px!important;break-inside:avoid;page-break-inside:avoid}.metric-header{flex:0 0 90px!important}.metric-panel h3{height:auto!important;margin:0 0 3px!important;font-size:13px!important;line-height:16px!important}.metric-panel .metric-header>p{height:14px!important;margin:0 0 8px!important;overflow:hidden;font-size:8px!important;font-style:italic;line-height:14px!important;color:#657184}.metric-summary{display:flex!important;height:42px!important;align-items:center!important;gap:8px!important}.metric-summary strong{font-size:27px!important;font-weight:500;line-height:32px}.metric-summary b{display:flex;align-items:center;gap:2px;font-size:10px!important;line-height:14px}.metric-summary em{align-self:center;font-size:9px!important;line-height:14px}.trend-arrow{display:inline-block!important;width:14px!important;height:14px!important;flex:0 0 14px!important;color:inherit!important}.metric-summary b .trend-arrow{color:inherit!important}.metric-panel>svg{height:200px!important;flex:0 0 200px!important;font-size:7px!important}.content-section{margin-top:22px!important;break-inside:avoid;page-break-inside:avoid}.content-card{height:270px!important}.content-card img,.image-empty{height:160px!important}.content-body{padding:11px!important}.content-body p{height:28px!important;font-size:9px!important;line-height:14px!important}.footer{right:34px!important;bottom:12px!important}
  @page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#172033;background:#fff}.page{position:relative;width:794px;min-height:1123px;padding:22px 30px 18px}.topbar{display:flex;justify-content:space-between;align-items:start;padding-bottom:10px;border-bottom:1px solid #dce1e8}.brand{font-size:17px;font-weight:800}.account{margin-top:4px;font-size:11px;color:#657184}.period{text-align:right;font-size:10px;color:#657184}.period strong{display:block;margin-bottom:3px;font-size:13px;color:#172033}.section-title{display:flex;align-items:baseline;gap:8px;margin:11px 0 7px}.section-title h2{margin:0;font-size:15px}.section-title span{font-size:9px;font-style:italic;color:#657184}.overview{display:grid;grid-template-columns:1fr 3fr;gap:8px}.followers,.kpi{border:1px solid #dce1e8;border-radius:5px;padding:9px;box-shadow:0 1px 5px rgba(23,32,51,.05)}.followers{display:flex;flex-direction:column;justify-content:space-between}.followers span,.kpi span{font-size:9px;color:#657184}.followers strong{font-size:25px}.followers small{font-size:8px;font-style:italic;color:#7b8493}.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.kpi div{display:flex;align-items:baseline;gap:5px;margin-top:6px}.kpi strong{font-size:17px}.kpi b{font-size:8px}.positive{color:#178153}.negative{color:#c03c44}.neutral{color:#687386}.charts{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.metric-panel{display:flex;height:145px;flex-direction:column;border:1px solid #dce1e8;border-radius:5px;padding:8px 10px 4px;overflow:hidden}.metric-header{flex:0 0 34px}.metric-panel h3{height:13px;margin:0 0 2px;overflow:hidden;font-size:11px;line-height:13px;white-space:nowrap}.metric-summary{display:flex;height:19px;align-items:baseline;gap:6px;white-space:nowrap}.metric-summary strong{font-size:17px}.metric-summary b{font-size:8px}.metric-summary em{font-size:8px;color:#7b8493}svg{display:block;width:100%;height:103px;flex:0 0 103px;font-size:7px;color:#687386}.empty{display:grid;height:103px;place-items:center;background:#f7f8fa;font-size:9px;color:#657184}.content-section{margin-top:9px}.content-heading{display:flex;align-items:baseline;gap:8px;margin-bottom:6px}.content-heading h2{margin:0;font-size:15px}.content-heading span{font-size:8px;color:#657184}.content-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.content-card{height:235px;overflow:hidden;border:1px solid #dce1e8;border-radius:5px;box-shadow:0 1px 5px rgba(23,32,51,.05)}.content-card img,.image-empty{display:block;width:100%;height:143px;object-fit:cover;background:#eef1f4}.image-empty{display:grid;place-items:center;text-align:center;font-size:8px;color:#7b8493}.content-body{min-width:0;padding:8px 9px}.content-meta{height:9px;overflow:hidden;font-size:7px;font-weight:700;text-transform:uppercase;color:#657184;white-space:nowrap}.content-body p{height:20px;overflow:hidden;margin:5px 0 6px;font-size:8px;line-height:10px}.content-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;border-top:1px solid #e5e9ef;padding-top:5px;font-size:6px;color:#657184}.content-stats b{display:block;margin-top:2px;font-size:9px;color:#172033}.no-content{grid-column:1/-1;padding:50px;text-align:center;border:1px solid #dce1e8;font-size:9px;color:#657184}.footer{position:absolute;right:30px;bottom:8px;font-size:7px;color:#8a93a1}
  </style></head><body><main class="page"><header class="topbar"><div><div class="brand">CYNES Reporting</div><div class="account">@${escape(data.account.username)}</div></div><div class="period"><strong>Rapport Instagram · ${escape(periodLabel)}</strong>Du ${longDate.format(new Date(`${data.period.start}T00:00:00Z`))} au ${longDate.format(new Date(`${data.period.end}T00:00:00Z`))}</div></header>${analysisBlock}<div class="section-title"><h2>Vue d’ensemble</h2></div><section class="overview"><article class="followers"><span style="font-weight:700;color:#172033">Followers au total</span><strong>${followersLabel}</strong><small>Total au ${escape(formatDayMonth(data.period.end))}</small></article><div class="kpi-grid">${metricCards}</div></section><div class="section-title"><h2>Historique des performances</h2></div><section class="charts" style="gap:10px">${METRIC_ORDER.map((metric) => metricPanel(metric, data.metrics[metric], data.history?.[metric] ?? [], comparisonLabel)).join("")}</section><section class="content-section"><div class="content-heading"><h2>Top contenus</h2><span>Classement par vues cumulées</span></div><div class="content-grid">${topContent}</div></section><div class="footer">Données Instagram collectées via l’API officielle Meta · CYNES Reporting</div></main></body></html>`;
}
