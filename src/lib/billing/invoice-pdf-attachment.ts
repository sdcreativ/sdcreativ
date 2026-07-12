import { buildDocumentVerificationAssets } from "@/lib/billing/qr";
import { getInvoiceDocumentCompany } from "@/lib/billing/document-company";
import { getLatestInvoiceBillingDocument } from "@/lib/billing/documents";
import { renderHtmlToDocument } from "@/lib/billing/pdf";
import { buildInvoicePdfHtml } from "@/lib/invoice-pdf";
import { getInvoiceRemaining, type Invoice } from "@/lib/invoices";
import { buildPaymentInstructionsHtml, buildPaymentInstructionsPayload, buildPortalInvoiceUrl } from "@/lib/payment-instructions";
import { getPaymentSettings } from "@/lib/payment-settings";
import { downloadObjectBuffer, isS3Configured } from "@/lib/s3";

export type InvoiceEmailAttachment = {
  filename: string;
  content: Buffer;
  mimeType: string;
};

async function generateInvoicePdfAttachment(invoice: Invoice): Promise<InvoiceEmailAttachment> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
  const remaining = getInvoiceRemaining(invoice);
  const paymentPayload =
    remaining > 0
      ? buildPaymentInstructionsPayload({
          settings: await getPaymentSettings(),
          invoiceReference: invoice.reference,
          amountDue: remaining,
        })
      : null;

  const html = buildInvoicePdfHtml(invoice, siteUrl, {
    forArchive: true,
    verification: await buildDocumentVerificationAssets("facture", invoice.reference),
    company: await getInvoiceDocumentCompany(siteUrl),
    paymentInstructionsHtml: paymentPayload
      ? buildPaymentInstructionsHtml(
          paymentPayload,
          buildPortalInvoiceUrl(siteUrl, invoice.id),
        )
      : undefined,
  });

  const rendered = await renderHtmlToDocument(html);
  return {
    filename: `facture-${invoice.reference}.${rendered.extension}`,
    content: rendered.buffer,
    mimeType: rendered.mimeType,
  };
}

export async function resolveInvoicePdfAttachment(
  invoice: Invoice,
): Promise<InvoiceEmailAttachment> {
  const archived = await getLatestInvoiceBillingDocument(invoice.id);

  if (archived && isS3Configured()) {
    try {
      const content = await downloadObjectBuffer(archived.s3Key);
      return {
        filename: archived.fileName,
        content,
        mimeType: archived.mimeType,
      };
    } catch (error) {
      console.warn("[invoice-pdf-attachment] S3 fallback génération PDF", invoice.id, error);
    }
  }

  return generateInvoicePdfAttachment(invoice);
}
