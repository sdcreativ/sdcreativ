import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getQuoteById } from "@/lib/quotes";
import { buildQuotePdfHtml } from "@/lib/quote-pdf";
import { htmlToPdfResponse } from "@/lib/server-pdf";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
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

    const preferHtml = new URL(request.url).searchParams.get("format") === "html";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdcreativ.com";
    const html = buildQuotePdfHtml(quote, siteUrl);

    return htmlToPdfResponse(html, quote.reference || `devis-${id}`, { preferHtml });
  } catch (error) {
    console.error("[api/admin/quotes/pdf] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
