import { formatInvoiceAmount } from "@/content/invoices-labels";
import type { PaymentInstructionsPayload, PaymentSettings } from "@/lib/payment-settings-types";
import { isCinetPayConfigured } from "@/lib/payment-settings";

export function buildPortalInvoiceUrl(siteUrl: string, invoiceId: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/espace-client?section=invoices&invoice=${invoiceId}`;
}

export function buildPaymentInstructionsPayload(input: {
  settings: PaymentSettings;
  invoiceReference: string;
  amountDue: number;
}): PaymentInstructionsPayload {
  return {
    ...input.settings,
    referenceLabel: input.invoiceReference,
    amountDue: input.amountDue,
    formattedAmountDue: formatInvoiceAmount(input.amountDue),
    onlineAvailable: input.settings.onlineEnabled && isCinetPayConfigured() && input.amountDue > 0,
  };
}

export function buildPaymentInstructionsHtml(
  payload: PaymentInstructionsPayload,
  portalInvoiceUrl?: string,
): string {
  const rows: string[] = [];

  if (portalInvoiceUrl && payload.amountDue > 0) {
    const payLabel = payload.onlineAvailable
      ? `Payer en ligne — ${payload.formattedAmountDue}`
      : "Accéder à ma facture";
    rows.push(
      `<div style="margin:0 0 16px;text-align:center">
        <a href="${escapeAttr(portalInvoiceUrl)}" style="display:inline-block;padding:14px 28px;background:#059669;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px">${escapeHtml(payLabel)}</a>
        <p style="margin:10px 0 0;font-size:13px;color:#6b7280">Connectez-vous à votre espace client avec l&apos;email de cette facture.</p>
      </div>`,
    );
  }

  if (payload.amountDue > 0) {
    rows.push(
      `<p style="margin:0 0 8px"><strong>Montant à régler :</strong> ${payload.formattedAmountDue}</p>`,
    );
    rows.push(
      `<p style="margin:0 0 12px"><strong>Référence obligatoire :</strong> ${escapeHtml(payload.referenceLabel)}</p>`,
    );
  }

  if (payload.bankName || payload.iban) {
    rows.push(`<p style="margin:12px 0 4px;font-weight:700;color:#1e40af">Virement bancaire</p>`);
    if (payload.accountHolder) rows.push(`<p style="margin:0">Titulaire : ${escapeHtml(payload.accountHolder)}</p>`);
    if (payload.bankName) rows.push(`<p style="margin:0">Banque : ${escapeHtml(payload.bankName)}</p>`);
    if (payload.iban) rows.push(`<p style="margin:0">IBAN / RIB : ${escapeHtml(payload.iban)}</p>`);
    if (payload.bic) rows.push(`<p style="margin:0">BIC : ${escapeHtml(payload.bic)}</p>`);
  }

  const momo: string[] = [];
  if (payload.orangeMoneyNumber) momo.push(`Orange Money : ${escapeHtml(payload.orangeMoneyNumber)}`);
  if (payload.waveNumber) momo.push(`Wave : ${escapeHtml(payload.waveNumber)}`);
  if (payload.mtnMomoNumber) momo.push(`MTN MoMo : ${escapeHtml(payload.mtnMomoNumber)}`);

  if (momo.length > 0) {
    rows.push(`<p style="margin:12px 0 4px;font-weight:700;color:#1e40af">Mobile Money</p>`);
    rows.push(`<p style="margin:0">${momo.join("<br/>")}</p>`);
  }

  if (payload.paymentNote.trim()) {
    rows.push(
      `<p style="margin:12px 0 0;font-size:13px;color:#6b7280">${escapeHtml(payload.paymentNote.trim())}</p>`,
    );
  }

  if (rows.length === 0) {
    return `<p style="margin:0;color:#6b7280">Contactez SD CREATIV pour les coordonnées de règlement.</p>`;
  }

  return `<div style="margin:16px 0;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb">${rows.join("")}</div>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

export function hasManualPaymentDetails(settings: PaymentSettings): boolean {
  return Boolean(
    settings.bankName ||
      settings.iban ||
      settings.orangeMoneyNumber ||
      settings.waveNumber ||
      settings.mtnMomoNumber,
  );
}
