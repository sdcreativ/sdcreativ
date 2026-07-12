import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { importServiceCatalogFromQuoteConfig } from "@/lib/service-catalog";

export async function POST() {
  const authError = await crmApiAuth.quotes.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  try {
    const imported = await importServiceCatalogFromQuoteConfig();
    return NextResponse.json({ imported });
  } catch (error) {
    console.error("[api/admin/service-catalog/import-config] POST", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
