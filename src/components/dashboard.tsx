"use client";
/* eslint-disable @next/next/no-img-element -- Meta returns short-lived CDN URLs that cannot use stable Next image hosts. */

import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Camera, Check, ChevronDown, Download, ExternalLink, Eye, Heart, Info, KeyRound, LoaderCircle, Mail, Plus, RefreshCw, Send, Settings, Sparkles, Trash2, TriangleAlert, Users, X } from "lucide-react";
import { METRICS, METRIC_ORDER, type InstagramMetric, type MetricData, type ReportData, type TopContent } from "@/lib/reporting/types";
import { formatDayMonth, formatPeriodLabel } from "@/lib/reporting/dates";
import { ViewsChart } from "./views-chart";

const number = new Intl.NumberFormat("fr-FR");
const iso = (date: Date) => date.toISOString().slice(0, 10);

export function Dashboard() {
  const today = iso(new Date());
  const [start, setStart] = useState(() => iso(new Date(Date.now() - 6 * 86_400_000)));
  const [end, setEnd] = useState(today);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("Bonjour,\n\nVeuillez trouver ci-joint votre rapport de performances Instagram.\n\nBien cordialement,");
  const [emailStatus, setEmailStatus] = useState("");
  const [accounts,setAccounts]=useState<Array<{id:string;username:string}>>([]); const [accountId,setAccountId]=useState(""); const [password,setPassword]=useState(""); const [token,setToken]=useState(""); const [authenticated,setAuthenticated]=useState<boolean|null>(null); const [adminOpen,setAdminOpen]=useState(false); const [accountLoading,setAccountLoading]=useState(false); const [adminError,setAdminError]=useState("");
  async function refreshAccounts(){ const r=await fetch("/api/accounts"); if(r.status===401){setAuthenticated(false);return;} const data=await r.json(); setAccounts(data); setAccountId((current)=>current||data[0]?.id||""); setAuthenticated(true); }
  useEffect(()=>{ fetch("/api/accounts").then(async(r)=>({status:r.status,data:await r.json()})).then(({status,data})=>{if(status===401){setAuthenticated(false);return;}setAccounts(data);setAccountId(data[0]?.id||"");setAuthenticated(true);}); },[]);
  async function login(e:React.FormEvent){e.preventDefault(); const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})}); if(r.ok) await refreshAccounts(); else setError("Mot de passe incorrect.");}
  async function addAccount(e:React.FormEvent){e.preventDefault();setAdminError("");setAccountLoading(true);const r=await fetch("/api/accounts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});const data=await r.json();if(!r.ok){setAdminError(data.error);setAccountLoading(false);return;}setToken("");await refreshAccounts();setAccountLoading(false);}

  async function load(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch(`/api/instagram/insights?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&accountId=${encodeURIComponent(accountId)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Impossible de récupérer les statistiques.");
      setReport(payload); setAnalysis("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Une erreur inattendue est survenue."); }
    finally { setLoading(false); }
  }

  async function generateAnalysis() {
    if (!report) return "";
    setAnalysisLoading(true); setError("");
    try {
      const response = await fetch("/api/report/analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(report) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Impossible de générer l’analyse.");
      setAnalysis(payload.analysis); return payload.analysis as string;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Impossible de générer l’analyse."); return ""; }
    finally { setAnalysisLoading(false); }
  }

  async function download() {
    if (!report) return; setPdfLoading(true); setError("");
    try {
      const reportAnalysis = analysis || await generateAnalysis();
      const response = await fetch("/api/report/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ report, analysis: reportAnalysis }) });
      if (!response.ok) { const payload = await response.json(); throw new Error(payload.error ?? "Impossible de générer le PDF."); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `cynes-instagram-${start}-${end}.pdf`; link.click(); URL.revokeObjectURL(url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Une erreur inattendue est survenue."); }
    finally { setPdfLoading(false); }
  }

  function openEmailDialog() {
    if (!report) return;
    setEmailSubject(`Rapport Instagram @${report.account.username} - ${formatPeriodLabel(report.period.start, report.period.end)}`);
    setEmailStatus("");
    setEmailOpen(true);
  }

  async function sendEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!report) return;
    setEmailLoading(true); setEmailStatus(""); setError("");
    try {
      const reportAnalysis = analysis || await generateAnalysis();
      const response = await fetch("/api/report/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ report, analysis: reportAnalysis, recipient: emailRecipient, subject: emailSubject, message: emailMessage }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Impossible d’envoyer le rapport.");
      setEmailStatus("Rapport envoyé avec succès.");
      setEmailRecipient("");
    } catch (reason) { setEmailStatus(reason instanceof Error ? reason.message : "Impossible d’envoyer le rapport."); }
    finally { setEmailLoading(false); }
  }

  if(authenticated===false) return <main className="grid min-h-screen place-items-center bg-[#f4f6f8] px-5"><form onSubmit={login} className="w-full max-w-[390px] rounded-[6px] border border-[#dfe3e8] bg-white p-8 shadow-[0_8px_30px_rgba(23,32,51,0.08)]"><div className="mb-7 flex items-center gap-3"><div className="grid size-10 place-items-center rounded bg-[#172033] font-bold text-white">C</div><div><h1 className="text-lg font-bold">CYNES Reporting</h1><p className="text-xs text-[#687386]">Espace d’administration</p></div></div><label className="text-xs font-semibold uppercase text-[#687386]">Mot de passe<div className="relative mt-2"><KeyRound className="absolute left-3 top-3 text-[#687386]" size={18}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="h-11 w-full border border-[#cfd5dd] pl-10 pr-3 outline-none focus:border-[#238bd0]" autoFocus required/></div></label><button className="mt-4 h-11 w-full bg-[#172033] font-semibold text-white hover:bg-[#273550]">Se connecter</button>{error&&<p className="mt-4 border-l-2 border-red-500 pl-3 text-sm text-red-700">{error}</p>}</form></main>;
  if(authenticated===null) return <Status>Chargement…</Status>;
  return <main className="min-h-screen bg-[#f4f6f8] text-[#172033]">
    <header className="border-b border-[#dfe3e8] bg-white"><div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-md bg-[#172033] text-sm font-bold text-white">C</div><span className="text-lg font-bold">CYNES Reporting</span></div><button onClick={()=>{setAdminOpen(true);setAdminError("");}} className="flex h-9 items-center gap-2 border border-[#cfd5dd] bg-white px-3 text-sm font-semibold hover:bg-[#f5f7f9]"><Settings size={16}/> <span className="hidden sm:inline">Gérer les comptes</span></button></div></header>
    <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 sm:py-10">
      {emailOpen && <EmailDialog recipient={emailRecipient} subject={emailSubject} message={emailMessage} status={emailStatus} loading={emailLoading} onRecipientChange={setEmailRecipient} onSubjectChange={setEmailSubject} onMessageChange={setEmailMessage} onClose={()=>{if(!emailLoading)setEmailOpen(false);}} onSubmit={sendEmail}/>}
      {adminOpen&&<div className="fixed inset-0 z-50 grid place-items-center bg-[#172033]/35 p-4" onMouseDown={(e)=>{if(e.target===e.currentTarget)setAdminOpen(false);}}><div role="dialog" aria-modal="true" className="w-full max-w-2xl rounded-[6px] border border-[#dfe3e8] bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-[#e5e9ef] p-5"><div><h2 className="text-lg font-bold">Comptes Instagram</h2><p className="mt-1 text-sm text-[#687386]">Ajoutez les profils disponibles dans les rapports.</p></div><button onClick={()=>setAdminOpen(false)} aria-label="Fermer" className="grid size-8 place-items-center text-[#687386] hover:bg-[#f1f3f5]"><X size={18}/></button></div><div className="max-h-[70vh] overflow-y-auto p-5"><div className="space-y-2">{accounts.length?accounts.map(a=><div key={a.id} className="flex items-center justify-between rounded-[4px] border border-[#dfe3e8] px-4 py-3"><div className="flex min-w-0 items-center gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f7e9f0] text-[#c52b72]"><Camera size={17}/></div><div className="min-w-0"><b className="block truncate text-sm">@{a.username}</b><span className="text-xs text-[#687386]">Token configuré</span></div></div><button type="button" title="Supprimer" className="grid size-8 place-items-center text-[#a82c35] hover:bg-red-50" onClick={async()=>{if(!confirm(`Supprimer @${a.username} ?`))return;await fetch('/api/accounts',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:a.id})});await refreshAccounts();}}><Trash2 size={16}/></button></div>):<div className="border border-dashed border-[#cfd5dd] py-7 text-center text-sm text-[#687386]">Aucun compte configuré</div>}</div><form onSubmit={addAccount} className="mt-6 border-t border-[#e5e9ef] pt-5"><div className="mb-3 flex items-center gap-2 font-bold"><Plus size={17}/>Ajouter un compte</div><p className="mb-3 text-xs leading-5 text-[#687386]">Le token est vérifié auprès de Meta puis chiffré. Il ne sera jamais réaffiché.</p><div className="flex flex-col gap-2 sm:flex-row"><input type="password" value={token} onChange={e=>setToken(e.target.value)} className="h-10 min-w-0 flex-1 border border-[#cfd5dd] px-3 outline-none focus:border-[#238bd0]" placeholder="Token d’accès Instagram" autoComplete="new-password" required/><button disabled={accountLoading} className="flex h-10 items-center justify-center gap-2 bg-[#172033] px-4 font-semibold text-white disabled:opacity-60">{accountLoading?<LoaderCircle className="animate-spin" size={16}/>:<Plus size={16}/>}Ajouter</button></div>{adminError&&<p className="mt-3 text-sm text-[#a82c35]">{adminError}</p>}</form></div></div></div>}
      <div className="mb-7"><h1 className="text-2xl font-bold sm:text-3xl">Performances Instagram</h1><p className="mt-2 text-sm text-[#687386]">Analyse des performances du compte professionnel</p></div>
      <form onSubmit={load} className="grid items-end gap-4 border-y border-[#dfe3e8] bg-white px-5 py-5 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:px-6">
        <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId}/>
        <DateField label="Date de début" value={start} max={end} onChange={setStart}/><DateField label="Date de fin" value={end} min={start} max={today} onChange={setEnd}/>
        <button disabled={loading || !accountId} className="flex h-11 items-center justify-center gap-2 bg-[#172033] px-5 text-sm font-semibold text-white hover:bg-[#273550] disabled:opacity-60"><RefreshCw size={17} className={loading ? "animate-spin" : ""}/>{loading ? "Récupération…" : "Récupérer les statistiques"}</button>
      </form>
      {error && <div role="alert" className="mt-5 flex gap-3 border border-[#efc6c8] bg-[#fff7f7] px-4 py-3 text-sm text-[#a82c35]"><TriangleAlert size={19} className="shrink-0"/>{error}</div>}
      {loading ? <Status><LoaderCircle className="mx-auto mb-3 animate-spin text-[#238bd0]"/>Interrogation de l’API Instagram…</Status> : !report ? <Status><div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-[#eef5fa] text-[#238bd0]"><Camera size={22}/></div><b>Aucun rapport chargé</b><p className="mt-1">Sélectionnez une période pour consulter les données réelles de Meta.</p></Status> : <>
        <div className="mt-8 flex flex-wrap justify-end gap-3"><button onClick={openEmailDialog} className="flex h-10 items-center justify-center gap-2 border border-[#bfc7d1] bg-white px-4 text-sm font-semibold hover:bg-[#f5f7f9]"><Mail size={17}/>Envoyer par e-mail</button><button onClick={download} disabled={pdfLoading} className="flex h-10 items-center justify-center gap-2 border border-[#bfc7d1] bg-white px-4 text-sm font-semibold hover:bg-[#f5f7f9] disabled:opacity-60"><Download size={17}/>{pdfLoading ? "Génération…" : "Télécharger le rapport PDF"}</button></div>
        <section className="mt-6 border-l-[3px] border-[#45a7ee] bg-white px-6 py-5 shadow-[0_2px_8px_rgba(23,32,51,0.04)]"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Sparkles size={19} className="text-[#238bd0]"/><h2 className="text-lg font-bold">Analyse de la période</h2></div><button type="button" onClick={generateAnalysis} disabled={analysisLoading} className="flex h-9 items-center gap-2 border border-[#cfd5dd] bg-white px-3 text-sm font-semibold hover:bg-[#f5f7f9] disabled:opacity-60">{analysisLoading?<LoaderCircle size={15} className="animate-spin"/>:<Sparkles size={15}/>} {analysis ? "Régénérer" : "Générer avec l’IA"}</button></div>{analysis?<textarea value={analysis} onChange={(event)=>setAnalysis(event.target.value)} rows={5} maxLength={1400} className="mt-4 w-full resize-y border border-[#dfe3e8] bg-[#fafbfc] p-4 text-base leading-7 outline-none focus:border-[#238bd0]"/>:<p className="mt-3 text-base leading-7 text-[#687386]">Générez un commentaire synthétique à partir des données du rapport. Le texte pourra être modifié avant le téléchargement.</p>}</section>
        <KpiOverview report={report}/>
        <div className="mb-4 mt-10 flex flex-wrap items-baseline gap-x-3 gap-y-1"><h2 className="text-xl font-bold">Historique des performances</h2><p className="text-sm italic text-[#687386]">Mensuel depuis juillet 2026 · … mois en cours</p></div>
        <section className="grid gap-4 lg:grid-cols-2">{METRIC_ORDER.filter((metric) => report.metrics?.[metric]).map((metric) => <MetricPanel key={metric} metric={metric} data={report.metrics[metric]} previousPeriod={report.previousPeriod} history={report.history?.[metric] ?? []}/>)}</section>
        <TopContentSection items={report.topContent ?? []} period={report.period}/>
      </>}
    </div>
  </main>;
}

function EmailDialog({ recipient, subject, message, status, loading, onRecipientChange, onSubjectChange, onMessageChange, onClose, onSubmit }: { recipient: string; subject: string; message: string; status: string; loading: boolean; onRecipientChange: (value: string) => void; onSubjectChange: (value: string) => void; onMessageChange: (value: string) => void; onClose: () => void; onSubmit: (event: React.FormEvent) => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#172033]/40 p-4" onMouseDown={(event)=>{if(event.target===event.currentTarget)onClose();}}><form onSubmit={onSubmit} role="dialog" aria-modal="true" className="w-full max-w-xl rounded-[6px] border border-[#dfe3e8] bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-[#e5e9ef] p-5"><div className="flex gap-3"><div className="grid size-10 place-items-center rounded-full bg-[#eef5fa] text-[#238bd0]"><Mail size={19}/></div><div><h2 className="text-lg font-bold">Envoyer le rapport</h2><p className="mt-1 text-sm text-[#687386]">Le rapport PDF sera joint automatiquement.</p></div></div><button type="button" onClick={onClose} disabled={loading} aria-label="Fermer" className="grid size-8 place-items-center text-[#687386] hover:bg-[#f1f3f5]"><X size={18}/></button></div><div className="space-y-4 p-5"><label className="block text-xs font-semibold uppercase text-[#687386]">Destinataire<input type="email" value={recipient} onChange={(event)=>onRecipientChange(event.target.value)} placeholder="client@entreprise.fr" required className="mt-2 h-11 w-full border border-[#cfd5dd] px-3 text-sm font-normal normal-case text-[#172033] outline-none focus:border-[#238bd0]"/></label><label className="block text-xs font-semibold uppercase text-[#687386]">Objet<input value={subject} onChange={(event)=>onSubjectChange(event.target.value)} maxLength={180} required className="mt-2 h-11 w-full border border-[#cfd5dd] px-3 text-sm font-normal normal-case text-[#172033] outline-none focus:border-[#238bd0]"/></label><label className="block text-xs font-semibold uppercase text-[#687386]">Message<textarea value={message} onChange={(event)=>onMessageChange(event.target.value)} rows={6} maxLength={3000} className="mt-2 w-full resize-y border border-[#cfd5dd] p-3 text-sm font-normal normal-case leading-6 text-[#172033] outline-none focus:border-[#238bd0]"/></label>{status&&<div className={`border px-4 py-3 text-sm ${status.includes("succès")?"border-[#b9ddcc] bg-[#f2fbf6] text-[#176b48]":"border-[#efc6c8] bg-[#fff7f7] text-[#a82c35]"}`}>{status}</div>}</div><div className="flex justify-end gap-3 border-t border-[#e5e9ef] px-5 py-4"><button type="button" onClick={onClose} disabled={loading} className="h-10 border border-[#cfd5dd] bg-white px-4 text-sm font-semibold hover:bg-[#f5f7f9]">Annuler</button><button disabled={loading} className="flex h-10 items-center gap-2 bg-[#172033] px-5 text-sm font-semibold text-white hover:bg-[#273550] disabled:opacity-60">{loading?<LoaderCircle size={17} className="animate-spin"/>:<Send size={17}/>} {loading?"Envoi…":"Envoyer"}</button></div></form></div>;
}

function KpiOverview({ report }: { report: ReportData }) {
  const periodLabel = formatPeriodLabel(report.period.start, report.period.end);
  const followersCount = report.account?.followersCount;
  const hasFollowersCount = typeof followersCount === "number" && Number.isFinite(followersCount);
  return <section className="mt-6">
    <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1"><h2 className="text-xl font-bold">Vue d’ensemble</h2><p className="text-sm italic text-[#687386]">{periodLabel}</p></div>
    <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_3fr]">
      <article className="flex min-h-32 flex-col justify-between rounded-[6px] border border-[#dfe3e8] bg-white p-4 shadow-[0_2px_8px_rgba(23,32,51,0.05)] lg:min-h-0">
        <div className="flex items-center gap-1.5 text-sm font-medium text-[#687386]">Followers au total<InfoPopover label="Followers au total" description="Le nombre total de comptes qui suivent actuellement votre compte Instagram. Cette valeur est une photographie au moment de la récupération."/></div>
        <div className="my-3 text-3xl font-bold">{hasFollowersCount ? number.format(followersCount) : "Indisponible"}</div>
        <div className="text-xs italic text-[#7b8493]">Total au {formatDayMonth(report.period.end)}</div>
      </article>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {METRIC_ORDER.map((metric) => { const data = report.metrics[metric]; if (!data) return null; const variation = data.evolution; return <article key={metric} className="min-h-24 rounded-[6px] border border-[#dfe3e8] bg-white p-4 shadow-[0_2px_8px_rgba(23,32,51,0.05)]"><div className="text-sm font-medium text-[#687386]">{METRICS[metric].label}</div><div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1"><div className="text-2xl font-bold">{data.total === null ? "—" : number.format(data.total)}</div>{variation !== null ? <div className={`flex items-center gap-0.5 text-xs font-bold ${variation >= 0 ? "text-[#178153]" : "text-[#c03c44]"}`}>{variation >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>} {variation >= 0 ? "+" : ""}{variation.toFixed(1).replace(".", ",")} %</div> : <div className="text-[11px] italic text-[#7b8493]">Évolution indisponible</div>}</div></article>; })}
      </div>
    </div>
  </section>;
}

function MetricPanel({ metric, data, previousPeriod, history }: { metric: InstagramMetric; data: MetricData; previousPeriod: ReportData["previousPeriod"]; history: ReportData["history"][InstagramMetric] }) {
  const definition = METRICS[metric]; const variation = data.evolution;
  const unavailable = data.daily.filter((item) => item.value === null).length;
  return <article className="border border-[#dfe3e8] bg-white">
    <div className="border-b border-[#e5e9ef] px-5 py-5 sm:px-6"><div className="flex items-center gap-1.5"><h2 className="text-base font-bold">{definition.label}</h2><InfoPopover label={definition.label} description={definition.description}/></div><div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1"><div className="text-4xl font-medium">{data.total === null ? "Indisponible" : number.format(data.total)}</div><div className={`mb-1 flex items-center gap-1 text-sm font-semibold ${variation === null ? "text-[#687386]" : variation >= 0 ? "text-[#178153]" : "text-[#c03c44]"}`}>{variation === null ? null : variation >= 0 ? <ArrowUpRight size={17}/> : <ArrowDownRight size={17}/>} {variation === null ? "Évolution indisponible" : `${variation >= 0 ? "+" : ""}${variation.toFixed(1).replace(".", ",")} %`}</div><p className="mb-1 text-xs italic text-[#7b8493]">par rapport à {formatPeriodLabel(previousPeriod.start, previousPeriod.end)}</p></div></div>
    <div className="px-2 py-5 sm:px-4"><ViewsChart data={history} label={definition.label}/></div>
    {(unavailable > 0 || data.consistency.status === "mismatch") && <div className="border-t border-[#e5e9ef] bg-[#fffaf0] px-5 py-3 text-xs text-[#765a19]">{data.consistency.status === "mismatch" ? `Écart détecté : la somme quotidienne (${number.format(data.consistency.dailySum ?? 0)}) diffère du total Meta.` : `${unavailable} journée(s) indisponible(s) : la cohérence ne peut pas être vérifiée.`}</div>}
  </article>;
}

function TopContentSection({ items, period }: { items: TopContent[]; period: ReportData["period"] }) {
  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
  return <section className="mt-10"><div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1"><div className="flex items-center gap-1.5"><h2 className="text-xl font-bold">Top contenus</h2><InfoPopover label="Top contenus" description="Les trois publications, carrousels ou Reels publiés pendant la période sélectionnée qui comptent actuellement le plus de vues. Les statistiques correspondent au cumul depuis leur publication."/></div><span className="text-sm italic text-[#687386]">{formatPeriodLabel(period.start, period.end)}</span></div>{items.length ? <div className="grid gap-4 lg:grid-cols-3">{items.map((item, index) => <article key={item.id} className="overflow-hidden rounded-[6px] border border-[#dfe3e8] bg-white shadow-[0_3px_12px_rgba(23,32,51,0.06)]">{item.imageUrl ? <img src={item.imageUrl} alt={`Aperçu du contenu ${index + 1}`} className="aspect-[4/3] w-full bg-[#eef1f4] object-cover"/> : <div className="grid aspect-[4/3] place-items-center bg-[#eef1f4] text-xs text-[#7b8493]">Aperçu indisponible</div>}<div className="p-5"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold uppercase text-[#687386]">#{index + 1} · {item.type}</span><a href={item.permalink} target="_blank" rel="noreferrer" aria-label="Ouvrir sur Instagram" className="text-[#536074] hover:text-[#172033]"><ExternalLink size={17}/></a></div><div className="mt-2 text-xs text-[#7b8493]">Publié le {date.format(new Date(item.publishedAt))}</div><p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-[#384456]">{item.caption || "Sans légende"}</p><div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#e5e9ef] pt-4"><ContentStat icon={<Eye size={15}/>} label="Vues" value={item.views}/><ContentStat icon={<Users size={15}/>} label="Couverture" value={item.reach}/><ContentStat icon={<Heart size={15}/>} label="Interactions" value={item.interactions}/></div></div></article>)}</div> : <div className="rounded-[6px] border border-[#dfe3e8] bg-white px-6 py-12 text-center text-sm text-[#687386] shadow-[0_3px_12px_rgba(23,32,51,0.06)]">Aucune publication ni aucun Reel disponible sur cette période.</div>}</section>;
}

function ContentStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | null }) {
  return <div><div className="flex items-center gap-1 text-[#687386]">{icon}<span className="text-[10px]">{label}</span></div><div className="mt-1 text-sm font-bold">{value === null ? "—" : number.format(value)}</div></div>;
}

function InfoPopover({ label, description }: { label: string; description: string }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <div ref={container} className="relative"><button type="button" onClick={() => setOpen((value) => !value)} aria-label={`Définition : ${label}`} aria-expanded={open} className="grid place-items-center text-[#506070]"><Info size={15}/></button>{open && <div role="tooltip" className="absolute left-1/2 top-6 z-20 w-[min(310px,calc(100vw-64px))] -translate-x-1/2 border border-[#d5dbe3] bg-white p-4 text-sm font-normal leading-5 text-[#384456] shadow-lg">{description}</div>}</div>;
}

function AccountSelect({ accounts, value, onChange }: { accounts: Array<{ id: string; username: string }>; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const selected = accounts.find((account) => account.id === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return <div ref={container} className="relative">
    <span className="mb-2 block text-xs font-semibold uppercase text-[#687386]">Compte Instagram</span>
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={`flex h-11 w-full items-center gap-3 border bg-white px-2 text-left outline-none ${open ? "border-[#238bd0] ring-1 ring-[#238bd0]" : "border-[#cfd5dd]"}`}>
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#f7e9f0] text-[#c52b72]"><Camera size={15}/></span>
      <span className={`min-w-0 flex-1 truncate text-sm ${selected ? "font-medium text-[#172033]" : "text-[#7b8493]"}`}>{selected ? `@${selected.username}` : "Sélectionner un compte"}</span>
      <ChevronDown size={17} className={`shrink-0 text-[#687386] transition-transform ${open ? "rotate-180" : ""}`}/>
    </button>
    {open && <div role="listbox" className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-[4px] border border-[#cfd5dd] bg-white p-1 shadow-[0_12px_30px_rgba(23,32,51,0.16)]">
      {accounts.length ? accounts.map((account) => <button key={account.id} type="button" role="option" aria-selected={account.id === value} onClick={() => { onChange(account.id); setOpen(false); }} className={`flex w-full items-center gap-3 rounded-[3px] px-3 py-2.5 text-left text-sm ${account.id === value ? "bg-[#eef5fa] font-semibold text-[#172033]" : "hover:bg-[#f5f7f9]"}`}><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#f7e9f0] text-[#c52b72]"><Camera size={14}/></span><span className="min-w-0 flex-1 truncate">@{account.username}</span>{account.id === value && <Check size={16} className="text-[#178153]"/>}</button>) : <div className="px-3 py-4 text-center text-sm text-[#687386]">Aucun compte configuré</div>}
    </div>}
  </div>;
}

function DateField({ label, value, min, max, onChange }: { label: string; value: string; min?: string; max?: string; onChange: (value: string) => void }) { return <label><span className="mb-2 block text-xs font-semibold uppercase text-[#687386]">{label}</span><span className="relative block"><CalendarDays className="pointer-events-none absolute left-3 top-3 text-[#687386]" size={18}/><input className="h-11 w-full border border-[#cfd5dd] bg-white pl-10 pr-3 text-sm outline-none focus:border-[#238bd0]" type="date" value={value} min={min} max={max} onChange={(e) => onChange(e.target.value)} required/></span></label>; }
function Status({ children }: { children: React.ReactNode }) { return <div className="mt-8 grid min-h-[390px] place-items-center border border-dashed border-[#cfd5dd] bg-white px-6 text-center text-sm text-[#687386]"><div>{children}</div></div>; }
