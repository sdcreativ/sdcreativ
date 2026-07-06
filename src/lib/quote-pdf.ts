import type { Quote } from "@/lib/quotes";
import { formatQuoteAmount, formatQuoteDate } from "@/content/quotes-labels";
import { QUOTE_STATUS_LABELS } from "@/content/quotes-labels";

export function buildQuotePdfHtml(quote: Quote, siteUrl: string): string {
  const lines = quote.lines.length
    ? quote.lines
        .map(
          (line) =>
            `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(line.label)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${formatQuoteAmount(line.amount)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" style="padding:12px;color:#6b7280">Montant forfaitaire</td></tr>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Devis ${escapeHtml(quote.reference)} — SD CREATIV</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #111827; max-width: 800px; margin: 40px auto; padding: 0 24px; }
    h1 { color: #1e40af; font-size: 1.5rem; margin-bottom: 0.25rem; }
    .meta { color: #6b7280; font-size: 0.875rem; margin-bottom: 2rem; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    th { text-align: left; padding: 8px 12px; background: #f3f4f6; font-size: 0.75rem; text-transform: uppercase; }
    .total { font-size: 1.25rem; font-weight: 700; color: #1e40af; text-align: right; margin-top: 1rem; }
    .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: 0.75rem; color: #9ca3af; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>SD CREATIV</h1>
  <p class="meta">Agence Web & Solutions Digitales · ${escapeHtml(siteUrl)}</p>

  <h2 style="font-size:1.125rem;margin-bottom:0.5rem">Devis ${escapeHtml(quote.reference)}</h2>
  <p class="meta">
    Date : ${formatQuoteDate(quote.createdAt)} · Statut : ${QUOTE_STATUS_LABELS[quote.status]}
  </p>

  <p><strong>Client :</strong> ${escapeHtml(quote.name)}${quote.company ? ` — ${escapeHtml(quote.company)}` : ""}<br/>
  <strong>Email :</strong> ${escapeHtml(quote.email)}${quote.phone ? `<br/><strong>Tél :</strong> ${escapeHtml(quote.phone)}` : ""}</p>

  <p><strong>Projet :</strong> ${escapeHtml(quote.projectLabel)}</p>

  <table>
    <thead><tr><th>Prestation</th><th style="text-align:right">Montant HT</th></tr></thead>
    <tbody>${lines}</tbody>
  </table>

  <p class="total">Total HT : ${formatQuoteAmount(quote.subtotal)}</p>
  ${quote.estimateMin && quote.estimateMax ? `<p style="text-align:right;color:#6b7280;font-size:0.875rem">Fourchette estimée : ${formatQuoteAmount(quote.estimateMin)} – ${formatQuoteAmount(quote.estimateMax)}</p>` : ""}

  ${quote.message ? `<div style="margin-top:2rem;padding:1rem;background:#f9fafb;border-radius:8px"><strong>Notes :</strong><br/>${escapeHtml(quote.message)}</div>` : ""}

  <div class="footer">
    SD CREATIV — Devis valable 30 jours. TVA non applicable (art. 293 B du CGI) sauf mention contraire.
  </div>
  <script>window.onload=function(){window.print()}</script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
