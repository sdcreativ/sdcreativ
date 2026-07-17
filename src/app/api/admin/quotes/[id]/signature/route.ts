import { NextResponse } from "next/server";
import { crmApiAuth } from "@/lib/crm-api-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getQuoteSignatureProof } from "@/lib/signature/quote-proof";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authError = await crmApiAuth.quotes.read();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base non configurée." }, { status: 503 });
  }

  try {
    const { id } = await context.params;
    const proof = await getQuoteSignatureProof(id);
    if (!proof) {
      return NextResponse.json({ error: "Aucune preuve de signature." }, { status: 404 });
    }
    return NextResponse.json({ proof });
  } catch (error) {
    console.error("[api/admin/quotes/signature] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
