import { withDb } from "@/lib/db";
import {
  getLatestBillingDocument,
  getLatestInvoiceBillingDocument,
} from "@/lib/billing/documents";
import type { VerifyDocumentType } from "@/lib/billing/verify-token";
import { isValidVerifyToken } from "@/lib/billing/verify-token";
import { INVOICE_STATUS_LABELS } from "@/content/invoices-labels";
import { QUOTE_STATUS_LABELS } from "@/content/quotes-labels";
import type { QuoteStatus } from "@/content/quotes-labels";
import type { InvoiceStatus } from "@/content/invoices-labels";

export type PublicVerifyResult = {
  valid: boolean;
  type: VerifyDocumentType;
  reference: string;
  status: string;
  statusLabel: string;
  documentHash: string | null;
  documentHashShort: string | null;
  issuedAt: string | null;
  verifiedAt: string;
  message?: string;
};

async function getQuoteByReference(reference: string) {
  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      reference: string;
      status: QuoteStatus;
      created_at: Date;
      signed_at: Date | null;
      sent_at: Date | null;
    }>(
      `SELECT id, reference, status, created_at, signed_at, sent_at
       FROM quotes WHERE reference = $1 LIMIT 1`,
      [reference],
    );
    return rows[0] ?? null;
  });
}

async function getInvoiceByReference(reference: string) {
  return withDb(async (query) => {
    const { rows } = await query<{
      id: string;
      reference: string;
      status: InvoiceStatus;
      created_at: Date;
      sent_at: Date | null;
    }>(
      `SELECT id, reference, status, created_at, sent_at
       FROM invoices WHERE reference = $1 LIMIT 1`,
      [reference],
    );
    return rows[0] ?? null;
  });
}

function hashShort(hash: string | null | undefined): string | null {
  if (!hash) return null;
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

export async function verifyPublicDocument(input: {
  type: VerifyDocumentType;
  reference: string;
  token?: string | null;
}): Promise<PublicVerifyResult> {
  const verifiedAt = new Date().toISOString();
  const invalid = (message: string): PublicVerifyResult => ({
    valid: false,
    type: input.type,
    reference: input.reference,
    status: "unknown",
    statusLabel: "Inconnu",
    documentHash: null,
    documentHashShort: null,
    issuedAt: null,
    verifiedAt,
    message,
  });

  if (!isValidVerifyToken(input.type, input.reference, input.token)) {
    return invalid("Lien de vérification invalide ou expiré.");
  }

  if (input.type === "quote") {
    const quote = await getQuoteByReference(input.reference);
    if (!quote) return invalid("Devis introuvable.");

    const preferredKind =
      quote.status === "signed" || quote.status === "validated" || quote.status === "invoiced"
        ? "signed_quote_pdf"
        : "quote_pdf";
    const doc =
      (await getLatestBillingDocument(quote.id, preferredKind)) ??
      (await getLatestBillingDocument(quote.id, "quote_pdf"));

    const issuedAt = (quote.sent_at ?? quote.signed_at ?? quote.created_at).toISOString();

    return {
      valid: true,
      type: "quote",
      reference: quote.reference,
      status: quote.status,
      statusLabel: QUOTE_STATUS_LABELS[quote.status],
      documentHash: doc?.sha256 ?? null,
      documentHashShort: hashShort(doc?.sha256),
      issuedAt,
      verifiedAt,
      message: doc
        ? "Document authentique — empreinte SHA-256 vérifiée."
        : "Devis enregistré — archive PDF en cours de traitement.",
    };
  }

  const invoice = await getInvoiceByReference(input.reference);
  if (!invoice) return invalid("Facture introuvable.");
  if (invoice.status === "draft" || invoice.status === "cancelled") {
    return invalid("Cette facture n'est pas publique.");
  }

  const doc = await getLatestInvoiceBillingDocument(invoice.id);
  const issuedAt = (invoice.sent_at ?? invoice.created_at).toISOString();

  return {
    valid: true,
    type: "invoice",
    reference: invoice.reference,
    status: invoice.status,
    statusLabel: INVOICE_STATUS_LABELS[invoice.status],
    documentHash: doc?.sha256 ?? null,
    documentHashShort: hashShort(doc?.sha256),
    issuedAt,
    verifiedAt,
    message: doc
      ? "Document authentique — empreinte SHA-256 vérifiée."
      : "Facture enregistrée — archive PDF en cours de traitement.",
  };
}
