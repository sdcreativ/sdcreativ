import type { Invoice } from "@/lib/invoices";
import { formatInvoiceAmount, formatInvoiceDate } from "@/content/invoices-labels";
import { escapeHtml } from "@/lib/email";
import { getInvoiceRemaining } from "@/lib/invoices";

export function buildInvoiceEmailHtml(
  invoice: Invoice,
  siteUrl: string,
  customBody?: string,
  paymentInstructionsHtml?: string,
): string {
  const remaining = getInvoiceRemaining(invoice);
  const lines = invoice.lines.length
    ? invoice.lines
        .map(
          (line) =>
            `<tr><td style="padding:6px 0;border-bottom:1px solid #e5e7eb">${escapeHtml(line.label)}</td><td style="padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right">${formatInvoiceAmount(line.amount, invoice.currency)}</td></tr>`,
        )
        .join("")
    : "";

  const bodyHtml = customBody
    ? customBody.split("\n").map((line) => `<p>${escapeHtml(line)}</p>`).join("")
    : `<p>Bonjour ${escapeHtml(invoice.name.split(" ")[0] ?? invoice.name)},</p>
       <p>Veuillez trouver ci-dessous la facture <strong>${escapeHtml(invoice.reference)}</strong>.</p>`;

  return `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111827;max-width:640px">
    ${bodyHtml}
    <div style="margin:24px 0;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase">Facture ${escapeHtml(invoice.reference)}</p>
      <p style="margin:0 0 4px"><strong>Total TTC :</strong> ${formatInvoiceAmount(invoice.total, invoice.currency)}</p>
      ${invoice.dueDate ? `<p style="margin:0 0 12px"><strong>Échéance :</strong> ${formatInvoiceDate(invoice.dueDate)}</p>` : ""}
      ${lines ? `<table style="width:100%;font-size:14px">${lines}</table>` : ""}
      ${remaining > 0 ? `<p style="margin:12px 0 0;font-weight:600;color:#b45309">Reste dû : ${formatInvoiceAmount(remaining, invoice.currency)}</p>` : ""}
    </div>
    ${paymentInstructionsHtml ? `<div style="margin:16px 0"><p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase">Modalités de règlement</p>${paymentInstructionsHtml}</div>` : ""}
    <p style="font-size:13px;color:#6b7280">Merci de votre confiance.</p>
  </div>`;
}

export function buildInvoicePaymentReminderHtml(
  invoice: Invoice,
  siteUrl: string,
  paymentInstructionsHtml?: string,
): string {
  const remaining = getInvoiceRemaining(invoice);
  return buildInvoiceEmailHtml(
    invoice,
    siteUrl,
    `Bonjour ${invoice.name.split(" ")[0] ?? invoice.name},

Sauf erreur de notre part, la facture ${invoice.reference} d'un montant de ${formatInvoiceAmount(invoice.total, invoice.currency)} reste impayée${invoice.dueDate ? ` (échéance : ${formatInvoiceDate(invoice.dueDate)})` : ""}.

Montant restant dû : ${formatInvoiceAmount(remaining, invoice.currency)}.

Merci de procéder au règlement ou de nous contacter si vous avez des questions.`,
    paymentInstructionsHtml,
  );
}
