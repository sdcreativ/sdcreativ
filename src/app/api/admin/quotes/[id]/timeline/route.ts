import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { listBillingEvents } from "@/lib/billing/events";
import { getQuoteById } from "@/lib/quotes";
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

    const events = await listBillingEvents("quote", id);
    return NextResponse.json({ events });
  } catch (error) {
    console.error("[api/admin/quotes/timeline] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
