import { buildInvoiceEmailHtml } from "@/lib/invoice-email";
import { buildInvoicePdfHtml } from "@/lib/invoice-pdf";
import { buildPaymentInstructionsHtml, buildPaymentInstructionsPayload } from "@/lib/payment-instructions";
import { getPaymentSettings } from "@/lib/payment-settings";
import { getInvoiceDocumentCompany } from "@/lib/billing/document-company";
import { getClientById } from "@/lib/clients";
import { portalNotificationPrefAllows } from "@/lib/client-portal-settings";
import { sendEmail } from "@/lib/email";
import {
  createInvoice,
  getInvoiceByQuoteId,
  getInvoiceRemaining,
  type Invoice,
} from "@/lib/invoices";
import { getQuoteById, type Quote } from "@/lib/quotes";
import { withDb } from "@/lib/db";
import { saveBillingDocument } from "@/lib/billing/documents";
import { logBillingEvent } from "@/lib/billing/events";
import { createPortalBillingNotification } from "@/lib/billing/notifications";
import { renderHtmlToDocument } from "@/lib/billing/pdf";
import { buildDocumentVerificationAssets } from "@/lib/billing/qr";
import { resolveClientForQuote } from "@/lib/billing/resolve-client";
import type { BillingActor } from "@/lib/billing/types";
import {
  assertQuoteTransition,
  BillingWorkflowError,
} from "@/lib/billing/workflow";
import { logCrmAudit } from "@/lib/crm-audit";
import { formatInvoiceAmount, formatInvoiceDate } from "@/content/invoices-labels";
import type { QuoteStatus } from "@/content/quotes-labels";

const INVOICEABLE_STATUSES: QuoteStatus[] = ["validated", "accepted"];

export type GenerateInvoiceResult = {
  invoice: Invoice;
  quote: Quote;
  documentId: string;
  emailSent: boolean;
  portalClientId: string;
  alreadyExists: boolean;
};

async function markQuoteInvoiced(quoteId: string): Promise<Quote | null> {
  await withDb(async (query) => {
    await query(
      `UPDATE quotes SET status = 'invoiced', updated_at = NOW() WHERE id = $1`,
      [quoteId],
    );
  });
  return getQuoteById(quoteId);
}

function buildInvoiceEmailBody(invoice: Invoice, siteUrl: string, portalUrl: string): string {
  const remaining = getInvoiceRemaining(invoice);
  return `Bonjour ${invoice.name.split(" ")[0] ?? invoice.name},

Votre facture ${invoice.reference} est disponible dans votre espace client SD CREATIV.

Total TTC : ${formatInvoiceAmount(invoice.total)}
${invoice.dueDate ? `Échéance : ${formatInvoiceDate(invoice.dueDate)}` : ""}
${remaining > 0 ? `Reste dû : ${formatInvoiceAmount(remaining)}` : ""}

Consultez et téléchargez votre facture ici :
${portalUrl}

Pour toute question, contactez-nous via ${siteUrl}/contact.`;
}

export async function generateInvoiceFromQuote(input: {
  quoteId: string;
  actor: BillingActor;
  auditActor?: { userId: string | null; name: string; email: string | null };
  sendEmail?: boolean;
}): Promise<GenerateInvoiceResult> {
  const quote = await getQuoteById(input.quoteId);
  if (!quote) {
    throw new BillingWorkflowError("Devis introuvable.");
  }

  const existing = await getInvoiceByQuoteId(quote.id);
  if (existing) {
    const updatedQuote = quote.status === "invoiced" ? quote : await markQuoteInvoiced(quote.id);
    if (!updatedQuote) {
      throw new BillingWorkflowError("Devis introuvable.");
    }
    const { portalClientId } = await resolveClientForQuote(updatedQuote);
    return {
      invoice: existing,
      quote: updatedQuote,
      documentId: "",
      emailSent: false,
      portalClientId,
      alreadyExists: true,
    };
  }

  if (!INVOICEABLE_STATUSES.includes(quote.status)) {
    throw new BillingWorkflowError(
      `Ce devis ne peut pas être facturé depuis le statut « ${quote.status} ».`,
    );
  }

  assertQuoteTransition(quote.status, "invoiced");

  const { clientId, portalClientId } = await resolveClientForQuote(quote);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const portalUrl = `${siteUrl}/espace-client?section=invoices`;

  const lines = quote.lines.length
    ? quote.lines
    : [{ label: "Prestation", amount: quote.subtotal }];

  const invoice = await createInvoice({
    clientId,
    quoteId: quote.id,
    name: quote.name,
    email: quote.email,
    company: quote.company,
    lines,
    tvaRate: 18,
    status: "sent",
    dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  });

  const html = buildInvoicePdfHtml(invoice, siteUrl, {
    forArchive: true,
    verification: await buildDocumentVerificationAssets("facture", invoice.reference),
    company: await getInvoiceDocumentCompany(siteUrl),
    paymentInstructionsHtml: buildPaymentInstructionsHtml(
      buildPaymentInstructionsPayload({
        settings: await getPaymentSettings(),
        invoiceReference: invoice.reference,
        amountDue: getInvoiceRemaining(invoice),
      }),
    ),
  });
  const rendered = await renderHtmlToDocument(html);

  const document = await saveBillingDocument({
    quoteId: quote.id,
    invoiceId: invoice.id,
    kind: "invoice_pdf",
    portalClientId,
    quoteIdForKey: quote.id,
    fileNameBase: `facture-${invoice.reference}`,
    buffer: rendered.buffer,
    mimeType: rendered.mimeType,
    extension: rendered.extension,
    metadata: {
      reference: invoice.reference,
      quoteReference: quote.reference,
      format: rendered.extension,
    },
  });

  const updatedQuote = await markQuoteInvoiced(quote.id);
  if (!updatedQuote) {
    throw new BillingWorkflowError("Échec de la mise à jour du devis.");
  }

  let emailSent = false;
  const client = await getClientById(clientId);
  const allowInvoiceEmail =
    !client || portalNotificationPrefAllows(client.metadata, "notifyInvoices");
  if (input.sendEmail !== false && allowInvoiceEmail) {
    const remaining = getInvoiceRemaining(invoice);
    const paymentPayload = buildPaymentInstructionsPayload({
      settings: await getPaymentSettings(),
      invoiceReference: invoice.reference,
      amountDue: remaining,
    });
    const body = buildInvoiceEmailBody(invoice, siteUrl, portalUrl);
    emailSent = await sendEmail({
      to: invoice.email,
      subject: `Votre facture ${invoice.reference} — SD CREATIV`,
      html: buildInvoiceEmailHtml(
        invoice,
        siteUrl,
        body,
        remaining > 0 ? buildPaymentInstructionsHtml(paymentPayload) : undefined,
      ),
      replyTo: process.env.CONTACT_FROM_EMAIL ?? undefined,
    });
  }

  await logBillingEvent({
    entityType: "invoice",
    entityId: invoice.id,
    action: "invoice.generated",
    actor: input.actor,
    fromStatus: "draft",
    toStatus: "sent",
    summary: `Facture ${invoice.reference} générée depuis le devis ${quote.reference}.`,
    metadata: {
      documentId: document.id,
      s3Key: document.s3Key,
      emailSent,
      quoteId: quote.id,
      portalClientId,
    },
  });

  await logBillingEvent({
    entityType: "quote",
    entityId: quote.id,
    action: "quote.invoiced",
    actor: input.actor,
    fromStatus: quote.status,
    toStatus: "invoiced",
    summary: `Devis ${quote.reference} facturé (${invoice.reference}).`,
    metadata: {
      invoiceId: invoice.id,
      documentId: document.id,
    },
  });

  if (input.auditActor) {
    await logCrmAudit({
      actor: input.auditActor,
      action: "invoice.generate",
      entityType: "invoice",
      entityId: invoice.id,
      summary: `Génération de la facture ${invoice.reference} depuis ${quote.reference}`,
      metadata: { quoteId: quote.id, documentId: document.id, emailSent },
    });
  }

  void createPortalBillingNotification({
    portalClientId,
    eventType: "invoice.generated",
    title: `Nouvelle facture — ${invoice.reference}`,
    message: `Votre facture ${invoice.reference} est disponible dans votre espace client.`,
    linkHref: "/espace-client?section=invoices",
    entityType: "invoice",
    entityId: invoice.id,
  });

  return {
    invoice,
    quote: updatedQuote,
    documentId: document.id,
    emailSent,
    portalClientId,
    alreadyExists: false,
  };
}
