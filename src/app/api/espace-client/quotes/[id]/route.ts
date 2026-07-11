import { NextResponse } from "next/server";
import { getClientSessionFromCookies } from "@/lib/documents-auth";
import { buildClientProfileAsync } from "@/lib/client-portal-db";
import { isDatabaseConfigured } from "@/lib/db";
import { getLatestBillingDocument, listBillingDocumentsForQuote } from "@/lib/billing/documents";
import { PORTAL_SIGNABLE_STATUSES } from "@/lib/billing/portal-access";
import { markQuoteViewed } from "@/lib/billing/view-quote";
import { BillingWorkflowError } from "@/lib/billing/workflow";
import { getPortalQuote } from "@/lib/billing/portal-access";
import { createPresignedDownloadUrl, isS3Configured } from "@/lib/s3";
import { QUOTE_STATUS_LABELS } from "@/content/quotes-labels";

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
    const profile = await buildClientProfileAsync(session.crmPortalId);

    let quote = await getPortalQuote(session.crmPortalId, id);
    if (!quote) {
      return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
    }

    if (PORTAL_SIGNABLE_STATUSES.includes(quote.status)) {
      quote = await markQuoteViewed({
        portalClientId: session.crmPortalId,
        quoteId: id,
        actorName: profile.name,
      });
    }

    const documents = await listBillingDocumentsForQuote(id);
    let downloadUrl: string | null = null;
    if (isS3Configured()) {
      const preferredKind =
        quote.status === "signed" || quote.status === "validated" || quote.status === "invoiced"
          ? "signed_quote_pdf"
          : "quote_pdf";
      const doc =
        (await getLatestBillingDocument(id, preferredKind)) ??
        (await getLatestBillingDocument(id, "quote_pdf"));
      if (doc) {
        const presigned = await createPresignedDownloadUrl(doc.s3Key);
        downloadUrl = presigned.downloadUrl;
      }
    }

    return NextResponse.json({
      quote: {
        id: quote.id,
        reference: quote.reference,
        projectLabel: quote.projectLabel,
        subtotal: quote.subtotal,
        lines: quote.lines,
        status: quote.status,
        statusLabel: QUOTE_STATUS_LABELS[quote.status],
        validUntil: quote.validUntil,
        sentAt: quote.sentAt,
        viewedAt: quote.viewedAt,
        signedAt: quote.signedAt,
        rejectionReason: quote.rejectionReason,
        message: quote.message,
        canSign: PORTAL_SIGNABLE_STATUSES.includes(quote.status),
        canReject: PORTAL_SIGNABLE_STATUSES.includes(quote.status),
        downloadUrl,
      },
      documents: documents.map((d) => ({
        id: d.id,
        kind: d.kind,
        fileName: d.fileName,
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof BillingWorkflowError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[api/espace-client/quotes/[id]] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
