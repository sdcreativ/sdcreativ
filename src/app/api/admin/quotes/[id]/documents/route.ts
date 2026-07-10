import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { listBillingDocumentsForQuote } from "@/lib/billing/documents";
import { getQuoteById } from "@/lib/quotes";
import { createPresignedDownloadUrl, isS3Configured } from "@/lib/s3";
import { isDatabaseConfigured } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authError = await crmApiAuth.quotes.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const quote = await getQuoteById(id);
    if (!quote) {
      return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
    }

    const documents = await listBillingDocumentsForQuote(id);
    const withUrls = isS3Configured()
      ? await Promise.all(
          documents.map(async (doc) => {
            try {
              const { downloadUrl, expiresIn } = await createPresignedDownloadUrl(doc.s3Key);
              return { ...doc, downloadUrl, expiresIn };
            } catch {
              return { ...doc, downloadUrl: null, expiresIn: 0 };
            }
          }),
        )
      : documents.map((doc) => ({ ...doc, downloadUrl: null, expiresIn: 0 }));

    return NextResponse.json({ documents: withUrls });
  } catch (error) {
    console.error("[api/admin/quotes/documents] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
