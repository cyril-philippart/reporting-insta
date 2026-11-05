import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth/session";
import { generateReportPdf, isReportData } from "@/lib/pdf/generate";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmailSimulationEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.EMAIL_SIMULATION === "true";
}

function smtpConfiguration() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL || user;
  if (!host || !user || !pass || !fromEmail) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: { user, pass },
    from: { name: process.env.SMTP_FROM_NAME || "CYNES Reporting", address: fromEmail },
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

function defaultEmailMessage(periodEnd: string) {
  const month = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${periodEnd}T12:00:00Z`));
  const period = /^[aeiouyh]/i.test(month) ? `d’${month}` : `de ${month}`;
  return `Bonjour,\n\nVeuillez trouver ci-joint votre rapport de performances Instagram pour le mois ${period}.\n\nBien cordialement,\nL’équipe CYNES`;
}

export async function POST(request: Request) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  try {
    const payload = await request.json() as Record<string, unknown>;
    const report = payload.report;
    const recipient = typeof payload.recipient === "string" ? payload.recipient.trim() : "";
    const subject = typeof payload.subject === "string" ? payload.subject.trim().slice(0, 180) : "";
    const message = typeof payload.message === "string" ? payload.message.trim().slice(0, 3000) : "";
    const analysis = typeof payload.analysis === "string" ? payload.analysis.slice(0, 1400) : "";
    if (!isReportData(report)) return NextResponse.json({ error: "Données de rapport invalides." }, { status: 400 });
    if (!emailPattern.test(recipient)) return NextResponse.json({ error: "Adresse e-mail destinataire invalide." }, { status: 400 });
    if (!subject) return NextResponse.json({ error: "L’objet du message est obligatoire." }, { status: 400 });
    if (isEmailSimulationEnabled()) {
      return NextResponse.json({ success: true, simulated: true });
    }
    const smtp = smtpConfiguration();
    if (!smtp) return NextResponse.json({ error: "L’envoi d’e-mails n’est pas encore configuré sur le serveur." }, { status: 503 });

    const pdf = await generateReportPdf(report, analysis);
    const emailMessage = message || defaultEmailMessage(report.period.end);
    const safeMessage = escapeHtml(emailMessage).replace(/\n/g, "<br>");
    const transporter = nodemailer.createTransport(smtp);
    const attachment = {
      filename: `cynes-instagram-${report.period.start}-${report.period.end}.pdf`,
      content: pdf,
      contentType: "application/pdf" as const,
    };
    const emailContent = {
      text: emailMessage,
      html: `<div style="font-family:Arial,sans-serif;color:#172033;line-height:1.6"><p>${safeMessage}</p></div>`,
      attachments: [attachment],
    };
    await transporter.sendMail({
      from: smtp.from,
      to: recipient,
      subject,
      ...emailContent,
    });
    const internalCopyRecipient = process.env.REPORT_EMAIL_BCC?.trim();
    if (internalCopyRecipient) {
      await transporter.sendMail({
        from: smtp.from,
        to: internalCopyRecipient,
        subject: `COPIE INTERNE - ${subject}`,
        ...emailContent,
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Report email delivery failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Le rapport n’a pas pu être envoyé. Vérifiez la configuration e-mail." }, { status: 500 });
  }
}
