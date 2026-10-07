import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getHostingCatalogSyncedAt, listHostingCatalog } from "@/lib/hostinger-catalog";

export async function GET() {
  const authError = await crmApiAuth.site.read();
  if (authError) return authError;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  const [entries, syncedAt] = await Promise.all([listHostingCatalog(), getHostingCatalogSyncedAt()]);
  return NextResponse.json({ entries, syncedAt, apiConfigured: Boolean(process.env.HOSTINGER_API_TOKEN?.trim()) });
}
