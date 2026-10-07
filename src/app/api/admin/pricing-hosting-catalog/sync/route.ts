import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { runHostingCatalogSync } from "@/lib/hostinger-catalog-sync";

/** Synchro manuelle depuis l'admin : nouveaux prix en attente, rien n'est publié ici. */
export async function POST() {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  try {
    const result = await runHostingCatalogSync();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/admin/pricing-hosting-catalog/sync]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Synchronisation impossible." }, { status: 502 });
  }
}
