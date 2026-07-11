import { createHash } from "node:crypto";
import { withDb } from "@/lib/db";
import { getQuoteById, type Quote } from "@/lib/quotes";
import { getClientById } from "@/lib/clients";
import { saveBillingDocument } from "@/lib/billing/documents";
import { logBillingEvent } from "@/lib/billing/events";
import { createAdminBillingNotification } from "@/lib/billing/notifications";
import { notifyAdminQuoteSigned } from "@/lib/billing/notify-admin";
import { buildDocumentVerificationAssets } from "@/lib/billing/qr";
import { assertPortalQuoteAccess, PORTAL_SIGNABLE_STATUSES } from "@/lib/billing/portal-access";
import { renderHtmlToDocument } from "@/lib/billing/pdf";
import { assertQuoteTransition, BillingWorkflowError } from "@/lib/billing/workflow";
import { buildSignedQuotePdfHtml } from "@/lib/quote-pdf";

export type SignPortalQuoteInput = {
  portalClientId: string;
  quoteId: string;
  signerName: string;
  signatureData: string;
  acceptTerms: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  actorEmail?: string;
};

export async function signPortalQuote(input: SignPortalQuoteInput): Promise<Quote> {
  if (!input.acceptTerms) {
    throw new BillingWorkflowError("Vous devez accepter les conditions pour signer.");
  }

  const signerName = input.signerName.trim();
  if (signerName.length < 2) {
    throw new BillingWorkflowError("Indiquez votre nom complet pour signer.");
  }

  if (!input.signatureData.startsWith("data:image/")) {
    throw new BillingWorkflowError("Signature invalide.");
  }

  const quote = await assertPortalQuoteAccess(input.portalClientId, input.quoteId);

  if (!PORTAL_SIGNABLE_STATUSES.includes(quote.status)) {
    throw new BillingWorkflowError("Ce devis ne peut plus être signé.");
  }

  assertQuoteTransition(quote.status, "signed");

  const signedAt = new Date();
  const signatureHash = createHash("sha256")
    .update(`${quote.id}|${signerName}|${signedAt.toISOString()}|${input.signatureData.slice(0, 1024)}`)
    .digest("hex");

  const client = quote.clientId ? await getClientById(quote.clientId) : null;
  const portalClientId = client?.portalClientId ?? input.portalClientId;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const verification = await buildDocumentVerificationAssets("devis", quote.reference);
  const html = buildSignedQuotePdfHtml(quote, siteUrl, {
    signerName,
    signedAt: signedAt.toISOString(),
    signatureHash,
    signatureDataUrl: input.signatureData,
  }, { verification });
  const rendered = await renderHtmlToDocument(html);

  const signedDocument = await saveBillingDocument({
    quoteId: quote.id,
    kind: "signed_quote_pdf",
    portalClientId,
    quoteIdForKey: quote.id,
    fileNameBase: `devis-signe-${quote.reference}`,
    buffer: rendered.buffer,
    mimeType: rendered.mimeType,
    extension: rendered.extension,
    metadata: { signatureHash, signerName },
  });

  await withDb(async (query) => {
    await query(
      `INSERT INTO quote_signatures (
        quote_id, signer_name, signer_email, signature_data, signature_hash,
        ip_address, user_agent, signed_at, proof_document_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (quote_id) DO NOTHING`,
      [
        quote.id,
        signerName,
        input.actorEmail ?? quote.email,
        input.signatureData,
        signatureHash,
        input.ipAddress ?? null,
        input.userAgent ?? null,
        signedAt,
        signedDocument.id,
      ],
    );

    await query(
      `UPDATE quotes SET status = 'signed', signed_at = $2, updated_at = NOW() WHERE id = $1`,
      [quote.id, signedAt],
    );
  });

  await logBillingEvent({
    entityType: "quote",
    entityId: quote.id,
    action: "quote.signed",
    actor: { type: "client", id: input.portalClientId, name: signerName },
    fromStatus: quote.status,
    toStatus: "signed",
    summary: `Devis ${quote.reference} signé électroniquement.`,
    metadata: { signatureHash, documentId: signedDocument.id },
  });

  const updated = await getQuoteById(quote.id);
  if (!updated) throw new BillingWorkflowError("Devis introuvable.");

  void notifyAdminQuoteSigned(updated, signerName);
  void createAdminBillingNotification({
    eventType: "quote.signed",
    title: `Devis signé — ${updated.reference}`,
    message: `${signerName} a signé le devis ${updated.reference}.`,
    linkHref: `/admin/crm/devis?id=${updated.id}`,
    entityType: "quote",
    entityId: updated.id,
  });
  return updated;
}
