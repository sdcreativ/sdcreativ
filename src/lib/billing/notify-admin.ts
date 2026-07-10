import { sendEmail } from "@/lib/email";
import type { Quote } from "@/lib/quotes";
import { escapeHtml } from "@/lib/email";

function adminRecipients(): string[] {
  const raw = process.env.CONTACT_TO_EMAIL ?? process.env.CRM_BOOTSTRAP_EMAIL ?? "";
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export async function notifyAdminQuoteSigned(quote: Quote, signerName: string): Promise<boolean> {
  const recipients = adminRecipients();
  if (recipients.length === 0) return false;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const adminUrl = `${siteUrl}/admin/crm/devis?ref=${encodeURIComponent(quote.reference)}`;

  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111827;max-width:640px">
    <p><strong>Devis signé par le client</strong></p>
    <p>Le devis <strong>${escapeHtml(quote.reference)}</strong> a été signé électroniquement par ${escapeHtml(signerName)}.</p>
    <p>Projet : ${escapeHtml(quote.projectLabel)}<br/>
    Montant HT : ${new Intl.NumberFormat("fr-FR").format(quote.subtotal)} FCFA</p>
    <p>Statut CRM : <strong>Signé — en attente de validation</strong></p>
    <p><a href="${escapeHtml(adminUrl)}">Ouvrir dans le CRM</a></p>
  </div>`;

  return sendEmail({
    to: recipients,
    subject: `[CRM] Devis signé — ${quote.reference}`,
    html,
  });
}

export async function notifyAdminQuoteRejected(
  quote: Quote,
  reason: string,
): Promise<boolean> {
  const recipients = adminRecipients();
  if (recipients.length === 0) return false;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const adminUrl = `${siteUrl}/admin/crm/devis?ref=${encodeURIComponent(quote.reference)}`;

  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#111827;max-width:640px">
    <p><strong>Devis refusé par le client</strong></p>
    <p>Le devis <strong>${escapeHtml(quote.reference)}</strong> a été refusé.</p>
    <p>Motif : ${escapeHtml(reason)}</p>
    <p><a href="${escapeHtml(adminUrl)}">Voir dans le CRM</a></p>
  </div>`;

  return sendEmail({
    to: recipients,
    subject: `[CRM] Devis refusé — ${quote.reference}`,
    html,
  });
}
