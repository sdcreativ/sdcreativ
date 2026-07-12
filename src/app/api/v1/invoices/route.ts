import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { apiKeyHasScope, verifyApiKeyFromRequest } from "@/lib/api-keys";
import { getAccountingExportRows } from "@/lib/accounting-export";

/** API publique — lecture factures (JSON). Auth: Bearer sk_... scope invoices:read */
export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const key = await verifyApiKeyFromRequest(request);
  if (!key || !apiKeyHasScope(key.scopes, "invoices:read")) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const rows = await getAccountingExportRows({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      clientId: searchParams.get("clientId") ?? undefined,
    });
    return NextResponse.json({ invoices: rows.filter((r) => r.type === "invoice"), count: rows.length });
  } catch (error) {
    console.error("[api/v1/invoices] GET", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
