import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { createQuote, createQuoteSchema, listQuotesFiltered, type QuoteListFilters } from "@/lib/quotes";
import { QUOTE_STATUSES, type QuoteStatus } from "@/content/quotes-labels";

export async function GET(request: Request) {
  const authError = await crmApiAuth.quotes.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as QuoteStatus | null;
    const clientId = searchParams.get("clientId")?.trim() || undefined;
    const q = searchParams.get("q")?.trim() || undefined;
    const dateFrom = searchParams.get("dateFrom")?.trim() || undefined;
    const dateTo = searchParams.get("dateTo")?.trim() || undefined;
    const amountMin = searchParams.get("amountMin") ? Number(searchParams.get("amountMin")) : undefined;
    const amountMax = searchParams.get("amountMax") ? Number(searchParams.get("amountMax")) : undefined;

    const filters: QuoteListFilters = {
      status: status && QUOTE_STATUSES.includes(status) ? status : undefined,
      clientId,
      q,
      dateFrom,
      dateTo,
      amountMin: amountMin && !Number.isNaN(amountMin) ? amountMin : undefined,
      amountMax: amountMax && !Number.isNaN(amountMax) ? amountMax : undefined,
    };

    const quotes = await listQuotesFiltered(filters);
    return NextResponse.json({ quotes });
  } catch (error) {
    console.error("[api/admin/quotes] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = await crmApiAuth.quotes.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = createQuoteSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Données invalides.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const quote = await createQuote(parsed.data);
    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/quotes] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
