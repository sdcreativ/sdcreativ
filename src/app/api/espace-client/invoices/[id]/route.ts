import { NextResponse } from "next/server";
import { getClientSessionFromCookies } from "@/lib/documents-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getInvoiceRemaining } from "@/lib/invoices";
import {
  getLatestInvoiceBillingDocument,
  listBillingDocumentsForInvoice,
} from "@/lib/billing/documents";
import { getPortalInvoice } from "@/lib/billing/portal-access";
import { createPresignedDownloadUrl, isS3Configured } from "@/lib/s3";
import { INVOICE_STATUS_LABELS, formatInvoiceAmount } from "@/content/invoices-labels";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const invoice = await getPortalInvoice(session.clientId, id);
    if (!invoice) {
      return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
    }

    const documents = await listBillingDocumentsForInvoice(id);
    let downloadUrl: string | null = null;
    if (isS3Configured()) {
      const doc = await getLatestInvoiceBillingDocument(id);
      if (doc) {
        const presigned = await createPresignedDownloadUrl(doc.s3Key);
        downloadUrl = presigned.downloadUrl;
      }
    }

    const remaining = getInvoiceRemaining(invoice);

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        reference: invoice.reference,
        quoteId: invoice.quoteId,
        name: invoice.name,
        company: invoice.company,
        lines: invoice.lines,
        subtotal: invoice.subtotal,
        tvaRate: invoice.tvaRate,
        tvaAmount: invoice.tvaAmount,
        total: invoice.total,
        paidAmount: invoice.paidAmount,
        remaining,
        status: invoice.status,
        statusLabel: INVOICE_STATUS_LABELS[invoice.status],
        dueDate: invoice.dueDate,
        sentAt: invoice.sentAt,
        paidAt: invoice.paidAt,
        downloadUrl,
        formattedTotal: formatInvoiceAmount(invoice.total),
        formattedRemaining: formatInvoiceAmount(remaining),
      },
      documents: documents.map((d) => ({
        id: d.id,
        kind: d.kind,
        fileName: d.fileName,
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    console.error("[api/espace-client/invoices/[id]] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
