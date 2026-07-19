import type { Quote } from "@/lib/quotes";
import { formatQuoteAmount } from "@/content/quotes-labels";
import { escapeHtml } from "@/lib/email";

export function buildQuoteEmailHtml(
  quote: Quote,
  siteUrl: string,
  customBody?: string,
): string {
  const lines = quote.lines.length
    ? quote.lines
        .map(
          (line) =>
            `<tr><td style="padding:6px 0;border-bottom:1px solid #e5e7eb">${escapeHtml(line.label)}</td><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${formatQuoteAmount(line.amount, quote.currency)}</td></tr>`,
        )
        .join("")
    : "";

  const bodyHtml = customBody
    ? customBody.split("\n").map((line) => `<p>${escapeHtml(line)}</p>`).join("")
    : `<p>Bonjour ${escapeHtml(quote.name.split(" ")[0] ?? quote.name)},</p>
       <p>Veuillez trouver ci-dessous notre devis <strong>${escapeHtml(quote.reference)}</strong> concernant votre projet « ${escapeHtml(quote.projectLabel)} ».</p>`;

  return `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111827;max-width:640px">
    ${bodyHtml}
    <div style="margin:24px 0;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase">Devis ${escapeHtml(quote.reference)}</p>
      <p style="margin:0 0 4px"><strong>Projet :</strong> ${escapeHtml(quote.projectLabel)}</p>
      <p style="margin:0 0 12px"><strong>Total HT :</strong> ${formatQuoteAmount(quote.subtotal, quote.currency)}</p>
      ${lines ? `<table style="width:100%;font-size:14px">${lines}</table>` : ""}
      ${quote.estimateMin && quote.estimateMax ? `<p style="margin:12px 0 0;font-size:13px;color:#6b7280">Fourchette : ${formatQuoteAmount(quote.estimateMin, quote.currency)} – ${formatQuoteAmount(quote.estimateMax, quote.currency)}</p>` : ""}
    </div>
    <p style="font-size:13px;color:#6b7280">Devis valable 30 jours. N'hésitez pas à nous contacter pour toute question.</p>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
    <p style="font-size:12px;color:#9ca3af">SD CREATIV — ${escapeHtml(siteUrl)}</p>
  </div>`;
}

export function buildQuoteReminderEmailHtml(quote: Quote, siteUrl: string): string {
  const daysLabel = quote.sentAt
    ? Math.floor((Date.now() - new Date(quote.sentAt).getTime()) / 86_400_000)
    : 0;

  return buildQuoteEmailHtml(
    quote,
    siteUrl,
    `Bonjour ${quote.name.split(" ")[0] ?? quote.name},

Nous revenons vers vous concernant notre devis ${quote.reference} (${formatQuoteAmount(quote.subtotal, quote.currency)}) envoyé il y a ${daysLabel} jour(s).

Avez-vous eu l'occasion de l'examiner ? Nous restons disponibles pour en discuter ou ajuster la proposition.`,
  );
}

