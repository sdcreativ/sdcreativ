import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getInvoiceById, getInvoiceRemaining } from "@/lib/invoices";
import { buildInvoicePdfHtml } from "@/lib/invoice-pdf";
import { buildPaymentInstructionsHtml, buildPaymentInstructionsPayload, buildPortalInvoiceUrl } from "@/lib/payment-instructions";
import { getPaymentSettings } from "@/lib/payment-settings";
import { getInvoiceDocumentCompany } from "@/lib/billing/document-company";
import { htmlToPdfResponse } from "@/lib/server-pdf";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const authError = await crmApiAuth.invoices.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const invoice = await getInvoiceById(id);
    if (!invoice) {
      return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
    }

    const preferHtml = new URL(request.url).searchParams.get("format") === "html";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
    const remaining = getInvoiceRemaining(invoice);
    const paymentPayload =
      remaining > 0
        ? buildPaymentInstructionsPayload({
            settings: await getPaymentSettings(),
            invoiceReference: invoice.reference,
            amountDue: remaining,
            currency: invoice.currency,
          })
        : null;
    const html = buildInvoicePdfHtml(invoice, siteUrl, {
      company: await getInvoiceDocumentCompany(siteUrl),
      paymentInstructionsHtml: paymentPayload
        ? buildPaymentInstructionsHtml(
            paymentPayload,
            buildPortalInvoiceUrl(siteUrl, invoice.id),
          )
        : undefined,
    });

    return htmlToPdfResponse(html, invoice.reference || `facture-${id}`, { preferHtml });
  } catch (error) {
    console.error("[api/admin/invoices/[id]/pdf] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
