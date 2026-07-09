import { crmApiAuth } from "@/lib/crm-api-auth";
import { NextResponse } from "next/server";
import { resetSiteQuoteConfigSettings } from "@/lib/site-quote-config-settings";
import { isDatabaseConfigured } from "@/lib/db";
import { revalidateDevisPages } from "@/lib/site-revalidate";

export async function POST() {
  const authError = await crmApiAuth.site.write();
  if (authError) return authError;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de données non configurée." }, { status: 503 });
  }

  const config = await resetSiteQuoteConfigSettings();
  revalidateDevisPages();
  return NextResponse.json({ config });
}
