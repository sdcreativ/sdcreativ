import { createHash } from "node:crypto";
import { getClientById } from "@/lib/clients";
import { getInvoiceById, type Invoice } from "@/lib/invoices";
import { getQuoteById, type Quote } from "@/lib/quotes";
import { BillingWorkflowError } from "@/lib/billing/workflow";
import type { QuoteStatus } from "@/content/quotes-labels";

export const PORTAL_SIGNABLE_STATUSES: QuoteStatus[] = [
  "sent",
  "viewed",
  "follow_up",
  "negotiation",
];

export function isQuoteExpired(quote: Quote): boolean {
  if (!quote.validUntil) return false;
  return new Date(quote.validUntil).getTime() < Date.now();
}

export async function getPortalQuote(
  portalClientId: string,
  quoteId: string,
): Promise<Quote | null> {
  const quote = await getQuoteById(quoteId);
  if (!quote?.clientId || quote.status === "draft") return null;

  const client = await getClientById(quote.clientId);
  if (!client?.portalClientId || client.portalClientId !== portalClientId) {
    return null;
  }

  return quote;
}

export async function assertPortalQuoteAccess(
  portalClientId: string,
  quoteId: string,
): Promise<Quote> {
  const quote = await getPortalQuote(portalClientId, quoteId);
  if (!quote) {
    throw new BillingWorkflowError("Devis introuvable ou accès refusé.");
  }
  if (quote.status === "expired" || (isQuoteExpired(quote) && PORTAL_SIGNABLE_STATUSES.includes(quote.status))) {
    throw new BillingWorkflowError("Ce devis a expiré.");
  }
  return quote;
}

export function hashSignaturePayload(input: {
  quoteId: string;
  signerName: string;
  signerEmail: string;
  signedAt: string;
  signatureData: string;
}): string {
  return createHash("sha256")
    .update(
      `${input.quoteId}|${input.signerName}|${input.signerEmail}|${input.signedAt}|${input.signatureData.slice(0, 512)}`,
    )
    .digest("hex");
}

export async function getPortalInvoice(
  portalClientId: string,
  invoiceId: string,
): Promise<Invoice | null> {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice?.clientId || invoice.status === "draft" || invoice.status === "cancelled") {
    return null;
  }

  const client = await getClientById(invoice.clientId);
  if (!client?.portalClientId || client.portalClientId !== portalClientId) {
    return null;
  }

  return invoice;
}

export async function assertPortalInvoiceAccess(
  portalClientId: string,
  invoiceId: string,
): Promise<Invoice> {
  const invoice = await getPortalInvoice(portalClientId, invoiceId);
  if (!invoice) {
    throw new BillingWorkflowError("Facture introuvable ou accès refusé.");
  }
  return invoice;
}
