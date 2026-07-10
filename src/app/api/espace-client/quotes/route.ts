import { NextResponse } from "next/server";
import { getClientSessionFromCookies } from "@/lib/documents-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { countActionableQuotesForPortal, listQuotesForPortalClient } from "@/lib/quotes";
import { getLatestBillingDocument } from "@/lib/billing/documents";
import { createPresignedDownloadUrl, isS3Configured } from "@/lib/s3";
import { QUOTE_STATUS_LABELS } from "@/content/quotes-labels";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const session = await getClientSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const [quotes, pendingCount] = await Promise.all([
      listQuotesForPortalClient(session.clientId),
      countActionableQuotesForPortal(session.clientId),
    ]);

    const summaries = await Promise.all(
      quotes.map(async (quote) => {
        let downloadUrl: string | null = null;
        if (isS3Configured()) {
          const kind = quote.status === "signed" || quote.status === "validated" || quote.status === "invoiced"
            ? "signed_quote_pdf"
            : "quote_pdf";
          const doc = await getLatestBillingDocument(quote.id, kind);
          if (!doc && kind === "signed_quote_pdf") {
            const fallback = await getLatestBillingDocument(quote.id, "quote_pdf");
            if (fallback) {
              const { downloadUrl: url } = await createPresignedDownloadUrl(fallback.s3Key);
              downloadUrl = url;
            }
          } else if (doc) {
            const { downloadUrl: url } = await createPresignedDownloadUrl(doc.s3Key);
            downloadUrl = url;
          }
        }

        return {
          id: quote.id,
          reference: quote.reference,
          projectLabel: quote.projectLabel,
          subtotal: quote.subtotal,
          status: quote.status,
          statusLabel: QUOTE_STATUS_LABELS[quote.status],
          validUntil: quote.validUntil,
          sentAt: quote.sentAt,
          signedAt: quote.signedAt,
          downloadUrl,
        };
      }),
    );

    return NextResponse.json({ quotes: summaries, pendingCount });
  } catch (error) {
    console.error("[api/espace-client/quotes] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
