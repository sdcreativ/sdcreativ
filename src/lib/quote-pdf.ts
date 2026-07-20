import type { Quote } from "@/lib/quotes";
import { formatQuoteAmount, formatQuoteDate } from "@/content/quotes-labels";
import { QUOTE_STATUS_LABELS } from "@/content/quotes-labels";
import type { InvoiceDocumentCompany } from "@/lib/billing/document-company";
import {
  buildDefaultDocumentCompany,
  buildDocumentCompanyHeader,
} from "@/lib/billing/document-pdf-header";
import type { PdfVerification } from "@/lib/billing/verification-html";
import { injectVerificationBlock } from "@/lib/billing/verification-html";

export type QuotePdfOptions = {
  forArchive?: boolean;
  verification?: PdfVerification;
  company?: InvoiceDocumentCompany;
};

export function buildQuotePdfHtml(
  quote: Quote,
  siteUrl: string,
  options?: QuotePdfOptions,
): string {
  const company = options?.company ?? buildDefaultDocumentCompany(siteUrl);

  const lines = quote.lines.length
    ? quote.lines
        .map(
          (line) =>
            `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(line.label)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${formatQuoteAmount(line.amount, quote.currency)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" style="padding:12px;color:#6b7280">Montant forfaitaire</td></tr>`;

  const fxNote =
    quote.currency !== "XOF" && quote.exchangeRateToXof
      ? `<p style="text-align:right;color:#6b7280;font-size:0.75rem;margin-top:0.5rem">Taux figé : 1 ${escapeHtml(quote.currency)} = ${quote.exchangeRateToXof.toLocaleString("fr-FR")} XOF${quote.exchangeRateAt ? ` (${formatQuoteDate(quote.exchangeRateAt)})` : ""}</p>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Devis ${escapeHtml(quote.reference)} — ${escapeHtml(company.agencyName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #0f172a;
      max-width: 820px;
      margin: 0 auto;
      padding: 32px 28px 40px;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    th { text-align: left; padding: 8px 12px; background: #f3f4f6; font-size: 0.75rem; text-transform: uppercase; }
    .total { font-size: 1.25rem; font-weight: 700; color: ${company.primaryColor}; text-align: right; margin-top: 1rem; }
    .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: 0.75rem; color: #9ca3af; }
    @media print { body { margin: 0; padding: 0; } }
  </style>
</head>
<body>
  ${buildDocumentCompanyHeader(company)}

  <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${company.primaryColor}">Devis</p>
  <h2 style="font-size:1.25rem;margin:0 0 0.5rem;color:#0f172a">Devis ${escapeHtml(quote.reference)}</h2>
  <p style="color:#6b7280;font-size:0.875rem;margin:0 0 1.5rem">
    Date : ${formatQuoteDate(quote.createdAt)} · Statut : ${QUOTE_STATUS_LABELS[quote.status]}
  </p>

  <p><strong>Client :</strong> ${escapeHtml(quote.name)}${quote.company ? ` — ${escapeHtml(quote.company)}` : ""}<br/>
  <strong>Email :</strong> ${escapeHtml(quote.email)}${quote.phone ? `<br/><strong>Tél :</strong> ${escapeHtml(quote.phone)}` : ""}</p>

  <p><strong>Projet :</strong> ${escapeHtml(quote.projectLabel)}</p>

  <table>
    <thead><tr><th>Prestation</th><th style="text-align:right">Montant HT</th></tr></thead>
    <tbody>${lines}</tbody>
  </table>

  <p class="total">Total HT : ${formatQuoteAmount(quote.subtotal, quote.currency)}</p>
  ${fxNote}
  ${quote.estimateMin && quote.estimateMax ? `<p style="text-align:right;color:#6b7280;font-size:0.875rem">Fourchette estimée : ${formatQuoteAmount(quote.estimateMin, quote.currency)} – ${formatQuoteAmount(quote.estimateMax, quote.currency)}</p>` : ""}

  ${quote.message ? `<div style="margin-top:2rem;padding:1rem;background:#f9fafb;border-radius:8px"><strong>Notes :</strong><br/>${escapeHtml(quote.message)}</div>` : ""}

  <div class="footer">
    ${escapeHtml(company.agencyName)} — Devis valable 30 jours. TVA non applicable (art. 293 B du CGI) sauf mention contraire.
  </div>
  ${options?.forArchive ? "" : "<script>window.onload=function(){window.print()}</script>"}
</body>
</html>`;

  return injectVerificationBlock(html, options?.verification);
}

export function buildSignedQuotePdfHtml(
  quote: Quote,
  siteUrl: string,
  signature: {
    signerName: string;
    signedAt: string;
    signatureHash: string;
    signatureDataUrl: string;
  },
  options?: QuotePdfOptions,
): string {
  const base = buildQuotePdfHtml(
    { ...quote, status: "signed" },
    siteUrl,
    { ...options, forArchive: true },
  );

  const signedBlock = `
  <div style="margin-top:2.5rem;padding:1.25rem;border:2px solid #059669;border-radius:12px;background:#ecfdf5">
    <p style="margin:0 0 0.75rem;font-size:0.75rem;font-weight:700;text-transform:uppercase;color:#047857">Signature électronique client</p>
    <p style="margin:0 0 0.5rem"><strong>Signé par :</strong> ${escapeHtml(signature.signerName)}</p>
    <p style="margin:0 0 0.5rem"><strong>Date :</strong> ${escapeHtml(new Date(signature.signedAt).toLocaleString("fr-FR"))}</p>
    <p style="margin:0 0 1rem;font-family:monospace;font-size:0.65rem;color:#6b7280;word-break:break-all">Empreinte : ${escapeHtml(signature.signatureHash.slice(0, 32))}…</p>
    <img src="${signature.signatureDataUrl}" alt="Signature" style="max-height:80px;max-width:280px;border-bottom:1px solid #9ca3af" />
  </div>`;

  return base.replace("</body>", `${signedBlock}</body>`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
