import { buildQuoteEmailHtml } from "@/lib/quote-email";
import { buildQuotePdfHtml } from "@/lib/quote-pdf";
import { sendEmail } from "@/lib/email";
import { getClientById } from "@/lib/clients";
import { portalNotificationPrefAllows } from "@/lib/client-portal-settings";
import { updateLead } from "@/lib/leads";
import { getQuoteById, type Quote } from "@/lib/quotes";
import { formatQuoteAmount } from "@/content/quotes-labels";
import { withDb } from "@/lib/db";
import { saveBillingDocument } from "@/lib/billing/documents";
import { logBillingEvent } from "@/lib/billing/events";
import { createPortalBillingNotification } from "@/lib/billing/notifications";
import { buildDocumentVerificationAssets } from "@/lib/billing/qr";
import { renderHtmlToDocument } from "@/lib/billing/pdf";
import { resolveClientForQuote } from "@/lib/billing/resolve-client";
import type { BillingActor } from "@/lib/billing/types";
import {
  assertQuoteTransition,
  BillingWorkflowError,
  canPublishQuote,
  computeQuoteValidUntil,
} from "@/lib/billing/workflow";
import { logCrmAudit } from "@/lib/crm-audit";

export type PublishQuoteResult = {
  quote: Quote;
  documentId: string;
  emailSent: boolean;
  portalClientId: string;
};

async function markQuotePublished(
  quoteId: string,
  input: {
    clientId: string;
    validUntil: Date;
  },
): Promise<Quote | null> {
  await withDb(async (query) => {
    await query(
      `UPDATE quotes SET
        status = 'sent',
        client_id = $2,
        sent_at = COALESCE(sent_at, NOW()),
        valid_until = $3,
        updated_at = NOW()
      WHERE id = $1`,
      [quoteId, input.clientId, input.validUntil],
    );
  });
  return getQuoteById(quoteId);
}

function buildPublishEmailBody(quote: Quote, siteUrl: string, portalUrl: string): string {
  return `Bonjour ${quote.name.split(" ")[0] ?? quote.name},

Votre devis ${quote.reference} est disponible dans votre espace client SD CREATIV.

Montant HT : ${formatQuoteAmount(quote.subtotal, quote.currency)}
Projet : ${quote.projectLabel}

Consultez et signez votre devis ici :
${portalUrl}

Vous pouvez aussi nous répondre directement à ${siteUrl}/contact si vous avez des questions.`;
}

export async function publishQuote(input: {
  quoteId: string;
  actor: BillingActor;
  auditActor?: { userId: string | null; name: string; email: string | null };
  sendEmail?: boolean;
}): Promise<PublishQuoteResult> {
  const quote = await getQuoteById(input.quoteId);
  if (!quote) {
    throw new BillingWorkflowError("Devis introuvable.");
  }

  if (!canPublishQuote(quote.status)) {
    throw new BillingWorkflowError(
      `Ce devis ne peut pas être publié depuis le statut « ${quote.status} ».`,
    );
  }

  assertQuoteTransition(quote.status, "sent");

  const { clientId, portalClientId } = await resolveClientForQuote(quote);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const portalUrl = `${siteUrl}/espace-client?section=quotes`;
  const validUntil = computeQuoteValidUntil();

  const html = buildQuotePdfHtml(
    { ...quote, clientId, status: "sent", validUntil: validUntil.toISOString() },
    siteUrl,
    { forArchive: true, verification: await buildDocumentVerificationAssets("devis", quote.reference) },
  );
  const rendered = await renderHtmlToDocument(html);

  const document = await saveBillingDocument({
    quoteId: quote.id,
    kind: "quote_pdf",
    portalClientId,
    quoteIdForKey: quote.id,
    fileNameBase: `devis-${quote.reference}`,
    buffer: rendered.buffer,
    mimeType: rendered.mimeType,
    extension: rendered.extension,
    metadata: {
      reference: quote.reference,
      format: rendered.extension,
    },
  });

  const updatedQuote = await markQuotePublished(quote.id, {
    clientId,
    validUntil,
  });

  if (!updatedQuote) {
    throw new BillingWorkflowError("Échec de la mise à jour du devis.");
  }

  let emailSent = false;
  const client = await getClientById(clientId);
  const allowQuoteEmail =
    !client || portalNotificationPrefAllows(client.metadata, "notifyQuotes");
  if (input.sendEmail !== false && allowQuoteEmail) {
    const body = buildPublishEmailBody(updatedQuote, siteUrl, portalUrl);
    emailSent = await sendEmail({
      to: updatedQuote.email,
      subject: `Votre devis ${updatedQuote.reference} — SD CREATIV`,
      html: buildQuoteEmailHtml(updatedQuote, siteUrl, body),
      replyTo: process.env.CONTACT_FROM_EMAIL ?? undefined,
    });
  }

  if (updatedQuote.leadId) {
    void updateLead(updatedQuote.leadId, { status: "quote_sent" });
  }

  await logBillingEvent({
    entityType: "quote",
    entityId: quote.id,
    action: "quote.published",
    actor: input.actor,
    fromStatus: quote.status,
    toStatus: "sent",
    summary: `Devis ${quote.reference} publié et archivé sur S3.`,
    metadata: {
      documentId: document.id,
      s3Key: document.s3Key,
      emailSent,
      portalClientId,
      validUntil: validUntil.toISOString(),
    },
  });

  if (input.auditActor) {
    await logCrmAudit({
      actor: input.auditActor,
      action: "quote.publish",
      entityType: "quote",
      entityId: quote.id,
      summary: `Publication du devis ${quote.reference}`,
      metadata: { documentId: document.id, emailSent },
    });
  }

  void createPortalBillingNotification({
    portalClientId,
    eventType: "quote.published",
    title: `Nouveau devis — ${updatedQuote.reference}`,
    message: `Votre devis ${updatedQuote.reference} est disponible dans votre espace client.`,
    linkHref: "/espace-client?section=quotes",
    entityType: "quote",
    entityId: quote.id,
  });

  return {
    quote: updatedQuote,
    documentId: document.id,
    emailSent,
    portalClientId,
  };
}
