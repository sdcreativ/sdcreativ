import type { Invoice } from "@/lib/invoices";
import {
  formatInvoiceAmount,
  formatInvoiceDate,
  INVOICE_STATUS_LABELS,
} from "@/content/invoices-labels";

export function buildInvoicePdfHtml(invoice: Invoice, siteUrl: string): string {
  const lines = invoice.lines.length
    ? invoice.lines
        .map(
          (line) =>
            `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(line.label)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${formatInvoiceAmount(line.amount)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" style="padding:12px;color:#6b7280">Aucune ligne</td></tr>`;

  const remaining = invoice.total - invoice.paidAmount;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Facture ${escapeHtml(invoice.reference)} — SD CREATIV</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #111827; max-width: 800px; margin: 40px auto; padding: 0 24px; }
    h1 { color: #1e40af; font-size: 1.5rem; margin-bottom: 0.25rem; }
    .meta { color: #6b7280; font-size: 0.875rem; margin-bottom: 2rem; }
    table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; }
    th { text-align: left; padding: 8px 12px; background: #f3f4f6; font-size: 0.75rem; text-transform: uppercase; }
    .total { font-size: 1.125rem; font-weight: 700; color: #1e40af; text-align: right; margin-top: 0.5rem; }
    .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; font-size: 0.75rem; color: #9ca3af; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>SD CREATIV</h1>
  <p class="meta">Agence Web & Solutions Digitales · ${escapeHtml(siteUrl)}</p>

  <h2 style="font-size:1.125rem;margin-bottom:0.5rem">Facture ${escapeHtml(invoice.reference)}</h2>
  <p class="meta">
    Date : ${formatInvoiceDate(invoice.createdAt)} · Statut : ${INVOICE_STATUS_LABELS[invoice.status]}
    ${invoice.dueDate ? ` · Échéance : ${formatInvoiceDate(invoice.dueDate)}` : ""}
  </p>

  <p><strong>Client :</strong> ${escapeHtml(invoice.name)}${invoice.company ? ` — ${escapeHtml(invoice.company)}` : ""}<br/>
  <strong>Email :</strong> ${escapeHtml(invoice.email)}</p>

  <table>
    <thead><tr><th>Prestation</th><th style="text-align:right">Montant HT</th></tr></thead>
    <tbody>${lines}</tbody>
  </table>

  <p class="total">Sous-total HT : ${formatInvoiceAmount(invoice.subtotal)}</p>
  <p class="total">TVA (${invoice.tvaRate} %) : ${formatInvoiceAmount(invoice.tvaAmount)}</p>
  <p class="total">Total TTC : ${formatInvoiceAmount(invoice.total)}</p>
  ${invoice.paidAmount > 0 ? `<p style="text-align:right;color:#059669">Payé : ${formatInvoiceAmount(invoice.paidAmount)} · Reste dû : ${formatInvoiceAmount(remaining)}</p>` : ""}

  ${invoice.notes ? `<div style="margin-top:2rem;padding:1rem;background:#f9fafb;border-radius:8px"><strong>Notes :</strong><br/>${escapeHtml(invoice.notes)}</div>` : ""}

  <div class="footer">
    SD CREATIV — Merci pour votre confiance. Règlement par virement ou mobile money sur demande.
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
