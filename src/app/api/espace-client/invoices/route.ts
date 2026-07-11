import { NextResponse } from "next/server";
import { getClientSessionFromCookies } from "@/lib/documents-auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  countUnpaidInvoicesForPortal,
  listInvoicesForPortalClient,
  getInvoiceRemaining,
} from "@/lib/invoices";
import { getLatestInvoiceBillingDocument } from "@/lib/billing/documents";
import { createPresignedDownloadUrl, isS3Configured } from "@/lib/s3";
import { INVOICE_STATUS_LABELS } from "@/content/invoices-labels";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const [invoices, unpaidCount] = await Promise.all([
      listInvoicesForPortalClient(session.crmPortalId),
      countUnpaidInvoicesForPortal(session.crmPortalId),
    ]);

    const summaries = await Promise.all(
      invoices.map(async (invoice) => {
        let downloadUrl: string | null = null;
        if (isS3Configured()) {
          try {
            const doc = await getLatestInvoiceBillingDocument(invoice.id);
            if (doc) {
              const { downloadUrl: url } = await createPresignedDownloadUrl(doc.s3Key);
              downloadUrl = url;
            }
          } catch (s3Error) {
            console.error("[api/espace-client/invoices] presign", invoice.id, s3Error);
          }
        }

        return {
          id: invoice.id,
          reference: invoice.reference,
          quoteId: invoice.quoteId,
          total: invoice.total,
          paidAmount: invoice.paidAmount,
          remaining: getInvoiceRemaining(invoice),
          status: invoice.status,
          statusLabel: INVOICE_STATUS_LABELS[invoice.status],
          dueDate: invoice.dueDate,
          sentAt: invoice.sentAt,
          paidAt: invoice.paidAt,
          downloadUrl,
        };
      }),
    );

    return NextResponse.json({ invoices: summaries, unpaidCount });
  } catch (error) {
    console.error("[api/espace-client/invoices] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
